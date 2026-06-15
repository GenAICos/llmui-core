#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Copyright © Technologies Nexios TF Inc. — nexiostf.com
"""Réinitialise l'enrôlement TOTP d'un compte LLMUI Core.

Supprime la configuration TOTP (secret chiffré + codes de récupération) d'un
utilisateur identifié par son courriel. À sa prochaine connexion, l'utilisateur
sera invité à reconfigurer le TOTP depuis zéro (nouveau QR code à scanner).

Cas d'usage :
  - secret TOTP devenu indéchiffrable (clé de chiffrement perdue/modifiée) ;
  - perte de l'application d'authentification (sans codes de récupération) ;
  - débloquer un administrateur sans accès à l'interface web.

Usage :
    python3 scripts/reset_totp.py [courriel]

DATABASE_URL est lu depuis l'environnement, ou à défaut depuis le fichier .env
de déploiement (/opt/llmui-core/.env) ou celui du dépôt.
"""

import asyncio
import os
import sys
from typing import Optional


def _ensure_database_url() -> None:
    """Garantit que DATABASE_URL est défini AVANT l'import de db_models (qui le
    lit au moment de l'import). Si absent de l'environnement, on le récupère
    dans le .env de déploiement puis dans celui du dépôt."""
    if os.getenv("DATABASE_URL"):
        return
    candidates = (
        "/opt/llmui-core/.env",
        os.path.join(os.path.dirname(__file__), "..", ".env"),
    )
    for env_path in candidates:
        try:
            with open(env_path, encoding="utf-8") as handle:
                for raw in handle:
                    line = raw.strip()
                    if line.startswith("DATABASE_URL="):
                        os.environ["DATABASE_URL"] = line.split("=", 1)[1].strip()
                        return
        except OSError:
            continue


_ensure_database_url()
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from sqlalchemy import delete, func, select  # noqa: E402

from db_models import User, UserTOTP, async_session_factory, engine  # noqa: E402


def _prompt_email() -> str:
    while True:
        email = input("Courriel du compte à réinitialiser : ").strip().lower()
        if "@" in email and "." in email.rsplit("@", 1)[-1]:
            return email
        print("Adresse courriel invalide.")


async def reset_totp(email: str) -> Optional[bool]:
    """Supprime la configuration TOTP de l'utilisateur.

    Retourne `None` si le compte est introuvable, `True` si une configuration a
    été supprimée, `False` si le compte n'avait pas de TOTP."""
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(func.lower(User.email) == email))
        user = result.scalar_one_or_none()
        if user is None:
            return None

        deleted = await session.execute(delete(UserTOTP).where(UserTOTP.user_id == user.id))
        await session.commit()
        return (deleted.rowcount or 0) > 0


async def main() -> None:
    print("=== Réinitialisation TOTP — LLMUI Core ===\n")
    email = sys.argv[1].strip().lower() if len(sys.argv) > 1 else _prompt_email()

    try:
        outcome = await reset_totp(email)
    finally:
        await engine.dispose()

    if outcome is None:
        print(f"\n✗ Aucun compte trouvé pour {email}.")
        sys.exit(1)
    if outcome:
        print(f"\n✓ Configuration TOTP supprimée pour {email}.")
    else:
        print(f"\nℹ Aucune configuration TOTP à supprimer pour {email}.")

    print(
        "\nÀ la prochaine connexion, la configuration TOTP (scan du QR code) "
        "sera redemandée automatiquement."
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nAnnulé.")
        sys.exit(1)
