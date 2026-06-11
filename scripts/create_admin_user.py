#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Création / réinitialisation du compte administrateur LLMUI
===========================================================
Crée le compte admin dans la base SQLite (même schéma et même hashage
que src/llmui_backend.py). Si l'utilisateur existe déjà, son mot de
passe est réinitialisé.

Usage:
    python scripts/create_admin_user.py [--db /chemin/llmui.db]

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


def hash_password_secure(password: str) -> str:
    """Hash bcrypt (ou PBKDF2 en fallback) — identique à llmui_backend.py"""
    try:
        import bcrypt
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode(), salt).decode()
    except ImportError:
        print("[WARNING] bcrypt non disponible, utilisation de PBKDF2 avec salt")
        salt = os.urandom(32)
        key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
        return binascii.hexlify(salt + key).decode()


def is_strong_password(password: str):
    """Vérifie la complexité du mot de passe — mêmes règles qu'andy_installer.py"""
    if len(password) < 8:
        return False, "Le mot de passe doit contenir au moins 8 caractères"

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


def prompt_credentials():
    """Demande interactivement le nom d'utilisateur et le mot de passe"""
    username = input("Nom d'utilisateur pour l'interface web [admin]: ").strip() or "admin"
    email = input("Email (optionnel) [admin@llmui.org]: ").strip() or "admin@llmui.org"

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
            return username, email, password
        print("❌ Les mots de passe ne correspondent pas")


def upsert_admin(db_path: str, username: str, email: str, password_hash: str) -> bool:
    """Crée l'utilisateur admin, ou réinitialise son mot de passe s'il existe"""
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


def main():
    parser = argparse.ArgumentParser(
        description="Crée ou réinitialise le compte administrateur LLMUI"
    )
    parser.add_argument(
        '--db',
        default=os.getenv("LLMUI_DB_PATH", "/var/lib/llmui/llmui.db"),
        help="Chemin de la base SQLite (défaut: $LLMUI_DB_PATH ou /var/lib/llmui/llmui.db)"
    )
    args = parser.parse_args()

    print("")
    print("👤 Configuration du compte administrateur")
    print(f"   Base de données : {args.db}")
    print("")

    try:
        username, email, password = prompt_credentials()
        password_hash = hash_password_secure(password)
        if not upsert_admin(args.db, username, email, password_hash):
            return 1
        print("")
        print(f"🔐 Connectez-vous à l'interface web avec : {username} / <votre mot de passe>")
        return 0
    except KeyboardInterrupt:
        print("\n❌ Annulé par l'utilisateur")
        return 1
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
