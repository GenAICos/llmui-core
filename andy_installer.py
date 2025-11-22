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
import re
from datetime import datetime
from pathlib import Path
import getpass
import time

# GitHub repository known by Andy
GITHUB_REPO = "https://github.com/GenAICos/llmui-core.git"
OLLAMA_BASE_URL = "http://localhost:11434"

class Andy:
    def __init__(self):
        self.db_path = "/tmp/andy_installation.db"
        self.log_file = "/tmp/andy_install.log"
        self.conn = None
        self.setup_database()
        self.llm_model = "qwen2.5:3b"
        self.github_repo = GITHUB_REPO
        self.max_retries = 10  # ← Changé de 3 à 10 comme demandé
        
    # ... [tout le code inchangé jusqu'à l'étape 5 du run_installation] ...

    def run_installation(self):
        """Processus d'installation principal"""
        self.log("="*60, "INFO")
        self.log("DÉMARRAGE D'ANDY - Installation LLMUI-CORE v0.5.0", "INFO")
        self.log("="*60, "INFO")
        
        # ... [étapes 1 à 5 inchangées jusqu'au nettoyage du clone] ...

        # Nettoyer le clone temporaire
        self.execute_command(
            "sudo rm -rf /tmp/llmui-core-clone",
            "Nettoyage clone temporaire",
            5
        )

        # ====================== AJOUTS DEMANDÉS ======================
        self.log("Configuration finale du répertoire /opt/llmui-core", "INFO")
        
        # Copie config_yaml.example → config.yaml (tolérant aux deux noms possibles)
        self.execute_command(
            "sudo cp /opt/llmui-core/config_yaml.example /opt/llmui-core/config.yaml 2>/dev/null || "
            "sudo cp /opt/llmui-core/config.yaml.example /opt/llmui-core/config.yaml 2>/dev/null || true",
            "Copie config exemple → config.yaml",
            5
        )
        
        # Création du dossier logs
        self.execute_command(
            "sudo mkdir -p /opt/llmui-core/logs",
            "Création répertoire logs",
            5
        )
        
        # Permissions finales sur tout le répertoire
        self.execute_command(
            "sudo chown -R llmui:llmui /opt/llmui-core",
            "Permissions finales sur /opt/llmui-core",
            5
        )
        # ============================================================

        # Étape 5b: Installation Python venv et dépendances
        self.log("=== ÉTAPE 5b: Installation environnement Python ===", "INFO")
        
        # Créer le venv sans sudo (en tant qu'utilisateur courant)
        self.execute_command(
            "cd /opt/llmui-core && python3 -m venv venv",
            "Création venv",
            5,
            critical=True
        )
        
        # Upgrade pip
        self.execute_command(
            "cd /opt/llmui-core && venv/bin/pip install --upgrade pip",
            "Upgrade pip",
            5
        )
        
        # Installer les dépendances avec retry intelligent
        self.log("📦 Installation des dépendances Python avec auto-correction...", "INFO")
        pip_success = False
        retry_count = 0
        
        while not pip_success and retry_count < self.max_retries:
            if retry_count > 0:
                self.log(f"🔄 Tentative {retry_count + 1}/{self.max_retries}...", "INFO")
            
            success, error_output = self.execute_command(
                "cd /opt/llmui-core && venv/bin/pip install -r requirements.txt",
                "Installation dépendances Python",
                5,
                critical=False  # Ne pas échouer immédiatement
            )
            
            if success:
                pip_success = True
                self.log("✅ Dépendances Python installées avec succès!", "SUCCESS")
                break
            else:
                retry_count += 1
                self.log(f"❌ Échec de l'installation (tentative {retry_count})", "WARNING")
                
                if retry_count < self.max_retries:
                    # Andy analyse l'erreur et tente de corriger
                    self.log("🤖 Andy va analyser et corriger l'erreur...", "INFO")
                    
                    if self.fix_requirements_txt(error_output):
                        self.log("✅ Corrections appliquées, nouvelle tentative...", "INFO")
                        time.sleep(2)  # Petit délai avant retry
                    else:
                        self.log("⚠️ Andy n'a pas pu corriger automatiquement", "WARNING")
                        break
                else:
                    self.log(f"❌ Échec définitif après {self.max_retries} tentatives", "ERROR")
                    raise Exception("Installation des dépendances Python échouée après corrections automatiques")
        
        # Fixer les permissions après installation
        self.execute_command(
            "sudo chown -R llmui:llmui /opt/llmui-core/venv",
            "Permissions venv",
            5
        )
        
        # Get user credentials APRÈS avoir cloné le dépôt
        username, password_hash = self.get_user_credentials()
        
        # Initialiser la base de données avec l'utilisateur
        self.init_database_with_user(username, password_hash)
        
        # Étape 6: Configuration services systemd
        self.log("=== ÉTAPE 6: Configuration services systemd ===", "INFO")
        self.create_systemd_services()
        
        # Étape 7: Configuration Nginx
        self.log("=== ÉTAPE 7: Configuration Nginx ===", "INFO")
        self.configure_nginx()
        
        # Étape 8: Permissions
        self.log("=== ÉTAPE 8: Configuration des permissions ===", "INFO")
        self.execute_command(
            "sudo chown -R llmui:llmui /opt/llmui-core",
            "Permissions installation",
            8
        )
        
        # Étape 9: Démarrage des services
        self.log("=== ÉTAPE 9: Démarrage des services ===", "INFO")
        self.execute_command("sudo systemctl enable llmui-backend", "Enable backend", 9)
        self.execute_command("sudo systemctl enable llmui-proxy", "Enable proxy", 9)
        self.execute_command("sudo systemctl start llmui-backend", "Start backend", 9)
        self.execute_command("sudo systemctl start llmui-proxy", "Start proxy", 9)
        self.execute_command("sudo systemctl reload nginx", "Reload nginx", 9)
        
        # Étape 10: Configuration pare-feu avec règles strictes
        self.log("=== ÉTAPE 9: Configuration pare-feu (sécurité) ===", "INFO")
        self.configure_firewall_strict()
        
        return True
    
    def create_systemd_services(self):
        """Crée les services systemd"""
        
        backend_service = """[Unit]
Description=LLMUI Core Backend Service
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=llmui
Group=llmui
WorkingDirectory=/opt/llmui-core
Environment="PATH=/opt/llmui-core/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=/opt/llmui-core/venv/bin/python /opt/llmui-core/src/llmui_backend.py
Restart=always
RestartSec=10
StandardOutput=append:/opt/llmui-core/logs/backend.log
StandardError=append:/opt/llmui-core/logs/backend-error.log

[Install]
WantedBy=multi-user.target
"""
        
        proxy_service = """[Unit]
Description=LLMUI Core Proxy Service
After=network.target llmui-backend.service
Requires=llmui-backend.service

[Service]
Type=simple
User=llmui
Group=llmui
WorkingDirectory=/opt/llmui-core
Environment="PATH=/opt/llmui-core/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=/opt/llmui-core/venv/bin/python /opt/llmui-core/src/llmui_proxy.py
Restart=always
RestartSec=10
StandardOutput=append:/opt/llmui-core/logs/proxy.log
StandardError=append:/opt/llmui-core/logs/proxy-error.log

[Install]
WantedBy=multi-user.target
"""
        
        # Écriture des fichiers
        with open("/tmp/llmui-backend.service", "w") as f:
            f.write(backend_service)
        
        with open("/tmp/llmui-proxy.service", "w") as f:
            f.write(proxy_service)
        
        # Créer le répertoire logs s'il n'existe pas
        self.execute_command(
            "sudo mkdir -p /opt/llmui-core/logs",
            "Création répertoire logs",
            6
        )
        
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
            print(f"🗄️ Base de données: /tmp/andy_installation.db")
            print(f"🌐 Dépôt GitHub: {GITHUB_REPO}")
            print("⚠️  IMPORTANT: Configurez SSL/HTTPS avant exposition publique!")
            print("="*60)
            sys.exit(0)
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