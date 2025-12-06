#!/bin/bash

# ============================================================================
# LLMUI-CORE - Installation Script v0.5.0
# ============================================================================
# Description: Interactive installation script for LLMUI-CORE system
# Author: Francois Chalut
# Version: 0.5
# License: See LICENSE file
# 
# CORRECTIONS v0.5.0:
# - FIX CRITIQUE: Schéma de base de données corrigé (id INTEGER au lieu de TEXT)
# - FIX CRITIQUE: Hash bcrypt/PBKDF2 au lieu de SHA256
# - Ajout de la création d'utilisateur admin dans SQLite
# - Gestion correcte des caractères spéciaux (!! @ # $ etc.) via Python
# - Cohérence totale avec andy_installer.py et llmui_backend.py
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/llmui-core"
DATA_DIR="/var/lib/llmui"
SERVICE_USER="llmui"
PYTHON_MIN_VERSION="3.8"
DB_PATH="$DATA_DIR/llmui.db"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ Erreur: $1${NC}"
}

log_step() {
    echo -e "${BLUE}⚙️  $1${NC}"
}

# Error handler
handle_error() {
    local exit_code=$?
    local line_number=$1
    log_error "Installation failed at line $line_number (exit code: $exit_code)"
    log_info "Consultez le fichier de log pour plus de détails"
    exit 1
}

trap 'handle_error ${LINENO}' ERR

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Ce script doit être exécuté en tant que root (sudo)"
        exit 1
    fi
}

# Detect OS and package manager
detect_os() {
    log_step "Détection du système d'exploitation..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
        log_info "OS détecté: $OS $OS_VERSION"
    else
        log_error "Impossible de détecter le système d'exploitation"
        exit 1
    fi
    
    # Detect package manager
    if command -v apt-get &> /dev/null; then
        PKG_MANAGER="apt"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
    else
        log_error "Gestionnaire de paquets non supporté"
        exit 1
    fi
    
    log_success "Gestionnaire de paquets: $PKG_MANAGER"
}

# Check system requirements
check_requirements() {
    log_step "Vérification des prérequis système..."
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
        log_info "Python $PYTHON_VERSION détecté"
        
        if (( $(echo "$PYTHON_VERSION >= $PYTHON_MIN_VERSION" | bc -l) )); then
            log_success "Version Python compatible"
        else
            log_error "Python $PYTHON_MIN_VERSION ou supérieur requis"
            exit 1
        fi
    else
        log_error "Python 3 n'est pas installé"
        exit 1
    fi
    
    # Check available disk space
    AVAILABLE_SPACE=$(df -BG / 2>/dev/null | awk 'NR==2 {print $4}' | sed 's/G//' || echo "1000")
    if [[ $AVAILABLE_SPACE -lt 5 ]]; then
        log_warning "Espace disque faible: ${AVAILABLE_SPACE}G disponible"
    else
        log_success "Espace disque suffisant: ${AVAILABLE_SPACE}G disponible"
    fi
}

# Install system dependencies
install_dependencies() {
    log_step "Installation des dépendances système..."
    
    case $PKG_MANAGER in
        apt)
            apt-get update
            apt-get install -y \
                python3-pip \
                python3-venv \
                python3-dev \
                python3-full \
                build-essential \
                git \
                curl \
                wget \
                nginx \
                certbot \
                python3-certbot-nginx \
                ufw \
                fail2ban \
                sqlite3 \
                net-tools \
                bc
            ;;
        yum|dnf)
            $PKG_MANAGER install -y \
                python3-pip \
                python3-devel \
                gcc \
                git \
                curl \
                wget \
                nginx \
                certbot \
                python3-certbot-nginx \
                firewalld \
                fail2ban \
                sqlite \
                net-tools \
                bc
            ;;
    esac
    
    log_success "Dépendances système installées"
}

# Create service user
create_user() {
    log_step "Création de l'utilisateur système..."
    
    if id "$SERVICE_USER" &>/dev/null; then
        log_info "L'utilisateur $SERVICE_USER existe déjà"
    else
        useradd -r -s /bin/bash -d "$INSTALL_DIR" -m "$SERVICE_USER"
        log_success "Utilisateur $SERVICE_USER créé"
    fi
}

# Setup directory structure
setup_directories() {
    log_step "Configuration de la structure des répertoires..."
    
    # Create main directories
    mkdir -p "$INSTALL_DIR"/{logs,backups,ssl,sessions,scripts}
    mkdir -p "$DATA_DIR"
    
    # Set permissions
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR"
    chmod -R 755 "$INSTALL_DIR"
    chmod -R 700 "$DATA_DIR"
    
    log_success "Structure des répertoires créée"
}

# Copy application files
copy_files() {
    log_step "Copie des fichiers de l'application..."
    
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

# Install Python packages in virtual environment
install_python_packages() {
    log_step "Installation packages Python dans l'environnement virtuel..."
    
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
            fastapi==0.104.1 \
            uvicorn[standard]==0.24.0 \
            httpx==0.28.1 \
            pyyaml==6.0.1 \
            python-multipart==0.0.6 \
            pytz==2024.1 \
            pydantic==2.5.0"
    fi
    
    log_success "Packages Python installés dans le venv"
}

# Initialize database with admin user
initialize_database() {
    log_step "Initialisation de la base de données..."
    
    # Create Python script for database initialization
    cat > /tmp/init_db.py << 'EOFPYTHON'
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Script d'initialisation de la base de données - v0.5.0 CORRIGÉ"""
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
    """Crée le schéma de la base"""
    cursor = conn.cursor()
    
    # Table users - SCHÉMA CORRIGÉ v0.5.0
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
    
    # Table conversations - SCHÉMA CORRIGÉ v0.5.0
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    # Table messages - SCHÉMA CORRIGÉ v0.5.0
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            model TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
    
    # Table sessions - SCHÉMA CORRIGÉ v0.5.0
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
        conn = sqlite3.connect(DB_PATH)
        
        # Créer le schéma
        create_schema(conn)
        print("✓ Schéma de base de données créé")
        
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
        sys.exit(1)
EOFPYTHON
    
    chmod +x /tmp/init_db.py
    
    # Exécuter le script Python
    python3 /tmp/init_db.py
    
    if [[ $? -eq 0 ]]; then
        # Set permissions on database
        chown "$SERVICE_USER:$SERVICE_USER" "$DB_PATH"
        chmod 660 "$DB_PATH"
        log_success "Base de données initialisée"
    else
        log_error "Échec de l'initialisation de la base de données"
        exit 1
    fi
    
    # Cleanup
    rm -f /tmp/init_db.py
}

# Configure systemd services
configure_services() {
    log_step "Configuration des services systemd..."
    
    # Backend service
    cat > /etc/systemd/system/llmui-backend.service <<EOF
[Unit]
Description=LLMUI Backend Service
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment="PATH=$INSTALL_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONPATH=$INSTALL_DIR/src"
Environment="LLMUI_DB_PATH=$DB_PATH"
ExecStart=$INSTALL_DIR/venv/bin/python $INSTALL_DIR/src/llmui_backend.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA_DIR $INSTALL_DIR/logs $INSTALL_DIR/sessions

[Install]
WantedBy=multi-user.target
EOF

    # Proxy service
    cat > /etc/systemd/system/llmui-proxy.service <<EOF
[Unit]
Description=LLMUI Proxy Service
After=network.target llmui-backend.service

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment="PATH=$INSTALL_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONPATH=$INSTALL_DIR/src"
ExecStart=$INSTALL_DIR/venv/bin/python $INSTALL_DIR/src/llmui_proxy.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA_DIR $INSTALL_DIR/logs

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd
    systemctl daemon-reload
    
    log_success "Services systemd configurés"
}

# Configure Nginx
configure_nginx() {
    log_step "Configuration de Nginx..."
    
    # Backup existing config if it exists
    if [[ -f /etc/nginx/sites-available/llmui ]]; then
        cp /etc/nginx/sites-available/llmui /etc/nginx/sites-available/llmui.bak.$(date +%Y%m%d_%H%M%S)
    fi
    
    cat > /etc/nginx/sites-available/llmui <<'EOF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Root directory
    root /opt/llmui-core/web;
    index index.html login.html;

    # Static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support for streaming
    location /ws/ {
        proxy_pass http://127.0.0.1:5000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Logs
    access_log /var/log/nginx/llmui-access.log;
    error_log /var/log/nginx/llmui-error.log;
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/llmui /etc/nginx/sites-enabled/
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        log_success "Nginx configuré et rechargé"
    else
        log_error "Erreur de configuration Nginx"
        exit 1
    fi
}

# Configure firewall
configure_firewall() {
    log_step "Configuration du pare-feu..."
    
    case $PKG_MANAGER in
        apt)
            # UFW configuration
            if command -v ufw &> /dev/null; then
                ufw --force enable
                ufw default deny incoming
                ufw default allow outgoing
                ufw allow ssh
                ufw allow http
                ufw allow https
                log_success "UFW configuré"
            else
                log_warning "UFW non disponible"
            fi
            ;;
        yum|dnf)
            # Firewalld configuration
            if command -v firewall-cmd &> /dev/null; then
                systemctl enable --now firewalld
                firewall-cmd --permanent --add-service=ssh
                firewall-cmd --permanent --add-service=http
                firewall-cmd --permanent --add-service=https
                firewall-cmd --reload
                log_success "Firewalld configuré"
            else
                log_warning "Firewalld non disponible"
            fi
            ;;
    esac
}

# Start services
start_services() {
    log_step "Démarrage des services..."
    
    # Enable and start backend
    systemctl enable llmui-backend
    systemctl start llmui-backend
    
    # Wait a bit
    sleep 3
    
    # Check backend status
    if systemctl is-active --quiet llmui-backend; then
        log_success "llmui-backend démarré"
    else
        log_error "Échec du démarrage de llmui-backend"
        log_info "Vérifiez les logs: journalctl -u llmui-backend -n 50"
        exit 1
    fi
    
    # Enable and start proxy if it exists
    if [[ -f "$INSTALL_DIR/src/llmui_proxy.py" ]]; then
        systemctl enable llmui-proxy
        systemctl start llmui-proxy
        sleep 2
        
        if systemctl is-active --quiet llmui-proxy; then
            log_success "llmui-proxy démarré"
        else
            log_warning "llmui-proxy n'a pas démarré (peut-être non nécessaire)"
        fi
    fi
    
    # Enable and start nginx
    systemctl enable nginx
    systemctl restart nginx
    
    if systemctl is-active --quiet nginx; then
        log_success "nginx démarré"
    else
        log_error "Échec du démarrage de nginx"
        exit 1
    fi
    
    log_success "Services démarrés"
}

# Display installation summary
show_summary() {
    local ip_address=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║           LLMUI-CORE Installation Terminée ✅                  ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    log_success "Installation réussie!"
    echo ""
    echo "🌐 Informations d'accès:"
    echo "   URL locale: http://localhost"
    echo "   URL réseau: http://$ip_address"
    echo ""
    echo "📁 Répertoires:"
    echo "   Installation: $INSTALL_DIR"
    echo "   Environnement virtuel: $INSTALL_DIR/venv"
    echo "   Logs: $INSTALL_DIR/logs"
    echo "   Base de données: $DB_PATH"
    echo ""
    echo "🔧 Commandes utiles:"
    echo "   Status: sudo systemctl status llmui-backend llmui-proxy"
    echo "   Logs: sudo journalctl -u llmui-backend -f"
    echo "   Restart: sudo systemctl restart llmui-backend llmui-proxy nginx"
    echo "   Activer venv: source $INSTALL_DIR/venv/bin/activate"
    echo ""
    echo "🔐 Connexion:"
    echo "   Utilisez les identifiants créés lors de l'initialisation de la base"
    echo ""
}

# Main installation flow
main() {
    clear
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║            LLMUI-CORE - Installation Interactive              ║"
    echo "║                     Version 0.5.0                             ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_root
    detect_os
    check_requirements
    
    echo ""
    read -p "Continuer l'installation? (o/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
        log_info "Installation annulée"
        exit 0
    fi
    
    install_dependencies
    create_user
    setup_directories
    copy_files
    install_python_packages
    initialize_database     # ← NOUVELLE ÉTAPE
    configure_services
    configure_nginx
    configure_firewall
    start_services
    show_summary
}

# Run main function
main "$@"
