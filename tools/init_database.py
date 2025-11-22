#!/usr/bin/env python3
"""
==============================================================================
Init Database - Initialisation de la base de données LLMUI Core
==============================================================================
Crée la base SQLite avec le bon schéma et un utilisateur admin
==============================================================================
"""

import sqlite3
import hashlib
import uuid
import sys
import os
from datetime import datetime
import getpass

DB_PATH = "/var/lib/llmui/llmui.db"

def create_database_schema(conn):
    """Crée le schéma de la base de données"""
    cursor = conn.cursor()
    
    # Table users
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            password_hash TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')
    
    # Table conversations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    # Table messages
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            model TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
        )
    ''')
    
    # Table stats
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model TEXT NOT NULL,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            duration_ms INTEGER DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            success INTEGER DEFAULT 1
        )
    ''')
    
    # Table sessions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    print("✓ Schéma de base de données créé")

def create_admin_user(conn, username, password):
    """Crée un utilisateur administrateur"""
    cursor = conn.cursor()
    
    # Vérifier si l'utilisateur existe déjà
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    existing_user = cursor.fetchone()
    
    if existing_user:
        # Mettre à jour le mot de passe
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        cursor.execute(
            "UPDATE users SET password_hash = ?, is_admin = 1 WHERE username = ?",
            (password_hash, username)
        )
        print(f"✓ Mot de passe mis à jour pour l'utilisateur '{username}'")
    else:
        # Créer un nouvel utilisateur
        user_id = str(uuid.uuid4())
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        cursor.execute(
            "INSERT INTO users (id, username, password_hash, is_admin, created_at) VALUES (?, ?, ?, 1, ?)",
            (user_id, username, password_hash, datetime.now().isoformat())
        )
        print(f"✓ Utilisateur administrateur '{username}' créé")
    
    conn.commit()
    
    # Afficher le hash pour vérification
    print(f"\nInformations de connexion:")
    print(f"  Username: {username}")
    print(f"  Password: {password}")
    print(f"  Password Hash (SHA256): {hashlib.sha256(password.encode()).hexdigest()}")

def main():
    print("=== Initialisation de la base de données LLMUI Core ===\n")
    
    # Vérifier les permissions
    if os.geteuid() != 0:
        print("⚠️  Attention: Ce script doit être exécuté en tant que root (sudo)")
        print("   pour créer la base dans /var/lib/llmui/")
    
    # Créer le répertoire si nécessaire
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
        print(f"✓ Répertoire créé: {db_dir}")
    
    # Demander les informations de l'admin
    if len(sys.argv) >= 3:
        username = sys.argv[1]
        password = sys.argv[2]
    else:
        username = input("Nom d'utilisateur admin [admin]: ").strip() or "admin"
        
        while True:
            password = getpass.getpass("Mot de passe admin: ")
            if len(password) < 4:
                print("❌ Le mot de passe doit contenir au moins 4 caractères")
                continue
            
            password_confirm = getpass.getpass("Confirmez le mot de passe: ")
            if password == password_confirm:
                break
            else:
                print("❌ Les mots de passe ne correspondent pas")
    
    # Créer/ouvrir la base de données
    try:
        conn = sqlite3.connect(DB_PATH)
        print(f"✓ Base de données: {DB_PATH}")
        
        # Créer le schéma
        create_database_schema(conn)
        
        # Créer l'utilisateur admin
        create_admin_user(conn, username, password)
        
        # Vérifier
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users WHERE is_admin = 1")
        admin_count = cursor.fetchone()[0]
        print(f"\n✓ Base de données initialisée avec {admin_count} administrateur(s)")
        
        conn.close()
        
        # Définir les permissions
        if os.geteuid() == 0:
            os.system(f"chown llmui:llmui {DB_PATH}")
            os.system(f"chmod 660 {DB_PATH}")
            print(f"✓ Permissions définies (llmui:llmui, 660)")
        
        print("\n=== Initialisation terminée ===")
        print(f"\nVous pouvez maintenant vous connecter avec:")
        print(f"  Username: {username}")
        print(f"  Password: {password}")
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
