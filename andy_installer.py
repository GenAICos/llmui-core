#!/usr/bin/env python3
"""
==============================================================================
Andy - Assistant DevOps Autonome v0.5.0
Installation automatisée de LLMUI Core
==============================================================================
Auteur: Francois Chalut
Date: 2025-11-21
Licence: AGPLv3 + common clause
==============================================================================
"""

import subprocess
import sys
import os
import sqlite3
import json
import hashlib
import uuid
from datetime import datetime
from pathlib import Path
import getpass

# GitHub repository known by Andy
GITHUB_REPO = "https://github.com/GenAICos/llmui-core.git"

class Andy:
    def __init__(self):
        self.db_path = "/tmp/andy_installation.db"
        self.log_file = "/tmp/andy_install.log"
        self.conn = None
        self.setup_database()
        self.llm_model = "qwen2.5:3b"
        self.github_repo = GITHUB_REPO
        
    def setup_database(self):
        """Initialise la base de données SQLite pour Andy"""
        self.conn = sqlite3.connect(self.db_path)
        cursor = self.conn.cursor()
        
        # Table pour les commandes à exécuter
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                step_number INTEGER,
                step_name TEXT,
                command TEXT,
                status TEXT DEFAULT 'pending',
                output TEXT,
                error TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Table pour les notes d'Andy
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS andy_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note TEXT,
                context TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Table pour les corrections appliquées
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS corrections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_command TEXT,
                corrected_command TEXT,
                reason TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        self.conn.commit()
        
    def log(self, message, level="INFO"):
        """Log les messages"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] [{level}] {message}"
        print(log_message)
        with open(self.log_file, "a") as f:
            f.write(log_message + "\n")
            
    def add_note(self, note, context=""):
        """Ajoute une note dans la base de données"""
        cursor = self.conn.cursor()
        cursor.execute("INSERT INTO andy_notes (note, context) VALUES (?, ?)", (note, context))
        self.conn.commit()
        
    def execute_command(self, command, step_name="", step_number=0, critical=False):
        """Exécute une commande et enregistre le résultat"""
        self.log(f"Exécution: {command}", "CMD")
        
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO commands (step_number, step_name, command, status) VALUES (?, ?, ?, 'running')",
            (step_number, step_name, command)
        )
        self.conn.commit()
        cmd_id = cursor.lastrowid
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=600
            )
            
            cursor.execute(
                "UPDATE commands SET status=?, output=?, error=? WHERE id=?",
                ('success' if result.returncode == 0 else 'failed', result.stdout, result.stderr, cmd_id)
            )
            self.conn.commit()
            
            if result.returncode != 0:
                self.log(f"Erreur: {result.stderr}", "ERROR")
                if critical:
                    raise Exception(f"Commande critique échouée: {command}")
                return False, result.stderr
            
            return True, result.stdout
            
        except subprocess.TimeoutExpired:
            self.log("Timeout de la commande", "ERROR")
            cursor.execute(
                "UPDATE commands SET status='timeout', error='Command timeout' WHERE id=?",
                (cmd_id,)
            )
            self.conn.commit()
            return False, "Timeout"
        except Exception as e:
            self.log(f"Exception: {str(e)}", "ERROR")
            cursor.execute(
                "UPDATE commands SET status='error', error=? WHERE id=?",
                (str(e), cmd_id)
            )
            self.conn.commit()
            return False, str(e)
    
    def detect_package_manager(self):
        """Détecte le gestionnaire de paquets"""
        if self.execute_command("command -v apt-get", "Détection apt")[0]:
            return "apt"
        elif self.execute_command("command -v dnf", "Détection dnf")[0]:
            return "dnf"
        elif self.execute_command("command -v yum", "Détection yum")[0]:
            return "yum"
        else:
            self.log("Gestionnaire de paquets non détecté", "ERROR")
            return None
    
    def check_python_version(self):
        """Vérifie la version de Python"""
        success, output = self.execute_command("python3 --version", "Vérification Python")
        if success:
            version = output.strip().split()[1]
            major, minor = map(int, version.split('.')[:2])
            if major >= 3 and minor >= 8:
                self.log(f"Python {version} OK", "SUCCESS")
                return True
            else:
                self.log(f"Python {version} trop ancien (requis >= 3.8)", "ERROR")
                return False
        return False
    
    def install_ollama_and_models(self):
        """Installe Ollama et télécharge les modèles"""
        self.log("Installation d'Ollama...", "INFO")
        success, _ = self.execute_command(
            "curl -fsSL https://ollama.com/install.sh | sh",
            "Installation Ollama",
            3,
            critical=True
        )
        
        if not success:
            self.add_note("Échec installation Ollama", "Installation")
            return False
        
        # Pull des modèles
        models = ["phi3:3.8b", "gemma2:2b", "granite4:micro-h", "qwen2.5:3b"]
        for model in models:
            self.log(f"Téléchargement du modèle {model}...", "INFO")
            success, _ = self.execute_command(
                f"ollama pull {model}",
                f"Pull modèle {model}",
                3
            )
            if not success:
                self.log(f"Échec du téléchargement de {model}", "WARNING")
        
        return True
    
    def get_user_credentials(self):
        """Demande les identifiants utilisateur pour LLMUI"""
        print("\n" + "="*60)
        print("🔐 Configuration utilisateur LLMUI Interface")
        print("="*60)
        username = input("Nom d'utilisateur pour l'interface web [admin]: ").strip() or "admin"
        
        while True:
            password = getpass.getpass("Mot de passe pour l'interface web: ")
            if not password:
                print("⚠️  Le mot de passe ne peut pas être vide!")
                continue
            
            password_confirm = getpass.getpass("Confirmez le mot de passe: ")
            if password != password_confirm:
                print("⚠️  Les mots de passe ne correspondent pas!")
                continue
            
            break
        
        return username, password
    
    def create_database_with_user(self, username, password):
        """Crée la base de données LLMUI avec l'utilisateur"""
        db_path = "/var/lib/llmui/llmui.db"
        
        self.log("Création de la base de données LLMUI...", "INFO")
        
        # Créer le répertoire si nécessaire
        os.makedirs("/var/lib/llmui", exist_ok=True)
        
        # Connexion à la base de données
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Créer les tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT,
                is_admin INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                title TEXT,
                model TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT,
                role TEXT,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Créer l'utilisateur admin
        user_id = str(uuid.uuid4())
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        try:
            cursor.execute(
                'INSERT INTO users (id, username, password_hash, is_admin, created_at) VALUES (?, ?, ?, 1, ?)',
                (user_id, username, password_hash, datetime.now().isoformat())
            )
            self.log(f"✅ Utilisateur '{username}' créé avec succès", "SUCCESS")
        except sqlite3.IntegrityError:
            self.log(f"⚠️  Utilisateur '{username}' existe déjà", "WARNING")
        
        conn.commit()
        conn.close()
        
        # Définir les permissions
        self.execute_command(f"chown -R llmui:llmui /var/lib/llmui", "Permissions base de données", 5)
        self.execute_command(f"chmod 660 {db_path}", "Permissions fichier DB", 5)
        
        self.log(f"Base de données créée: {db_path}", "SUCCESS")
    
    def run_installation(self):
        """Lance l'installation complète"""
        self.log("Démarrage de l'installation LLMUI Core par Andy v0.5.0", "INFO")
        self.log(f"Dépôt GitHub: {self.github_repo}", "INFO")
        
        # Étape 1: Mise à jour OS
        self.log("=== ÉTAPE 1: Mise à jour de l'OS ===", "INFO")
        pkg_manager = self.detect_package_manager()
        if not pkg_manager:
            return False
        
        if pkg_manager == "apt":
            self.execute_command("sudo apt update", "Update apt", 1, critical=True)
            self.execute_command("sudo apt upgrade -y", "Upgrade apt", 1)
        elif pkg_manager in ["dnf", "yum"]:
            self.execute_command(f"sudo {pkg_manager} check-update", f"Update {pkg_manager}", 1)
            self.execute_command(f"sudo {pkg_manager} upgrade -y", f"Upgrade {pkg_manager}", 1)
        
        # Étape 2: Vérification prérequis
        self.log("=== ÉTAPE 2: Vérification des prérequis ===", "INFO")
        if not self.check_python_version():
            return False
        
        # Étape 3: Installation des dépendances
        self.log("=== ÉTAPE 3: Installation des dépendances ===", "INFO")
        if pkg_manager == "apt":
            deps = "python3-pip python3-venv nginx git curl sqlite3"
            self.execute_command(f"sudo apt install -y {deps}", "Installation dépendances", 2, critical=True)
        elif pkg_manager in ["dnf", "yum"]:
            deps = "python3-pip python3-virtualenv nginx git curl sqlite"
            self.execute_command(f"sudo {pkg_manager} install -y {deps}", "Installation dépendances", 2, critical=True)
        
        # Étape 4: Installation Ollama
        self.log("=== ÉTAPE 4: Installation Ollama et modèles ===", "INFO")
        if not self.install_ollama_and_models():
            return False
        
        # Étape 5: Demander les credentials utilisateur
        username, password = self.get_user_credentials()
        
        # Étape 6: Création des répertoires
        self.log("=== ÉTAPE 5: Création des répertoires ===", "INFO")
        self.execute_command("sudo mkdir -p /opt/llmui-core", "Création /opt/llmui-core", 4)
        self.execute_command("sudo mkdir -p /var/lib/llmui", "Création /var/lib/llmui", 4)
        self.execute_command("sudo mkdir -p /var/log/llmui", "Création /var/log/llmui", 4)
        
        # Créer l'utilisateur système
        self.execute_command("sudo useradd -r -s /bin/bash -d /opt/llmui-core llmui 2>/dev/null || true", "Création utilisateur llmui", 4)
        
        # Étape 7: Initialisation de la base de données avec utilisateur
        self.log("=== ÉTAPE 6: Initialisation base de données ===", "INFO")
        self.create_database_with_user(username, password)
        
        # Étape 8: Création des services systemd
        self.log("=== ÉTAPE 7: Création des services systemd ===", "INFO")
        self.create_systemd_services()
        
        # Étape 9: Configuration Nginx
        self.log("=== ÉTAPE 8: Configuration Nginx ===", "INFO")
        self.configure_nginx()
        
        # Étape 10: Configuration pare-feu avec règles strictes
        self.log("=== ÉTAPE 9: Configuration pare-feu (sécurité) ===", "INFO")
        self.configure_firewall_strict()
        
        return True
    
    def create_systemd_services(self):
        """Crée les services systemd"""
        
        backend_service = """[Unit]
Description=LLMUI Core Backend
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=llmui
Group=llmui
WorkingDirectory=/opt/llmui-core
Environment="PATH=/opt/llmui-core/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=/opt/llmui-core/venv/bin/python -m uvicorn src.llmui_backend:app --host 127.0.0.1 --port 5000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/llmui-core/data /opt/llmui-core/logs /var/lib/llmui /var/log/llmui

[Install]
WantedBy=multi-user.target
"""
        
        proxy_service = """[Unit]
Description=LLMUI Core Proxy
After=network.target llmui-backend.service
Requires=llmui-backend.service

[Service]
Type=simple
User=llmui
Group=llmui
WorkingDirectory=/opt/llmui-core
Environment="PATH=/opt/llmui-core/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=/opt/llmui-core/venv/bin/python src/llmui_proxy.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/llmui-core/data /opt/llmui-core/logs /var/lib/llmui /var/log/llmui

[Install]
WantedBy=multi-user.target
"""
        
        # Écriture des fichiers
        with open("/tmp/llmui-backend.service", "w") as f:
            f.write(backend_service)
        
        with open("/tmp/llmui-proxy.service", "w") as f:
            f.write(proxy_service)
        
        self.execute_command(
            "sudo mv /tmp/llmui-backend.service /etc/systemd/system/",
            "Installation service backend",
            6
        )
        
        self.execute_command(
            "sudo mv /tmp/llmui-proxy.service /etc/systemd/system/",
            "Installation service proxy",
            6
        )
        
        self.execute_command(
            "sudo systemctl daemon-reload",
            "Reload systemd",
            6,
            critical=True
        )
        
        self.log("Services systemd créés", "SUCCESS")
    
    def configure_nginx(self):
        """Configure Nginx avec redirection HTTPS"""
        
        nginx_config = """server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Avertissement - rediriger vers HTTPS en production
    # return 301 https://$server_name$request_uri;

    # Root directory
    root /opt/llmui-core/web;
    index index.html login.html;

    # Static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend (localhost only)
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
"""
        
        with open("/tmp/llmui-nginx.conf", "w") as f:
            f.write(nginx_config)
        
        # Backup de l'ancienne config si elle existe
        self.execute_command(
            "sudo cp /etc/nginx/sites-available/llmui /etc/nginx/sites-available/llmui.bak.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true",
            "Backup Nginx config",
            7
        )
        
        self.execute_command(
            "sudo mv /tmp/llmui-nginx.conf /etc/nginx/sites-available/llmui",
            "Installation Nginx config",
            7
        )
        
        self.execute_command(
            "sudo ln -sf /etc/nginx/sites-available/llmui /etc/nginx/sites-enabled/",
            "Activation site Nginx",
            7
        )
        
        self.execute_command(
            "sudo rm -f /etc/nginx/sites-enabled/default",
            "Suppression site default",
            7
        )
        
        success, _ = self.execute_command(
            "sudo nginx -t",
            "Test config Nginx",
            7
        )
        
        if success:
            self.execute_command(
                "sudo systemctl reload nginx",
                "Reload Nginx",
                7
            )
            self.log("Nginx configuré avec succès", "SUCCESS")
        else:
            self.log("Erreur dans la config Nginx", "ERROR")
    
    def configure_firewall_strict(self):
        """Configure le pare-feu avec règles strictes de sécurité"""
        
        # Détection du pare-feu
        if self.execute_command("command -v ufw", "Détection UFW")[0]:
            self.log("Configuration UFW avec règles strictes...", "INFO")
            self.execute_command("sudo ufw --force enable", "Activation UFW", 8)
            self.execute_command("sudo ufw default deny incoming", "UFW deny incoming", 8)
            self.execute_command("sudo ufw default allow outgoing", "UFW allow outgoing", 8)
            
            # Règles publiques
            self.execute_command("sudo ufw allow 22/tcp", "UFW allow SSH", 8)
            self.execute_command("sudo ufw allow 80/tcp", "UFW allow HTTP", 8)
            self.execute_command("sudo ufw allow 443/tcp", "UFW allow HTTPS", 8)
            
            # Règles localhost only pour ports internes
            self.execute_command("sudo ufw allow from 127.0.0.1 to any port 5000 proto tcp", "UFW backend localhost only", 8)
            self.execute_command("sudo ufw allow from 127.0.0.1 to any port 8080 proto tcp", "UFW proxy localhost only", 8)
            self.execute_command("sudo ufw allow from 127.0.0.1 to any port 11434 proto tcp", "UFW Ollama localhost only", 8)
            
            self.execute_command("sudo ufw reload", "UFW reload", 8)
            self.log("UFW configuré avec règles strictes", "SUCCESS")
            
        elif self.execute_command("command -v firewall-cmd", "Détection firewalld")[0]:
            self.log("Configuration firewalld avec règles strictes...", "INFO")
            self.execute_command("sudo systemctl enable --now firewalld", "Activation firewalld", 8)
            
            # Règles publiques
            self.execute_command("sudo firewall-cmd --permanent --add-service=ssh", "Firewalld allow SSH", 8)
            self.execute_command("sudo firewall-cmd --permanent --add-service=http", "Firewalld allow HTTP", 8)
            self.execute_command("sudo firewall-cmd --permanent --add-service=https", "Firewalld allow HTTPS", 8)
            
            # Règles localhost only
            self.execute_command("sudo firewall-cmd --permanent --add-rich-rule='rule family=\"ipv4\" source address=\"127.0.0.1\" port port=\"5000\" protocol=\"tcp\" accept'", "Firewalld backend localhost", 8)
            self.execute_command("sudo firewall-cmd --permanent --add-rich-rule='rule family=\"ipv4\" source address=\"127.0.0.1\" port port=\"8080\" protocol=\"tcp\" accept'", "Firewalld proxy localhost", 8)
            self.execute_command("sudo firewall-cmd --permanent --add-rich-rule='rule family=\"ipv4\" source address=\"127.0.0.1\" port port=\"11434\" protocol=\"tcp\" accept'", "Firewalld Ollama localhost", 8)
            
            self.execute_command("sudo firewall-cmd --reload", "Firewalld reload", 8)
            self.log("Firewalld configuré avec règles strictes", "SUCCESS")
        else:
            self.log("⚠️  Aucun pare-feu détecté - configuration manuelle recommandée", "WARNING")
    
    def verify_installation(self):
        """Vérifie que l'installation de base fonctionne"""
        self.log("=== VÉRIFICATION POST-INSTALLATION ===", "INFO")
        
        checks = [
            ("test -d /opt/llmui-core", "Répertoire installation"),
            ("test -f /var/lib/llmui/llmui.db", "Base de données"),
            ("test -f /etc/systemd/system/llmui-backend.service", "Service backend créé"),
            ("test -f /etc/systemd/system/llmui-proxy.service", "Service proxy créé"),
            ("test -f /etc/nginx/sites-available/llmui", "Config Nginx"),
            ("sudo systemctl is-active nginx", "Service nginx")
        ]
        
        all_ok = True
        for cmd, name in checks:
            success, output = self.execute_command(cmd, f"Vérif {name}", 10)
            if success:
                self.log(f"✓ {name} OK", "SUCCESS")
            else:
                self.log(f"✗ {name} ÉCHEC", "ERROR")
                all_ok = False
        
        return all_ok
    
    def cleanup(self):
        """Nettoyage et fermeture"""
        if self.conn:
            self.conn.close()
        self.log("Andy a terminé son travail", "INFO")

def main():
    andy = Andy()
    try:
        if andy.run_installation():
            andy.verify_installation()
            print("\n" + "="*60)
            print("✅ Installation terminée!")
            print("="*60)
            print(f"📋 Logs: /tmp/andy_install.log")
            print(f"🗄️  Base de données: /tmp/andy_installation.db")
            print(f"🌐 Dépôt GitHub: {GITHUB_REPO}")
            print("⚠️  IMPORTANT: Configurez SSL/HTTPS avant exposition publique!")
            print("="*60)
        else:
            print("\n❌ Installation échouée. Consultez les logs.")
            sys.exit(1)
    except KeyboardInterrupt:
        andy.log("Installation interrompue par l'utilisateur", "WARNING")
        sys.exit(1)
    except Exception as e:
        andy.log(f"Erreur fatale: {str(e)}", "ERROR")
        sys.exit(1)
    finally:
        andy.cleanup()

if __name__ == "__main__":
    if os.geteuid() != 0:
        print("Ce script doit être exécuté en tant que root (sudo)")
        sys.exit(1)
    main()
