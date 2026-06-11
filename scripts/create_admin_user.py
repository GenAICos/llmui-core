#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Copyright © Technologies Nexios TF Inc. — nexiostf.com
# Tous droits réservés
"""
Création / réinitialisation du compte administrateur LLMUI
===========================================================
Crée le compte admin dans la base SQLite (même schéma et même hashage
que src/llmui_backend.py). Si l'utilisateur existe déjà, son mot de
passe est réinitialisé.

Hashage : Argon2 (standard Nexios TF — STANDARDS.md §3), PBKDF2 en
dernier recours si argon2-cffi n'est pas installé.

Usage interactif :
    python scripts/create_admin_user.py [--db /chemin/llmui.db]

Usage non interactif (mot de passe via variable d'environnement,
jamais en argument — il serait visible dans `ps`) :
    LLMUI_ADMIN_PASSWORD='...' python scripts/create_admin_user.py \\
        --username admin --email admin@example.com

Le chemin de la base est résolu dans cet ordre :
    1. --db
    2. variable d'environnement LLMUI_DB_PATH
    3. /var/lib/llmui/llmui.db (défaut du backend)
"""

import argparse
import binascii
import getpass
import hashlib
import os
import re
import sqlite3
import sys
from datetime import datetime
from typing import Optional, Tuple

PASSWORD_MIN_LENGTH = 12  # Standard Nexios TF (STANDARDS.md §5)


def hash_password_secure(password: str) -> str:
    """
    Hash sécurisé du mot de passe avec Argon2 (standard Nexios TF).

    Args:
        password: Mot de passe en clair à hasher.

    Returns:
        str: Hash Argon2 (PBKDF2 avec salt en dernier recours si
        argon2-cffi n'est pas installé).
    """
    try:
        from argon2 import PasswordHasher
        return PasswordHasher().hash(password)
    except ImportError:
        print("[WARNING] argon2-cffi non disponible, utilisation de PBKDF2 avec salt")
        salt = os.urandom(32)
        key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
        return binascii.hexlify(salt + key).decode()


def is_strong_password(password: str) -> Tuple[bool, str]:
    """
    Vérifie la complexité du mot de passe selon le standard Nexios TF.

    Args:
        password: Mot de passe en clair à valider.

    Returns:
        Tuple[bool, str]: (True, message) si valide, sinon (False, raison).
    """
    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f"Le mot de passe doit contenir au moins {PASSWORD_MIN_LENGTH} caractères"

    checks = [
        (r'[A-Z]', "au moins une majuscule"),
        (r'[a-z]', "au moins une minuscule"),
        (r'[0-9]', "au moins un chiffre"),
        (r'[^A-Za-z0-9]', "au moins un caractère spécial"),
    ]
    for pattern, message in checks:
        if not re.search(pattern, password):
            return False, f"Le mot de passe doit contenir {message}"

    return True, "Mot de passe valide"


def prompt_password() -> str:
    """
    Demande le mot de passe interactivement (saisie masquée, confirmée).

    Returns:
        str: Le mot de passe validé.
    """
    while True:
        password = getpass.getpass("Mot de passe pour l'interface web: ")
        if not password:
            print("❌ Le mot de passe ne peut pas être vide")
            continue

        is_strong, message = is_strong_password(password)
        if not is_strong:
            print(f"❌ {message}")
            continue

        password_confirm = getpass.getpass("Confirmez le mot de passe: ")
        if password == password_confirm:
            return password
        print("❌ Les mots de passe ne correspondent pas")


def resolve_credentials(args: argparse.Namespace) -> Tuple[str, str, str]:
    """
    Résout les identifiants depuis les arguments/environnement ou les prompts.

    Args:
        args: Arguments parsés (username, email éventuels). Le mot de
            passe non interactif vient de LLMUI_ADMIN_PASSWORD.

    Returns:
        Tuple[str, str, str]: (username, email, password).

    Raises:
        ValueError: Si le mot de passe fourni via l'environnement ne
            respecte pas les règles de complexité.
    """
    username: str = args.username or \
        input("Nom d'utilisateur pour l'interface web [admin]: ").strip() or "admin"
    email: str = args.email or \
        input("Email (optionnel) [admin@llmui.org]: ").strip() or "admin@llmui.org"

    env_password: Optional[str] = os.environ.get("LLMUI_ADMIN_PASSWORD")
    if env_password is not None:
        is_strong, message = is_strong_password(env_password)
        if not is_strong:
            raise ValueError(message)
        return username, email, env_password

    return username, email, prompt_password()


def upsert_admin(db_path: str, username: str, email: str, password_hash: str) -> bool:
    """
    Crée l'utilisateur admin, ou réinitialise son mot de passe s'il existe.

    Args:
        db_path: Chemin de la base SQLite.
        username: Nom d'utilisateur du compte admin.
        email: Adresse email du compte.
        password_hash: Hash du mot de passe (Argon2).

    Returns:
        bool: True si l'opération a réussi.
    """
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()
        # Même schéma que init_database() de llmui_backend.py
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT,
                is_admin INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_login TEXT
            )
        ''')

        cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute(
                'UPDATE users SET password_hash = ?, email = ?, is_admin = 1 WHERE username = ?',
                (password_hash, email, username)
            )
            action = "mis à jour (mot de passe réinitialisé)"
        else:
            cursor.execute(
                'INSERT INTO users (username, password_hash, email, is_admin, created_at) VALUES (?, ?, ?, 1, ?)',
                (username, password_hash, email, datetime.now().isoformat())
            )
            action = "créé"

        conn.commit()
        print(f"✅ Utilisateur admin '{username}' {action} dans {db_path}")
        return True
    finally:
        conn.close()


def main() -> int:
    """
    Point d'entrée du script.

    Returns:
        int: Code de sortie (0 = succès, 1 = erreur).
    """
    parser = argparse.ArgumentParser(
        description="Crée ou réinitialise le compte administrateur LLMUI"
    )
    parser.add_argument(
        '--db',
        default=os.getenv("LLMUI_DB_PATH", "/var/lib/llmui/llmui.db"),
        help="Chemin de la base SQLite (défaut: $LLMUI_DB_PATH ou /var/lib/llmui/llmui.db)"
    )
    parser.add_argument(
        '--username',
        help="Nom d'utilisateur (mode non interactif, avec $LLMUI_ADMIN_PASSWORD)"
    )
    parser.add_argument(
        '--email',
        help="Email du compte (mode non interactif)"
    )
    args = parser.parse_args()

    print("")
    print("👤 Configuration du compte administrateur")
    print(f"   Base de données : {args.db}")
    print("")

    try:
        username, email, password = resolve_credentials(args)
        password_hash = hash_password_secure(password)
        if not upsert_admin(args.db, username, email, password_hash):
            return 1
        print("")
        print(f"🔐 Connectez-vous à l'interface web avec : {username} / <votre mot de passe>")
        return 0
    except KeyboardInterrupt:
        print("\n❌ Annulé par l'utilisateur")
        return 1
    except ValueError as e:
        print(f"❌ Mot de passe invalide : {e}")
        return 1
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
