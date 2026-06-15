# -*- coding: utf-8 -*-
# Copyright © Technologies Nexios TF Inc. — nexiostf.com
"""Primitives de sécurité — LLMUI Core.

- Hachage des mots de passe : Argon2 (passlib)
- TOTP (admins) : pyotp
- Chiffrement des secrets TOTP au repos : Fernet (cryptography)
- Limitation du débit de connexion : Redis
"""

import base64
import io
import logging
import secrets as _secrets
from typing import List, Optional

import pyotp
import redis.asyncio as redis_asyncio
from cryptography.fernet import Fernet, InvalidToken
from passlib.context import CryptContext

logger = logging.getLogger("llmui.security")

# ============================================================================
# MOTS DE PASSE — Argon2 (STANDARDS.md : obligatoire, jamais bcrypt/SHA/MD5)
# ============================================================================

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Hash de référence utilisé pour les vérifications « factices » afin que le
# temps de réponse de /api/auth/login soit identique, que l'utilisateur
# existe ou non (mitigation de l'énumération de comptes — H-07).
_DUMMY_HASH = pwd_context.hash("a-dummy-password-used-for-timing-safety")


def hash_password(password: str) -> str:
    """Calcule le hash Argon2 d'un mot de passe."""
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Vérifie un mot de passe contre son hash Argon2."""
    try:
        return pwd_context.verify(password, password_hash)
    except Exception:
        return False


def verify_password_or_dummy(password: str, password_hash: Optional[str]) -> bool:
    """Vérifie le mot de passe, ou exécute une vérification factice si
    `password_hash` est `None` (utilisateur introuvable), afin de conserver
    un temps de réponse constant (H-07 — anti énumération de comptes)."""
    if password_hash is None:
        pwd_context.verify(password, _DUMMY_HASH)
        return False
    return verify_password(password, password_hash)


def needs_rehash(password_hash: str) -> bool:
    return pwd_context.needs_update(password_hash)


# ============================================================================
# SECRETS APPLICATIFS (générés une fois, persistés dans system_config)
# ============================================================================


def generate_session_secret() -> str:
    """Génère une nouvelle clé de signature de session (H-01)."""
    return _secrets.token_hex(32)


def generate_fernet_key() -> str:
    """Génère une nouvelle clé de chiffrement Fernet (32 octets, base64)."""
    return Fernet.generate_key().decode("utf-8")


def encrypt_secret(plaintext: str, fernet_key: str) -> str:
    """Chiffre une chaîne (ex. secret TOTP) avec Fernet."""
    f = Fernet(fernet_key.encode("utf-8"))
    return f.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_secret(token: str, fernet_key: str) -> str:
    """Déchiffre une chaîne précédemment chiffrée avec `encrypt_secret`."""
    f = Fernet(fernet_key.encode("utf-8"))
    try:
        return f.decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Jeton de chiffrement invalide ou clé incorrecte") from exc


# ============================================================================
# TOTP — STANDARDS.md §6 (obligatoire pour les comptes admin)
# ============================================================================


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def get_totp_uri(secret: str, account_name: str, issuer: str = "LLMUI Core") -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(name=account_name, issuer_name=issuer)


def generate_totp_qr_data_uri(otpauth_uri: str) -> Optional[str]:
    """Encode l'URI `otpauth://` dans un QR code (SVG) renvoyé sous forme de
    data URI base64, prêt à l'emploi dans une balise `<img src=...>`.

    Renvoie `None` si la bibliothèque `qrcode` est absente : l'appelant retombe
    alors sur la saisie manuelle de la clé (dégradation gracieuse). Le format SVG
    évite toute dépendance à Pillow."""
    try:
        import qrcode
        import qrcode.image.svg
    except Exception:
        logger.warning("Bibliothèque 'qrcode' absente — QR code TOTP non généré")
        return None

    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(otpauth_uri)
    qr.make(fit=True)
    img = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage)

    buf = io.BytesIO()
    img.save(buf)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def verify_totp_code(secret: str, code: str) -> bool:
    """Vérifie un code TOTP à 6 chiffres (fenêtre de tolérance ±30s).

    Le code est nettoyé des espaces : certaines applications d'authentification
    affichent « 123 456 » et l'utilisateur en recopie l'espace, ce qui faisait
    auparavant échouer la vérification (`isdigit()` → False)."""
    if not code:
        return False
    code = code.replace(" ", "").strip()
    if not code.isdigit():
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def generate_recovery_codes(count: int = 8) -> List[str]:
    """Génère des codes de récupération à usage unique (format XXXX-XXXX)."""
    codes = []
    for _ in range(count):
        raw = _secrets.token_hex(4).upper()
        codes.append(f"{raw[:4]}-{raw[4:]}")
    return codes


def hash_recovery_code(code: str) -> str:
    return pwd_context.hash(code.strip().upper())


def verify_recovery_code(code: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(code.strip().upper(), hashed)
    except Exception:
        return False


# ============================================================================
# LIMITATION DU DÉBIT DE CONNEXION (Redis) — H-04
# ============================================================================


class LoginRateLimiter:
    """Bloque temporairement les tentatives de connexion répétées
    (par identifiant + adresse IP)."""

    def __init__(self, redis_url: str, max_attempts: int = 5, lockout_minutes: int = 15):
        self._redis_url = redis_url
        self.max_attempts = max_attempts
        self._lockout_seconds = lockout_minutes * 60
        self._client: Optional[redis_asyncio.Redis] = None

    def _get_client(self) -> redis_asyncio.Redis:
        if self._client is None:
            self._client = redis_asyncio.from_url(self._redis_url, decode_responses=True)
        return self._client

    @staticmethod
    def _key(identifier: str, ip: str) -> str:
        return f"llmui:login_attempts:{identifier}:{ip}"

    async def is_locked(self, identifier: str, ip: str) -> bool:
        """Retourne True si le quota de tentatives est dépassé.
        Fail-open (False) si Redis est indisponible : la connexion reste
        possible mais sans protection anti force-brute temporaire."""
        try:
            client = self._get_client()
            attempts = await client.get(self._key(identifier, ip))
            return attempts is not None and int(attempts) >= self.max_attempts
        except Exception as exc:
            logger.warning("Rate limiter Redis indisponible (fail-open) : %s", exc)
            return False

    async def register_failure(self, identifier: str, ip: str) -> None:
        try:
            client = self._get_client()
            key = self._key(identifier, ip)
            attempts = await client.incr(key)
            if attempts == 1:
                await client.expire(key, self._lockout_seconds)
        except Exception as exc:
            logger.warning("Rate limiter Redis indisponible : %s", exc)

    async def reset(self, identifier: str, ip: str) -> None:
        try:
            client = self._get_client()
            await client.delete(self._key(identifier, ip))
        except Exception as exc:
            logger.warning("Rate limiter Redis indisponible : %s", exc)
