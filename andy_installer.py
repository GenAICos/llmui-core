#!/usr/bin/env python3
"""
==============================================================================
Andy - Assistant DevOps Autonome v0.5.0
Installation automatisée de LLMUI Core
==============================================================================
Auteur: Francois Chalut
Date: 2025-11-21
Licence: Propriétaire
==============================================================================
"""

import subprocess
import sys
import os
import sqlite3
import json
from datetime import datetime
from pathlib import Path
import getpass

class Andy:
    def __init__(self):
        self.db_path = "/tmp/andy_installation.db"
        self.log_file = "/tmp/andy_install.log"
        self.conn = None
        self.setup_database()
        self.llm_model = "qwen2.5:3b"
        
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
        models = ["phi3:3.8b", "gemma2:2b", "granite4:micro-h"]
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
        """Demande les identifiants utilisateur"""
        print("\n" + "="*60)
        print("Configuration utilisateur LLMUI")
        print("="*60)
        username = input("Nom d'utilisateur pour LLMUI [llmui]: ").strip() or "llmui"
        password = getpass.getpass("Mot de passe pour l'interface LLMUI: ")
        
        if not password:
            print("Le mot de passe ne peut pas être vide!")
            sys.exit(1)
        
        return username, password
    
    def run_installation(self):
        """Lance l'installation complète"""
        self.log("Démarrage de l'installation LLMUI Core par Andy v0.5", "INFO")
        
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
        
        # Installation dépendances système
        if pkg_manager == "apt":
            packages = "python3-pip python3-venv python3-dev python3-full build-essential git curl wget nginx certbot python3-certbot-nginx ufw fail2ban sqlite3 net-tools bc"
            self.execute_command(f"sudo apt-get install -y {packages}", "Installation dépendances", 2, critical=True)
        elif pkg_manager in ["dnf", "yum"]:
            packages = "python3-pip python3-devel gcc git curl wget nginx certbot python3-certbot-nginx firewalld fail2ban sqlite net-tools bc"
            self.execute_command(f"sudo {pkg_manager} install -y {packages}", "Installation dépendances", 2, critical=True)
        
        # Étape 3: Installation Ollama
        self.log("=== ÉTAPE 3: Installation Ollama et modèles ===", "INFO")
        if not self.install_ollama_and_models():
            self.log("Problème avec Ollama, mais continuation...", "WARNING")
        
        # Étape 4: Création utilisateur et répertoires
        self.log("=== ÉTAPE 4: Création utilisateur et répertoires ===", "INFO")
        username, password = self.get_user_credentials()
        
        self.execute_command(
            f"sudo useradd -r -s /bin/bash -d /opt/llmui-core -m {username}",
            "Création utilisateur",
            4
        )
        
        dirs = [
            "/opt/llmui-core/logs",
            "/opt/llmui-core/data",
            "/opt/llmui-core/backups",
            "/opt/llmui-core/ssl",
            "/opt/llmui-core/sessions",
            "/opt/llmui-core/scripts",
            "/opt/llmui-core/data/conversations",
            "/opt/llmui-core/data/users",
            "/opt/llmui-core/data/cache"
        ]
        
        for dir_path in dirs:
            self.execute_command(f"sudo mkdir -p {dir_path}", f"Création {dir_path}", 4)
        
        self.execute_command(f"sudo chown -R {username}:{username} /opt/llmui-core", "Chown", 4)
        self.execute_command("sudo chmod -R 755 /opt/llmui-core", "Chmod 755", 4)
        self.execute_command("sudo chmod -R 700 /opt/llmui-core/data /opt/llmui-core/backups /opt/llmui-core/sessions", "Chmod 700", 4)
        
        # Étape 5: Environnement virtuel Python
        self.log("=== ÉTAPE 5: Création environnement virtuel Python ===", "INFO")
        self.execute_command(
            f"sudo su - {username} -c 'cd /opt/llmui-core && python3 -m venv venv'",
            "Création venv",
            5,
            critical=True
        )
        
        self.execute_command(
            f"sudo su - {username} -c '/opt/llmui-core/venv/bin/pip install --upgrade pip setuptools wheel'",
            "Upgrade pip",
            5
        )
        
        # Installation des packages Python essentiels
        packages_pip = "fastapi==0.104.1 uvicorn[standard]==0.24.0 aiohttp==3.9.1 pyyaml==6.0.1 python-multipart==0.0.6 python-jose[cryptography]==3.3.0 passlib[bcrypt]==1.7.4 bcrypt==4.1.2 aiosqlite==0.19.0 cryptography==41.0.7 pydantic==2.5.0 pydantic-settings==2.1.0 pytz==2024.1 slowapi==0.1.9 python-dotenv==1.0.0 websockets==12.0"
        
        self.execute_command(
            f"sudo su - {username} -c '/opt/llmui-core/venv/bin/pip install {packages_pip}'",
            "Installation packages Python",
            5
        )
        
        # Étape 6: Création des services systemd
        self.log("=== ÉTAPE 6: Configuration des services systemd ===", "INFO")
        self.create_systemd_services(username)
        
        # Étape 7: Configuration Nginx
        self.log("=== ÉTAPE 7: Configuration Nginx ===", "INFO")
        self.configure_nginx()
        
        # Étape 8: Configuration Pare-feu
        self.log("=== ÉTAPE 8: Configuration Pare-feu ===", "INFO")
        self.configure_firewall()
        
        # Étape 9: Démarrage des services
        self.log("=== ÉTAPE 9: Démarrage des services ===", "INFO")
        self.add_note("Services non démarrés car fichiers source manquants - à démarrer après copie des sources", "Installation")
        
        self.log("=== Installation de base terminée avec succès ===", "SUCCESS")
        self.log("NOTE: Copiez les fichiers source vers /opt/llmui-core/ puis démarrez les services", "WARNING")
        return True
    
    def create_systemd_services(self, username):
        """Crée les fichiers de service systemd"""
        
        # Service backend
        backend_service = f"""[Unit]
Description=LLMUI Backend Service
After=network.target

[Service]
Type=simple
User={username}
WorkingDirectory=/opt/llmui-core
Environment="PATH=/opt/llmui-core/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONPATH=/opt/llmui-core/src"
ExecStart=/opt/llmui-core/venv/bin/python /opt/llmui-core/src/llmui_backend.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/llmui-core/data /opt/llmui-core/logs /opt/llmui-core/sessions

[Install]
WantedBy=multi-user.target
"""
        
        # Service proxy
        proxy_service = f"""[Unit]
Description=LLMUI Proxy Service
After=network.target llmui-backend.service

[Service]
Type=simple
User={username}
WorkingDirectory=/opt/llmui-core
Environment="PATH=/opt/llmui-core/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONPATH=/opt/llmui-core/src"
ExecStart=/opt/llmui-core/venv/bin/python /opt/llmui-core/src/llmui_proxy.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/llmui-core/data /opt/llmui-core/logs

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
        """Configure Nginx"""
        
        nginx_config = """server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Root directory
    root /opt/llmui-core/web;
    index index.html;

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
    
    def configure_firewall(self):
        """Configure le pare-feu"""
        
        # Détection du pare-feu
        if self.execute_command("command -v ufw", "Détection UFW")[0]:
            self.execute_command("sudo ufw --force enable", "Activation UFW", 8)
            self.execute_command("sudo ufw default deny incoming", "UFW deny incoming", 8)
            self.execute_command("sudo ufw default allow outgoing", "UFW allow outgoing", 8)
            self.execute_command("sudo ufw allow ssh", "UFW allow SSH", 8)
            self.execute_command("sudo ufw allow http", "UFW allow HTTP", 8)
            self.execute_command("sudo ufw allow https", "UFW allow HTTPS", 8)
            self.log("UFW configuré", "SUCCESS")
            
        elif self.execute_command("command -v firewall-cmd", "Détection firewalld")[0]:
            self.execute_command("sudo systemctl enable --now firewalld", "Activation firewalld", 8)
            self.execute_command("sudo firewall-cmd --permanent --add-service=ssh", "Firewalld allow SSH", 8)
            self.execute_command("sudo firewall-cmd --permanent --add-service=http", "Firewalld allow HTTP", 8)
            self.execute_command("sudo firewall-cmd --permanent --add-service=https", "Firewalld allow HTTPS", 8)
            self.execute_command("sudo firewall-cmd --reload", "Firewalld reload", 8)
            self.log("Firewalld configuré", "SUCCESS")
    
    def verify_installation(self):
        """Vérifie que l'installation de base fonctionne"""
        self.log("=== VÉRIFICATION POST-INSTALLATION ===", "INFO")
        
        checks = [
            ("test -d /opt/llmui-core/venv", "Environnement virtuel"),
            ("test -f /etc/systemd/system/llmui-backend.service", "Service backend créé"),
            ("test -f /etc/systemd/system/llmui-proxy.service", "Service proxy créé"),
            ("test -f /etc/nginx/sites-available/llmui", "Config Nginx"),
            ("sudo systemctl is-active nginx", "Service nginx"),
            ("curl -I http://localhost/", "Test HTTP")
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
            print("Installation terminée! Vérifiez les logs dans /tmp/andy_install.log")
            print("Base de données: /tmp/andy_installation.db")
            print("="*60)
        else:
            print("\nInstallation échouée. Consultez les logs.")
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
