#!/usr/bin/env python3
"""
==============================================================================
Andy - Assistant DevOps Autonome v0.5.0
Installation automatisÃ©e de LLMUI Core
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
        self.max_retries = 20
        
    def call_ollama(self, prompt, max_tokens=500):
        """Appelle Ollama pour analyser et rÃ©soudre des problÃ¨mes"""
        try:
            # Essayer d'importer requests, sinon l'installer
            try:
                import requests
            except ImportError:
                self.log("ðŸ“¦ Installation de requests pour Andy...", "INFO")
                subprocess.run([sys.executable, "-m", "pip", "install", "requests"], 
                             capture_output=True, check=True)
                import requests
            
            url = f"{OLLAMA_BASE_URL}/api/generate"
            payload = {
                "model": self.llm_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": max_tokens
                }
            }
            
            self.log("ðŸ¤– Andy rÃ©flÃ©chit...", "INFO")
            # Augmenter le timeout Ã  180 secondes pour les analyses complexes
            response = requests.post(url, json=payload, timeout=180)
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response', '').strip()
            else:
                self.log(f"Erreur Ollama: {response.status_code}", "WARNING")
                return None
                
        except Exception as e:
            self.log(f"Impossible de contacter Ollama: {e}", "WARNING")
            return None
    
    def fix_requirements_txt(self, error_message, requirements_path="/opt/llmui-core/requirements.txt"):
        """Analyse l'erreur pip et corrige requirements.txt automatiquement"""
        
        self.log("ðŸ”§ Andy analyse l'erreur de dÃ©pendances...", "INFO")
        
        # DÃ©tecter la version de Python
        python_version = sys.version.split()[0]
        self.log(f"ðŸ Python version dÃ©tectÃ©e: {python_version}", "INFO")
        
        # Lire le requirements.txt actuel
        try:
            with open(requirements_path, 'r') as f:
                current_requirements = f.read()
        except Exception as e:
            self.log(f"Impossible de lire requirements.txt: {e}", "ERROR")
            return False
        
        # Construire le prompt pour Ollama
        prompt = f"""You are Andy, a DevOps AI assistant. A Python package installation failed.

PYTHON VERSION: {python_version}

ERROR MESSAGE:
{error_message[:2000]}

CURRENT requirements.txt:
{current_requirements}

ANALYSIS NEEDED:
1. Identify the root cause (version conflict, Python incompatibility, compilation error)
2. If Python 3.13 incompatibility: upgrade package versions
3. If compilation error (pydantic-core, etc): use newer versions with pre-built wheels
4. If version conflict: adjust constraints

OUTPUT FORMAT - Only provide fixes in this exact format:

FIXES:
package==old.version -> package>=new.version

Common fixes for Python 3.13:
- pydantic==2.5.0 -> pydantic>=2.10.0
- pydantic-settings==2.1.0 -> pydantic-settings>=2.7.0
- fastapi==0.104.1 -> fastapi>=0.115.0
- starlette==0.27.0 -> starlette>=0.41.0

For torch/torchvision version conflicts:
- torch>=2.0.1,<2.2.0 -> torch>=2.5.0
- torchvision>=0.15.2,<0.17.0 -> torchvision>=0.20.0

Now provide ONLY the fixes needed:"""

        # Appeler Ollama
        response = self.call_ollama(prompt, max_tokens=1000)
        
        if not response:
            self.log("Andy n'a pas pu analyser l'erreur avec Ollama", "WARNING")
            # Fallback: correction manuelle basique
            return self.apply_basic_fixes(error_message, requirements_path)
        
        self.log(f"ðŸ’¡ Analyse d'Andy:\n{response}", "INFO")
        
        # Parser la rÃ©ponse pour extraire les corrections
        fixes = []
        lines = response.split('\n')
        for line in lines:
            if '->' in line:
                parts = line.split('->')
                if len(parts) == 2:
                    old_line = parts[0].strip()
                    new_line = parts[1].strip()
                    # Nettoyer les lignes
                    old_line = old_line.replace('FIXES:', '').strip()
                    fixes.append((old_line, new_line))
        
        if not fixes:
            self.log("Andy n'a pas trouvÃ© de corrections dans la rÃ©ponse", "WARNING")
            return self.apply_basic_fixes(error_message, requirements_path)
        
        # Appliquer les corrections
        self.log(f"ðŸ“ Application de {len(fixes)} corrections...", "INFO")
        updated_requirements = current_requirements
        
        for old_line, new_line in fixes:
            if old_line in updated_requirements:
                updated_requirements = updated_requirements.replace(old_line, new_line)
                self.log(f"  âœ“ {old_line} â†’ {new_line}", "SUCCESS")
                
                # Enregistrer la correction dans la DB
                cursor = self.conn.cursor()
                cursor.execute(
                    "INSERT INTO corrections (original_command, corrected_command, reason) VALUES (?, ?, ?)",
                    (old_line, new_line, "Fix pip dependency version conflict")
                )
                self.conn.commit()
            else:
                self.log(f"  âš  Ligne non trouvÃ©e: {old_line}", "WARNING")
        
        # Sauvegarder le requirements.txt corrigÃ©
        try:
            # Backup de l'original
            backup_path = requirements_path + ".backup"
            with open(backup_path, 'w') as f:
                f.write(current_requirements)
            
            # Ã‰crire la version corrigÃ©e
            with open(requirements_path, 'w') as f:
                f.write(updated_requirements)
            
            self.log("âœ… requirements.txt corrigÃ© avec succÃ¨s", "SUCCESS")
            return True
            
        except Exception as e:
            self.log(f"Erreur lors de la sauvegarde: {e}", "ERROR")
            return False
    
    def apply_basic_fixes(self, error_message, requirements_path):
        """Applique des corrections basiques sans Ollama"""
        self.log("ðŸ”§ Application de corrections basiques...", "INFO")
        
        try:
            with open(requirements_path, 'r') as f:
                content = f.read()
            
            original_content = content
            
            # Corrections connues pour Python 3.13
            python_version = sys.version_info
            if python_version.major == 3 and python_version.minor >= 13:
                self.log("ðŸ Python 3.13 dÃ©tectÃ© - mise Ã  jour des packages", "INFO")
                
                # Corrections pour Python 3.13
                fixes = [
                    ("pydantic==2.5.0", "pydantic>=2.10.0"),
                    ("pydantic-settings==2.1.0", "pydantic-settings>=2.7.0"),
                    ("fastapi==0.104.1", "fastapi>=0.115.0"),
                    ("starlette==0.27.0", "starlette>=0.41.0"),
                    ("uvicorn[standard]==0.24.0", "uvicorn[standard]>=0.34.0"),
                ]
                
                for old, new in fixes:
                    if old in content:
                        content = content.replace(old, new)
                        self.log(f"  âœ“ {old} â†’ {new}", "SUCCESS")
            
            # Corrections pour torch
            if "torch" in error_message.lower() or "version" in error_message.lower():
                torch_fixes = [
                    ("torch>=2.0.1,<2.2.0", "torch>=2.5.0"),
                    ("torchvision>=0.15.2,<0.17.0", "torchvision>=0.20.0"),
                ]
                
                for old, new in torch_fixes:
                    if old in content:
                        content = content.replace(old, new)
                        self.log(f"  âœ“ {old} â†’ {new}", "SUCCESS")
            
            # Sauvegarder si des changements ont Ã©tÃ© faits
            if content != original_content:
                with open(requirements_path + ".backup", 'w') as f:
                    f.write(original_content)
                
                with open(requirements_path, 'w') as f:
                    f.write(content)
                
                self.log("âœ… Corrections basiques appliquÃ©es", "SUCCESS")
                return True
            else:
                self.log("âš ï¸ Aucune correction basique applicable", "WARNING")
                return False
                
        except Exception as e:
            self.log(f"Erreur lors des corrections basiques: {e}", "ERROR")
            return False
        
    def setup_database(self):
        """Initialise la base de donnÃ©es SQLite pour Andy"""
        self.conn = sqlite3.connect(self.db_path)
        cursor = self.conn.cursor()
        
        # Table pour les commandes Ã  exÃ©cuter
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
        
        # Table pour les corrections appliquÃ©es
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
        """Ajoute une note dans la base de donnÃ©es"""
        cursor = self.conn.cursor()
        cursor.execute("INSERT INTO andy_notes (note, context) VALUES (?, ?)", (note, context))
        self.conn.commit()
        
    def execute_command(self, command, step_name="", step_number=0, critical=False):
        """ExÃ©cute une commande et enregistre le rÃ©sultat"""
        self.log(f"ExÃ©cution: {command}", "CMD")
        
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
                    raise Exception(f"Commande critique Ã©chouÃ©e: {command}")
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
        """DÃ©tecte le gestionnaire de paquets"""
        if self.execute_command("command -v apt-get", "DÃ©tection apt")[0]:
            return "apt"
        elif self.execute_command("command -v dnf", "DÃ©tection dnf")[0]:
            return "dnf"
        elif self.execute_command("command -v yum", "DÃ©tection yum")[0]:
            return "yum"
        else:
            self.log("Gestionnaire de paquets non dÃ©tectÃ©", "ERROR")
            return None
    
    def check_python_version(self):
        """VÃ©rifie la version de Python"""
        success, output = self.execute_command("python3 --version", "VÃ©rification Python")
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
        """Installe Ollama et tÃ©lÃ©charge les modÃ¨les"""
        self.log("Installation d'Ollama...", "INFO")
        success, _ = self.execute_command(
            "curl -fsSL https://ollama.com/install.sh | sh",
            "Installation Ollama",
            3,
            critical=True
        )
        
        if not success:
            self.add_note("Ã‰chec installation Ollama", "Installation")
            return False
        
        # Pull des modÃ¨les
        models = ["phi3:3.8b", "gemma2:2b", "granite4:micro-h", "qwen2.5:3b"]
        for model in models:
            self.log(f"TÃ©lÃ©chargement du modÃ¨le {model}...", "INFO")
            success, _ = self.execute_command(
                f"ollama pull {model}",
                f"Pull modÃ¨le {model}",
                3
            )
            if not success:
                self.log(f"Ã‰chec du tÃ©lÃ©chargement de {model}", "WARNING")
        
        return True
    
    def get_user_credentials(self):
        """Demande les identifiants utilisateur pour LLMUI"""
        print("\n" + "="*60)
        print("ðŸ”‘ Configuration utilisateur LLMUI Interface")
        print("="*60)
        username = input("Nom d'utilisateur pour l'interface web [admin]: ").strip() or "admin"
        
        while True:
            password = getpass.getpass("Mot de passe pour l'interface web: ")
            if not password:
                print("âŒ Le mot de passe ne peut pas Ãªtre vide")
                continue
            if len(password) < 8:
                print("âŒ Le mot de passe doit contenir au moins 8 caractÃ¨res")
                continue
            
            password_confirm = getpass.getpass("Confirmez le mot de passe: ")
            if password == password_confirm:
                break
            else:
                print("âŒ Les mots de passe ne correspondent pas")
        
        # Hash du mot de passe
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        return username, password_hash
    
    def init_database_with_user(self, username, password_hash):
        """Initialise la base de donnÃ©es avec un utilisateur"""
        db_path = "/var/lib/llmui/llmui.db"
        
        self.execute_command(
            "sudo mkdir -p /var/lib/llmui /var/log/llmui",
            "CrÃ©ation rÃ©pertoires data",
            4
        )
        
        self.execute_command(
            f"sudo chown -R llmui:llmui /var/lib/llmui /var/log/llmui",
            "Permissions rÃ©pertoires",
            4
        )
        
        conn = sqlite3.connect(db_path)
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
        
        # Insérer l'utilisateur avec un UUID
        user_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT OR REPLACE INTO users (id, username, password_hash, is_admin) VALUES (?, ?, ?, 1)",
            (user_id, username, password_hash)
        )
        
        conn.commit()
        conn.close()
        
        self.execute_command(
            f"sudo chown llmui:llmui {db_path}",
            "Permissions base de donnÃ©es",
            4
        )
        
        self.log(f"Utilisateur '{username}' crÃ©Ã© avec succÃ¨s", "SUCCESS")
    
    def run_installation(self):
        """Processus d'installation principal"""
        self.log("="*60, "INFO")
        self.log("DÃ‰MARRAGE D'ANDY - Installation LLMUI-CORE v0.5.0", "INFO")
        self.log("="*60, "INFO")
        
        # Ã‰tape 1: VÃ©rification systÃ¨me
        self.log("=== Ã‰TAPE 1: VÃ©rification systÃ¨me ===", "INFO")
        if not self.check_python_version():
            self.log("Python 3.8+ requis", "ERROR")
            return False
        
        pkg_manager = self.detect_package_manager()
        if not pkg_manager:
            return False
        
        # Ã‰tape 2: Installation des dÃ©pendances
        self.log("=== Ã‰TAPE 2: Installation des dÃ©pendances ===", "INFO")
        
        if pkg_manager == "apt":
            self.execute_command("sudo apt-get update", "Update apt", 2)
            self.execute_command(
                "sudo apt-get install -y python3-pip python3-venv nginx git curl sqlite3",
                "Installation paquets",
                2,
                critical=True
            )
        elif pkg_manager in ["dnf", "yum"]:
            self.execute_command(
                f"sudo {pkg_manager} install -y python3-pip nginx git curl sqlite",
                "Installation paquets",
                2,
                critical=True
            )
        
        # Ã‰tape 3: Installation Ollama
        self.log("=== Ã‰TAPE 3: Installation Ollama et modÃ¨les ===", "INFO")
        if not self.install_ollama_and_models():
            return False
        
        # Ã‰tape 4: CrÃ©ation utilisateur systÃ¨me
        self.log("=== Ã‰TAPE 4: CrÃ©ation utilisateur systÃ¨me ===", "INFO")
        self.execute_command(
            "sudo useradd -r -s /bin/false -d /opt/llmui-core llmui 2>/dev/null || true",
            "CrÃ©ation utilisateur llmui",
            4
        )
        
        # Ã‰tape 5: Clonage du dÃ©pÃ´t
        self.log("=== Ã‰TAPE 5: Clonage du dÃ©pÃ´t GitHub ===", "INFO")
        
        # Nettoyage sÃ©lectif - prÃ©server andy_installer.py et scripts andy_*
        self.execute_command(
            "cd /opt/llmui-core && sudo find . -maxdepth 1 ! -name 'andy_*' ! -name '.' ! -name '..' -exec rm -rf {} + 2>/dev/null || true",
            "Nettoyage sÃ©lectif ancien install",
            5
        )
        
        success, _ = self.execute_command(
            f"sudo git clone {self.github_repo} /tmp/llmui-core-clone",
            "Clone dÃ©pÃ´t vers /tmp",
            5,
            critical=True
        )
        
        if not success:
            self.log("Ã‰chec du clonage du dÃ©pÃ´t", "ERROR")
            return False
        
        # Copier les fichiers du clone vers /opt/llmui-core
        self.execute_command(
            "sudo cp -r /tmp/llmui-core-clone/* /opt/llmui-core/",
            "Copie fichiers vers /opt/llmui-core",
            5,
            critical=True
        )
        
        # Nettoyer le clone temporaire
        self.execute_command(
            "sudo rm -rf /tmp/llmui-core-clone",
            "Nettoyage clone temporaire",
            5
        )
        
        # Ã‰tape 5b: Installation Python venv et dÃ©pendances
        self.log("=== Ã‰TAPE 5b: Installation environnement Python ===", "INFO")
        
        # CrÃ©er le venv sans sudo (en tant qu'utilisateur courant)
        self.execute_command(
            "cd /opt/llmui-core && python3 -m venv venv",
            "CrÃ©ation venv",
            5,
            critical=True
        )
        
        # Upgrade pip
        self.execute_command(
            "cd /opt/llmui-core && venv/bin/pip install --upgrade pip",
            "Upgrade pip",
            5
        )
        
        # Installer les dÃ©pendances avec retry intelligent
        self.log("ðŸ“¦ Installation des dÃ©pendances Python avec auto-correction...", "INFO")
        pip_success = False
        retry_count = 0
        
        while not pip_success and retry_count < self.max_retries:
            if retry_count > 0:
                self.log(f"ðŸ”„ Tentative {retry_count + 1}/{self.max_retries}...", "INFO")
            
            success, error_output = self.execute_command(
                "cd /opt/llmui-core && venv/bin/pip install -r requirements.txt",
                "Installation dÃ©pendances Python",
                5,
                critical=False  # Ne pas Ã©chouer immÃ©diatement
            )
            
            if success:
                pip_success = True
                self.log("âœ… DÃ©pendances Python installÃ©es avec succÃ¨s!", "SUCCESS")
                break
            else:
                retry_count += 1
                self.log(f"âŒ Ã‰chec de l'installation (tentative {retry_count})", "WARNING")
                
                if retry_count < self.max_retries:
                    # Andy analyse l'erreur et tente de corriger
                    self.log("ðŸ¤– Andy va analyser et corriger l'erreur...", "INFO")
                    
                    if self.fix_requirements_txt(error_output):
                        self.log("âœ… Corrections appliquÃ©es, nouvelle tentative...", "INFO")
                        time.sleep(2)  # Petit dÃ©lai avant retry
                    else:
                        self.log("âš ï¸ Andy n'a pas pu corriger automatiquement", "WARNING")
                        break
                else:
                    self.log("âŒ Ã‰chec aprÃ¨s 20 tentatives", "ERROR")
                    raise Exception("Installation des dÃ©pendances Python Ã©chouÃ©e aprÃ¨s corrections automatiques")
        
        # Fixer les permissions aprÃ¨s installation
        self.execute_command(
            "sudo chown -R llmui:llmui /opt/llmui-core/venv",
            "Permissions venv",
            5
        )
        
        # Get user credentials APRÃˆS avoir clonÃ© le dÃ©pÃ´t
        username, password_hash = self.get_user_credentials()
        
        # Initialiser la base de donnÃ©es avec l'utilisateur
        self.init_database_with_user(username, password_hash)
        
        # Ã‰tape 6: Configuration services systemd
        self.log("=== Ã‰TAPE 6: Configuration services systemd ===", "INFO")
        self.create_systemd_services()
        
        # Ã‰tape 7: Configuration Nginx
        self.log("=== Ã‰TAPE 7: Configuration Nginx ===", "INFO")
        self.configure_nginx()
        
        # Ã‰tape 8: Permissions
        self.log("=== Ã‰TAPE 8: Configuration des permissions ===", "INFO")
        self.execute_command(
            "sudo chown -R llmui:llmui /opt/llmui-core",
            "Permissions installation",
            8
        )
        
        # Ã‰tape 9: DÃ©marrage des services
        self.log("=== Ã‰TAPE 9: DÃ©marrage des services ===", "INFO")
        self.execute_command("sudo systemctl enable llmui-backend", "Enable backend", 9)
        self.execute_command("sudo systemctl enable llmui-proxy", "Enable proxy", 9)
        self.execute_command("sudo systemctl start llmui-backend", "Start backend", 9)
        self.execute_command("sudo systemctl start llmui-proxy", "Start proxy", 9)
        self.execute_command("sudo systemctl reload nginx", "Reload nginx", 9)
        
        # Ã‰tape 10: Configuration pare-feu avec rÃ¨gles strictes
        self.log("=== Ã‰TAPE 9: Configuration pare-feu (sÃ©curitÃ©) ===", "INFO")
        self.configure_firewall_strict()
        
        return True
    
    def create_systemd_services(self):
        """CrÃ©e les services systemd"""
        
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
        
        # Ã‰criture des fichiers
        with open("/tmp/llmui-backend.service", "w") as f:
            f.write(backend_service)
        
        with open("/tmp/llmui-proxy.service", "w") as f:
            f.write(proxy_service)
        
        # CrÃ©er le rÃ©pertoire logs s'il n'existe pas
        self.execute_command(
            "sudo mkdir -p /opt/llmui-core/logs",
            "CrÃ©ation rÃ©pertoire logs",
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
        
        self.log("Services systemd crÃ©Ã©s", "SUCCESS")
    
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
            self.log("Nginx configurÃ© avec succÃ¨s", "SUCCESS")
        else:
            self.log("Erreur dans la config Nginx", "ERROR")
    
    def configure_firewall_strict(self):
        """Configure le pare-feu avec rÃ¨gles strictes de sÃ©curitÃ©"""
        
        # DÃ©tection du pare-feu
        if self.execute_command("command -v ufw", "DÃ©tection UFW")[0]:
            self.log("Configuration UFW avec rÃ¨gles strictes...", "INFO")
            self.execute_command("sudo ufw --force enable", "Activation UFW", 8)
            self.execute_command("sudo ufw default deny incoming", "UFW deny incoming", 8)
            self.execute_command("sudo ufw default allow outgoing", "UFW allow outgoing", 8)
            
            # RÃ¨gles publiques
            self.execute_command("sudo ufw allow 22/tcp", "UFW allow SSH", 8)
            self.execute_command("sudo ufw allow 80/tcp", "UFW allow HTTP", 8)
            self.execute_command("sudo ufw allow 443/tcp", "UFW allow HTTPS", 8)
            
            # RÃ¨gles localhost only pour ports internes
            self.execute_command("sudo ufw allow from 127.0.0.1 to any port 5000 proto tcp", "UFW backend localhost only", 8)
            self.execute_command("sudo ufw allow from 127.0.0.1 to any port 8080 proto tcp", "UFW proxy localhost only", 8)
            self.execute_command("sudo ufw allow from 127.0.0.1 to any port 11434 proto tcp", "UFW Ollama localhost only", 8)
            
            self.execute_command("sudo ufw reload", "UFW reload", 8)
            self.log("UFW configurÃ© avec rÃ¨gles strictes", "SUCCESS")
            
        elif self.execute_command("command -v firewall-cmd", "DÃ©tection firewalld")[0]:
            self.log("Configuration firewalld avec rÃ¨gles strictes...", "INFO")
            self.execute_command("sudo systemctl enable --now firewalld", "Activation firewalld", 8)
            
            # RÃ¨gles publiques
            self.execute_command("sudo firewall-cmd --permanent --add-service=ssh", "Firewalld allow SSH", 8)
            self.execute_command("sudo firewall-cmd --permanent --add-service=http", "Firewalld allow HTTP", 8)
            self.execute_command("sudo firewall-cmd --permanent --add-service=https", "Firewalld allow HTTPS", 8)
            
            # RÃ¨gles localhost only
            self.execute_command("sudo firewall-cmd --permanent --add-rich-rule='rule family=\"ipv4\" source address=\"127.0.0.1\" port port=\"5000\" protocol=\"tcp\" accept'", "Firewalld backend localhost", 8)
            self.execute_command("sudo firewall-cmd --permanent --add-rich-rule='rule family=\"ipv4\" source address=\"127.0.0.1\" port port=\"8080\" protocol=\"tcp\" accept'", "Firewalld proxy localhost", 8)
            self.execute_command("sudo firewall-cmd --permanent --add-rich-rule='rule family=\"ipv4\" source address=\"127.0.0.1\" port port=\"11434\" protocol=\"tcp\" accept'", "Firewalld Ollama localhost", 8)
            
            self.execute_command("sudo firewall-cmd --reload", "Firewalld reload", 8)
            self.log("Firewalld configurÃ© avec rÃ¨gles strictes", "SUCCESS")
        else:
            self.log("âš ï¸  Aucun pare-feu dÃ©tectÃ© - configuration manuelle recommandÃ©e", "WARNING")
    
    def verify_installation(self):
        """VÃ©rifie que l'installation de base fonctionne"""
        self.log("=== VÃ‰RIFICATION POST-INSTALLATION ===", "INFO")
        
        checks = [
            ("test -d /opt/llmui-core", "RÃ©pertoire installation"),
            ("test -f /var/lib/llmui/llmui.db", "Base de donnÃ©es"),
            ("test -f /etc/systemd/system/llmui-backend.service", "Service backend crÃ©Ã©"),
            ("test -f /etc/systemd/system/llmui-proxy.service", "Service proxy crÃ©Ã©"),
            ("test -f /etc/nginx/sites-available/llmui", "Config Nginx"),
            ("sudo systemctl is-active nginx", "Service nginx")
        ]
        
        all_ok = True
        for cmd, name in checks:
            success, output = self.execute_command(cmd, f"VÃ©rif {name}", 10)
            if success:
                self.log(f"âœ“ {name} OK", "SUCCESS")
            else:
                self.log(f"âœ— {name} Ã‰CHEC", "ERROR")
                all_ok = False
        
        return all_ok
    
    def cleanup(self):
        """Nettoyage et fermeture"""
        if self.conn:
            self.conn.close()
        self.log("Andy a terminÃ© son travail", "INFO")

def main():
    andy = Andy()
    try:
        if andy.run_installation():
            andy.verify_installation()
            print("\n" + "="*60)
            print("âœ… Installation terminÃ©e!")
            print("="*60)
            print(f"ðŸ“‹ Logs: /tmp/andy_install.log")
            print(f"ðŸ—„ï¸ Base de donnÃ©es: /tmp/andy_installation.db")
            print(f"ðŸŒ DÃ©pÃ´t GitHub: {GITHUB_REPO}")
            print("âš ï¸  IMPORTANT: Configurez SSL/HTTPS avant exposition publique!")
            print("="*60)
        else:
            print("\nâŒ Installation Ã©chouÃ©e. Consultez les logs.")
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
        print("Ce script doit Ãªtre exÃ©cutÃ© en tant que root (sudo)")
        sys.exit(1)
    main()
