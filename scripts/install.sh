#!/usr/bin/env bash
#
# install.sh - Installation script for LLMUI Core v0.5.0
# Author: François Chalut
# CORRIGÉ v0.5.0: Schéma unifié avec andy_installer.py et llmui_backend.py
#                  id INTEGER PRIMARY KEY AUTOINCREMENT au lieu de id TEXT
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
INSTALL_DIR="/opt/llmui-core"
DATA_DIR="/var/lib/llmui"
LOG_DIR="/var/log/llmui"
USER="llmui"
GROUP="llmui"

# Logging functions
log_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Initialize database with admin user
initialize_database() {
    log_step "Initialisation de la base de données..."
    
    # Create Python script for database initialization
    cat > /tmp/init_db.py << 'EOFPYTHON'
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script d'initialisation de la base de données LLMUI
CORRIGÉ v0.5.0: Schéma INTEGER unifié avec andy_installer.py et llmui_backend.py
"""
import sqlite3
import hashlib
import sys
import getpass
from datetime import datetime

DB_PATH = "/var/lib/llmui/llmui.db"

def create_schema(conn):
    """Crée le schéma de la base - SCHÉMA CORRIGÉ v0.5.0"""
    cursor = conn.cursor()
    
    # CORRIGÉ v0.5.0: Table users avec id INTEGER PRIMARY KEY AUTOINCREMENT
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT,
            is_admin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            last_login TEXT
        )
    ''')
    
    # Table conversations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            prompt TEXT NOT NULL,
            response TEXT NOT NULL,
            model TEXT,
            worker_models TEXT,
            merger_model TEXT,
            processing_time REAL,
            timestamp TEXT NOT NULL,
            mode TEXT DEFAULT 'simple'
        )
    ''')
    
    # Table messages (for context)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    ''')
    
    # Table embeddings
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            message_id INTEGER NOT NULL,
            embedding BLOB NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (message_id) REFERENCES messages(id)
        )
    ''')
    
    # Table stats
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            mode TEXT NOT NULL,
            processing_time REAL NOT NULL,
            success INTEGER NOT NULL,
            error TEXT,
            timeout_level TEXT
        )
    ''')
    
    # Table sessions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER,
            created_at TEXT,
            last_activity TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Table settings
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()

def create_admin_user(conn, username, password):
    """Crée l'utilisateur administrateur"""
    cursor = conn.cursor()
    
    # Vérifier si l'utilisateur existe déjà
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    existing_user = cursor.fetchone()
    
    if existing_user:
        # Mettre à jour le mot de passe
        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
        cursor.execute(
            "UPDATE users SET password_hash = ?, is_admin = 1 WHERE username = ?",
            (password_hash, username)
        )
        print(f"✓ Mot de passe mis à jour pour '{username}'")
    else:
        # CORRIGÉ v0.5.0: Plus besoin de générer UUID, l'ID est auto-incrémenté
        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
        
        cursor.execute(
            "INSERT INTO users (username, password_hash, email, is_admin, created_at) VALUES (?, ?, ?, 1, ?)",
            (username, password_hash, None, datetime.now().isoformat())
        )
        print(f"✓ Utilisateur admin '{username}' créé (ID: {cursor.lastrowid})")
    
    conn.commit()
    
    return password_hash

if __name__ == "__main__":
    try:
        # Saisie des informations
        print("\n=== Configuration utilisateur administrateur ===\n")
        username = input("Nom d'utilisateur [admin]: ").strip() or "admin"
        
        while True:
            password = getpass.getpass("Mot de passe (min 8 caractères): ")
            if len(password) < 8:
                print("❌ Le mot de passe doit contenir au moins 8 caractères")
                continue
            
            password_confirm = getpass.getpass("Confirmez le mot de passe: ")
            if password == password_confirm:
                break
            else:
                print("❌ Les mots de passe ne correspondent pas")
        
        # Créer/ouvrir la base
        conn = sqlite3.connect(DB_PATH)
        
        # Créer le schéma
        create_schema(conn)
        print("✓ Schéma de base de données créé (INTEGER AUTO_INCREMENT)")
        
        # Créer l'utilisateur
        password_hash = create_admin_user(conn, username, password)
        
        conn.close()
        
        # Afficher les informations
        print(f"\n{'='*60}")
        print("✓ Base de données initialisée avec succès")
        print(f"{'='*60}")
        print(f"\nInformations de connexion:")
        print(f"  Username: {username}")
        print(f"  Password: {password}")
        print(f"  Hash SHA256: {password_hash[:50]}...")
        print(f"\n⚠️  NOTEZ CES INFORMATIONS - Vous en aurez besoin pour vous connecter")
        print(f"{'='*60}\n")
        
        sys.exit(0)
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
EOFPYTHON
    
    chmod +x /tmp/init_db.py
    
    # Exécuter le script Python
    python3 /tmp/init_db.py
    
    if [[ $? -eq 0 ]]; then
        log_success "Base de données initialisée"
    else
        log_error "Échec initialisation base de données"
        return 1
    fi
}

# Main installation
main() {
    echo "================================================================="
    echo "  LLMUI Core v0.5.0 - Installation"
    echo "  CORRIGÉ: Schéma de base de données unifié (INTEGER)"
    echo "================================================================="
    echo ""
    
    # Check root
    if [[ $EUID -ne 0 ]]; then
        log_error "Ce script doit être exécuté en tant que root"
        exit 1
    fi
    
    # Create directories
    log_step "Création des répertoires..."
    mkdir -p "$DATA_DIR" "$LOG_DIR"
    
    # Create user if not exists
    if ! id -u "$USER" &>/dev/null; then
        useradd -r -s /bin/false "$USER"
        log_success "Utilisateur $USER créé"
    fi
    
    # Initialize database
    initialize_database
    
    # Set permissions
    log_step "Configuration des permissions..."
    chown -R "$USER:$GROUP" "$DATA_DIR" "$LOG_DIR"
    chmod 755 "$DATA_DIR" "$LOG_DIR"
    chmod 644 "$DATA_DIR/llmui.db"
    
    log_success "Installation terminée!"
    echo ""
    echo "Base de données: $DATA_DIR/llmui.db"
    echo "Logs: $LOG_DIR"
    echo ""
    echo "⚠️  IMPORTANT: Notez vos identifiants de connexion affichés ci-dessus"
    echo ""
}

main "$@"
