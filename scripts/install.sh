#!/bin/bash
# ==============================================================================
# LLMUI Core - Installation Script v0.5.0 - CORRIGÉ
# ==============================================================================
# Installation automatisée de LLMUI Core avec authentification
# Base de données SYNCHRONISÉE avec llmui_backend.py
# ==============================================================================

set -e

# ============================================================================
# VARIABLES GLOBALES
# ============================================================================

INSTALL_DIR="/opt/llmui-core"
DATA_DIR="/var/lib/llmui"
LOG_DIR="/var/log/llmui"
SERVICE_USER="llmui"
SERVICE_GROUP="llmui"
DB_PATH="$DATA_DIR/llmui.db"

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

log_info() {
    echo -e "\e[34m[INFO]\e[0m $1"
}

log_success() {
    echo -e "\e[32m[✓]\e[0m $1"
}

log_error() {
    echo -e "\e[31m[✗]\e[0m $1"
}

log_warning() {
    echo -e "\e[33m[⚠]\e[0m $1"
}

log_step() {
    echo ""
    echo -e "\e[1;36m==== $1 ====\e[0m"
    echo ""
}

# ============================================================================
# VÉRIFICATION ROOT
# ============================================================================

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Ce script doit être exécuté en tant que root"
        echo "Utilisez: sudo $0"
        exit 1
    fi
    log_success "Privilèges root confirmés"
}

# ============================================================================
# VÉRIFICATION PRÉREQUIS
# ============================================================================

check_prerequisites() {
    log_step "Vérification des prérequis"
    
    # Check Python 3
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 n'est pas installé"
        exit 1
    fi
    log_success "Python 3 détecté: $(python3 --version)"
    
    # Check pip
    if ! python3 -m pip --version &> /dev/null; then
        log_error "pip n'est pas disponible"
        exit 1
    fi
    log_success "pip est disponible"
    
    # Check Ollama
    if ! command -v ollama &> /dev/null; then
        log_warning "Ollama n'est pas installé - requis pour l'IA"
    else
        log_success "Ollama détecté"
    fi
}

# ============================================================================
# CRÉATION SERVICE USER
# ============================================================================

create_service_user() {
    log_step "Création de l'utilisateur système"
    
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd -r -s /bin/bash -d "$INSTALL_DIR" -m "$SERVICE_USER"
        log_success "Utilisateur $SERVICE_USER créé"
    else
        log_info "Utilisateur $SERVICE_USER existe déjà"
    fi
}

# ============================================================================
# CRÉATION STRUCTURE RÉPERTOIRES
# ============================================================================

create_directories() {
    log_step "Création de la structure des répertoires"
    
    # Create main directories
    mkdir -p "$INSTALL_DIR"/{src,web,scripts,ssl,docs}
    mkdir -p "$DATA_DIR"
    mkdir -p "$LOG_DIR"
    
    # Set permissions
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR"
    chmod -R 755 "$INSTALL_DIR"
    chmod -R 700 "$DATA_DIR"
    
    log_success "Structure des répertoires créée"
}

# ============================================================================
# COPIE FICHIERS
# ============================================================================

copy_files() {
    log_step "Copie des fichiers de l'application"
    
    # Copy source files
    if [[ -d "src" ]]; then
        cp -r src "$INSTALL_DIR/"
        chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/src"
        log_success "Fichiers source copiés"
    fi
    
    # Copy web files
    if [[ -d "web" ]]; then
        cp -r web "$INSTALL_DIR/"
        chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/web"
        log_success "Fichiers web copiés"
    fi
    
    # Copy configuration
    if [[ -f "config.yaml" ]]; then
        cp config.yaml "$INSTALL_DIR/"
        chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/config.yaml"
        chmod 600 "$INSTALL_DIR/config.yaml"
        log_success "Configuration copiée"
    elif [[ -f "config.yaml.example" ]]; then
        cp config.yaml.example "$INSTALL_DIR/config.yaml"
        chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/config.yaml"
        chmod 600 "$INSTALL_DIR/config.yaml"
        log_success "Configuration créée depuis l'exemple"
    fi
    
    # Make Python scripts executable
    if [[ -d "$INSTALL_DIR/src" ]]; then
        chmod +x "$INSTALL_DIR/src"/*.py 2>/dev/null || true
    fi
    
    log_success "Fichiers copiés"
}

# ============================================================================
# INSTALLATION PACKAGES PYTHON
# ============================================================================

install_python_packages() {
    log_step "Installation packages Python dans l'environnement virtuel"
    
    # Create virtual environment as service user
    if [[ ! -d "$INSTALL_DIR/venv" ]]; then
        su - "$SERVICE_USER" -c "cd $INSTALL_DIR && python3 -m venv venv"
        log_success "Environnement virtuel créé"
    else
        log_info "Environnement virtuel existe déjà"
    fi
    
    # Upgrade pip in venv
    su - "$SERVICE_USER" -c "$INSTALL_DIR/venv/bin/pip install --upgrade pip setuptools wheel"
    
    # Install packages from requirements.txt or install essentials
    if [[ -f "$INSTALL_DIR/requirements.txt" ]]; then
        log_info "Installation depuis requirements.txt..."
        su - "$SERVICE_USER" -c "$INSTALL_DIR/venv/bin/pip install -r $INSTALL_DIR/requirements.txt"
    else
        log_info "Installation des packages essentiels..."
        su - "$SERVICE_USER" -c "$INSTALL_DIR/venv/bin/pip install \
            fastapi==0.121.0 \
            uvicorn[standard]==0.38.0 \
            httpx==0.28.1 \
            pyyaml==6.0.1 \
            python-multipart==0.0.6 \
            pytz==2025.2 \
            pydantic==2.12.3 \
            bcrypt==4.1.2"
    fi
    
    log_success "Packages Python installés dans le venv"
}

# ============================================================================
# INITIALISATION BASE DE DONNÉES
# ============================================================================

initialize_database() {
    log_step "Initialisation de la base de données"
    
    # Create Python script for database initialization
    cat > /tmp/init_db.py << 'EOFPYTHON'
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script d'initialisation de la base de données - v0.5.0 CORRIGÉ
SCHÉMA SYNCHRONISÉ avec llmui_backend.py et andy_installer.py
"""
import sqlite3
import hashlib
import os
import binascii
import sys
import getpass
from datetime import datetime

DB_PATH = "/var/lib/llmui/llmui.db"

def hash_password_secure(password):
    """
    Hash sécurisé du mot de passe avec bcrypt (ou PBKDF2 en fallback)
    IDENTIQUE à la fonction dans andy_installer.py et llmui_backend.py
    """
    try:
        import bcrypt
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode(), salt).decode()
    except ImportError:
        print("⚠️ bcrypt non disponible, utilisation de PBKDF2 avec salt")
        # Fallback sécurisé si bcrypt n'est pas disponible
        salt = os.urandom(32)
        key = hashlib.pbkdf2_hmac(
            'sha256', 
            password.encode(), 
            salt, 
            100000  # 100,000 itérations
        )
        return binascii.hexlify(salt + key).decode()


def create_schema(conn):
    """
    Crée le schéma de la base - SYNCHRONISÉ avec llmui_backend.py
    """
    cursor = conn.cursor()
    
    # ========================================================================
    # TABLE USERS - pour l'authentification
    # ========================================================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            email TEXT,
            is_admin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            last_login TEXT
        )
    ''')
    
    # ========================================================================
    # TABLE CONVERSATIONS - stockage conversations LLM
    # SCHÉMA EXACT de llmui_backend.py DatabaseManager.init_database()
    # ========================================================================
    cursor.execute("""
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
    """)
    
    # ========================================================================
    # TABLE MESSAGES - contexte conversationnel
    # SCHÉMA EXACT de llmui_backend.py
    # ========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    
    # ========================================================================
    # TABLE EMBEDDINGS - recherche sémantique
    # SCHÉMA EXACT de llmui_backend.py
    # ========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            message_id INTEGER NOT NULL,
            embedding BLOB NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (message_id) REFERENCES messages(id)
        )
    """)
    
    # ========================================================================
    # TABLE STATS - statistiques d'utilisation
    # ========================================================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model TEXT NOT NULL,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            duration_ms INTEGER DEFAULT 0,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            success INTEGER DEFAULT 1
        )
    ''')
    
    # ========================================================================
    # TABLE SESSIONS - gestion sessions web
    # ========================================================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT NOT NULL,
            last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    print("✓ Schéma de base de données créé (synchronisé avec llmui_backend.py)")


def create_admin_user(conn, username, password):
    """Crée l'utilisateur administrateur - v0.5.0 CORRIGÉ"""
    cursor = conn.cursor()
    
    # Vérifier si l'utilisateur existe déjà
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    existing_user = cursor.fetchone()
    
    if existing_user:
        # Mettre à jour le mot de passe avec hash sécurisé
        password_hash = hash_password_secure(password)
        cursor.execute(
            "UPDATE users SET password_hash = ?, is_admin = 1 WHERE username = ?",
            (password_hash, username)
        )
        print(f"✓ Mot de passe mis à jour pour '{username}'")
    else:
        # Créer un nouvel utilisateur (id auto-généré par AUTOINCREMENT)
        password_hash = hash_password_secure(password)
        
        cursor.execute(
            "INSERT INTO users (username, password_hash, is_admin, created_at) VALUES (?, ?, 1, ?)",
            (username, password_hash, datetime.now().isoformat())
        )
        print(f"✓ Utilisateur admin '{username}' créé avec hash sécurisé")
    
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
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        
        # Créer le schéma
        create_schema(conn)
        
        # Créer l'utilisateur
        password_hash = create_admin_user(conn, username, password)
        
        print(f"\n✓ Base de données initialisée: {DB_PATH}")
        print(f"✓ Utilisateur: {username}")
        print(f"✓ Hash: {password_hash[:50]}...")
        
        conn.close()
        
    except KeyboardInterrupt:
        print("\n\nInterruption utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
EOFPYTHON

    # Execute the database initialization script
    chmod +x /tmp/init_db.py
    python3 /tmp/init_db.py
    
    # Set permissions on database
    chown "$SERVICE_USER:$SERVICE_USER" "$DB_PATH"
    chmod 600 "$DB_PATH"
    
    log_success "Base de données initialisée"
}

# ============================================================================
# GÉNÉRATION CERTIFICATS SSL
# ============================================================================

generate_ssl_certificates() {
    log_step "Génération des certificats SSL auto-signés"
    
    if [[ -f "$INSTALL_DIR/ssl/llmui.crt" ]]; then
        log_info "Certificats SSL déjà présents"
        return
    fi
    
    # Create SSL directory
    mkdir -p "$INSTALL_DIR/ssl"
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$INSTALL_DIR/ssl/llmui.key" \
        -out "$INSTALL_DIR/ssl/llmui.crt" \
        -subj "/C=CA/ST=Quebec/L=Montreal/O=LLMUI/CN=llmui.local" \
        2>/dev/null
    
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/ssl"
    chmod 600 "$INSTALL_DIR/ssl"/*
    
    log_success "Certificats SSL générés"
}

# ============================================================================
# CRÉATION SERVICES SYSTEMD
# ============================================================================

create_systemd_services() {
    log_step "Création des services systemd"
    
    # Backend service
    cat > /etc/systemd/system/llmui-backend.service << EOF
[Unit]
Description=LLMUI Core Backend
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
WorkingDirectory=$INSTALL_DIR
Environment="PATH=$INSTALL_DIR/venv/bin"
ExecStart=$INSTALL_DIR/venv/bin/python $INSTALL_DIR/src/llmui_backend.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # Proxy service
    cat > /etc/systemd/system/llmui-proxy.service << EOF
[Unit]
Description=LLMUI Core Proxy
After=network.target llmui-backend.service

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
WorkingDirectory=$INSTALL_DIR
Environment="PATH=$INSTALL_DIR/venv/bin"
ExecStart=$INSTALL_DIR/venv/bin/python $INSTALL_DIR/src/llmui_proxy.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd
    systemctl daemon-reload
    
    log_success "Services systemd créés"
}

# ============================================================================
# DÉMARRAGE SERVICES
# ============================================================================

start_services() {
    log_step "Démarrage des services"
    
    # Enable and start backend
    systemctl enable llmui-backend
    systemctl start llmui-backend
    log_success "Service backend démarré"
    
    # Wait for backend
    sleep 3
    
    # Enable and start proxy
    systemctl enable llmui-proxy
    systemctl start llmui-proxy
    log_success "Service proxy démarré"
}

# ============================================================================
# RÉSUMÉ INSTALLATION
# ============================================================================

show_summary() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  ✓ Installation LLMUI Core terminée avec succès !"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "📁 Répertoire d'installation : $INSTALL_DIR"
    echo "💾 Base de données          : $DB_PATH"
    echo "📋 Logs                     : $LOG_DIR"
    echo ""
    echo "🔧 Services systemd :"
    echo "   • Backend : systemctl status llmui-backend"
    echo "   • Proxy   : systemctl status llmui-proxy"
    echo ""
    echo "🌐 Accès interface web :"
    echo "   • HTTP  : http://$(hostname -I | awk '{print $1}'):8000"
    echo "   • HTTPS : https://$(hostname -I | awk '{print $1}'):8443"
    echo ""
    echo "📚 Commandes utiles :"
    echo "   • Voir logs backend : journalctl -u llmui-backend -f"
    echo "   • Voir logs proxy   : journalctl -u llmui-proxy -f"
    echo "   • Redémarrer        : systemctl restart llmui-backend llmui-proxy"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    clear
    
    echo "═══════════════════════════════════════════════════════════════"
    echo "  LLMUI Core - Installation Script v0.5.0"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    check_root
    check_prerequisites
    create_service_user
    create_directories
    copy_files
    install_python_packages
    initialize_database
    generate_ssl_certificates
    create_systemd_services
    start_services
    show_summary
}

# Execute main
main
