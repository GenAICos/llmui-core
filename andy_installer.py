#!/usr/bin/env python3
"""
==============================================================================
Andy - Assistant DevOps Autonome v0.5.1
Installation automatisée de LLMUI Core
==============================================================================
Auteur: Francois Chalut
Date: 2025-11-22
Licence: AGPLv3 + common clause

CORRECTIFS v0.5.1:
- FIX: Schéma de base de données compatible avec llmui_backend.py
- FIX: Installation de toutes les dépendances FastAPI requises
- FIX: Ajout des colonnes processing_time dans conversations
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
        """Appelle Ollama pour analyser et résoudre des problèmes"""
        try:
            # Essayer d'importer requests, sinon l'installer
            try:
                import requests
            except ImportError:
                self.log("📦 Installation de requests pour Andy...", "INFO")
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
            
            self.log("🤔 Andy réfléchit...", "INFO")
            # Augmenter le timeout à 180 secondes pour les analyses complexes
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
        
        self.log("🔧 Andy analyse l'erreur de dépendances...", "INFO")
        
        # Détecter la version de Python
        python_version = sys.version.split()[0]
        self.log(f"🐍 Python version détectée: {python_version}", "INFO")
        
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
        
        self.log(f"💡 Analyse d'Andy:\n{response}", "INFO")
        
        # Parser la réponse pour extraire les corrections
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
            self.log("Andy n'a pas trouvé de corrections dans la réponse", "WARNING")
            return self.apply_basic_fixes(error_message, requirements_path)
        
        # Appliquer les corrections
        self.log(f"📝 Application de {len(fixes)} corrections...", "INFO")
        updated_requirements = current_requirements
        
        for old_line, new_line in fixes:
            if old_line in updated_requirements:
                updated_requirements = updated_requirements.replace(old_line, new_line)
                self.log(f"  ✅ {old_line} → {new_line}", "SUCCESS")
                
                # Enregistrer la correction dans la DB
                cursor = self.conn.cursor()
                cursor.execute(
                    "INSERT INTO corrections (original_command, corrected_command, reason) VALUES (?, ?, ?)",
                    (old_line, new_line, "Fix pip dependency version conflict")
                )
                self.conn.commit()
            else:
                self.log(f"  ⚠️ Ligne non trouvée: {old_line}", "WARNING")
        
        # Sauvegarder le requirements.txt corrigé
        try:
            # Backup de l'original
            backup_path = requirements_path + ".backup"
            with open(backup_path, 'w') as f:
                f.write(current_requirements)
            
            # Écrire la version corrigée
            with open(requirements_path, 'w') as f:
                f.write(updated_requirements)
            
            self.log("✅ requirements.txt corrigé avec succès", "SUCCESS")
            return True
            
        except Exception as e:
            self.log(f"Erreur lors de la sauvegarde: {e}", "ERROR")
            return False
    
    def apply_basic_fixes(self, error_message, requirements_path):
        """Applique des corrections basiques sans Ollama"""
        self.log("🔧 Application de corrections basiques...", "INFO")
        
        try:
            with open(requirements_path, 'r') as f:
                content = f.read()
            
            original_content = content
            
            # Corrections connues pour Python 3.13
            python_version = sys.version_info
            if python_version >= (3, 13):
                self.log("Python 3.13 détecté - application de corrections spécifiques", "INFO")
                
                fixes = [
                    ("pydantic==2.5.0", "pydantic>=2.10.0"),
                    ("pydantic-settings==2.1.0", "pydantic-settings>=2.7.0"),
                    ("fastapi==0.104.1", "fastapi>=0.115.0"),
                    ("starlette==0.27.0", "starlette>=0.41.0"),
                ]
                
                for old, new in fixes:
                    if old in content:
                        content = content.replace(old, new)
                        self.log(f"  ✅ {old} → {new}", "SUCCESS")
            
            # Correction pour torch/torchvision version conflicts
            if "torchvision" in error_message.lower() or "torch" in error_message.lower():
                self.log("Conflit torch détecté - mise à jour des versions", "INFO")
                
                torch_fixes = [
                    ("torch>=2.0.1,<2.2.0", "torch>=2.5.0"),
                    ("torchvision>=0.15.2,<0.17.0", "torchvision>=0.20.0"),
                ]
                
                for old, new in torch_fixes:
                    if old in content:
                        content = content.replace(old, new)
                        self.log(f"  ✅ {old} → {new}", "SUCCESS")
            
            # Sauvegarder si des changements ont été faits
            if content != original_content:
                with open(requirements_path + ".backup", 'w') as f:
                    f.write(original_content)
                
                with open(requirements_path, 'w') as f:
                    f.write(content)
                
                self.log("✅ Corrections basiques appliquées", "SUCCESS")
                return True
            else:
                self.log("⚠️ Aucune correction basique applicable", "WARNING")
                return False
                
        except Exception as e:
            self.log(f"Erreur lors des corrections basiques: {e}", "ERROR")
            return False
        
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
        
        # DÉMARRAGE du service Ollama
        self.log("Démarrage du service Ollama...", "INFO")
        success, _ = self.execute_command(
            "sudo systemctl start ollama",
            "Démarrage service Ollama",
            3
        )
        
        if not success:
            self.log("⚠️ Impossible de démarrer Ollama via systemctl, tentative manuelle...", "WARNING")
            # Tentative de démarrage manuel en arrière-plan
            self.execute_command(
                "ollama serve > /tmp/ollama.log 2>&1 &",
                "Démarrage manuel Ollama",
                3
            )
        
        # ⏰ ATTENTE CRITIQUE - Ollama a besoin de temps pour démarrer
        self.log("⏳ Attente de 60 secondes pour le démarrage complet d'Ollama...", "INFO")
        for i in range(60):
            time.sleep(1)
            if i % 10 == 0:  # Afficher un message toutes les 10 secondes
                self.log(f"⏰ Attente Ollama... {60-i} secondes restantes", "INFO")
        
        # Vérification que Ollama répond
        self.log("Vérification qu'Ollama est opérationnel...", "INFO")
        success, output = self.execute_command(
            "curl -s http://localhost:11434/api/tags",
            "Test connexion Ollama",
            3
        )
        
        if not success:
            self.log("⚠️ Ollama ne répond pas encore, tentative supplémentaire dans 30 secondes...", "WARNING")
            time.sleep(30)
            success, output = self.execute_command(
                "curl -s http://localhost:11434/api/tags",
                "Test reconnexion Ollama",
                3
            )
        
        if success:
            self.log("✅ Ollama est opérationnel et prêt pour les téléchargements", "SUCCESS")
        else:
            self.log("❌ Ollama ne répond toujours pas après 90 secondes", "ERROR")
            self.add_note("Ollama ne répond pas après installation", "Installation")
            return False
        
        # Pull des modèles - MAINTENANT Ollama devrait être prêt
        models = ["phi3:3.8b", "gemma2:2b", "granite3.1:2b", "qwen2.5:3b"]
        for model in models:
            self.log(f"📥 Téléchargement du modèle {model}...", "INFO")
            success, output = self.execute_command(
                f"ollama pull {model}",
                f"Pull modèle {model}",
                3
            )
            if success:
                self.log(f"✅ Modèle {model} téléchargé avec succès", "SUCCESS")
            else:
                self.log(f"❌ Échec du téléchargement de {model}", "WARNING")
                if "server not responding" in output:
                    self.log(f"🔧 Problème de connexion à Ollama pour {model}", "ERROR")
        
        return True
    
    def hash_password_secure(self, password):
        """Hash sécurisé du mot de passe avec bcrypt"""
        try:
            import bcrypt
            salt = bcrypt.gensalt()
            return bcrypt.hashpw(password.encode(), salt).decode()
        except ImportError:
            self.log("⚠️ bcrypt non disponible, fallback vers PBKDF2", "WARNING")
            # Fallback sécurisé si bcrypt n'est pas disponible
            import hashlib
            import os
            import binascii
            salt = os.urandom(32)
            key = hashlib.pbkdf2_hmac(
                'sha256', 
                password.encode(), 
                salt, 
                100000  # 100,000 itérations
            )
            return binascii.hexlify(salt + key).decode()
    
    def is_strong_password(self, password):
        """Vérifie la complexité du mot de passe"""
        if len(password) < 8:
            return False, "Le mot de passe doit contenir au moins 8 caractères"
        
        checks = [
            (r'[A-Z]', "au moins une majuscule"),
            (r'[a-z]', "au moins une minuscule"), 
            (r'\d', "au moins un chiffre"),
            (r'[!@#$%^&*(),.?":{}|<>]', "au moins un caractère spécial")
        ]
        
        for pattern, message in checks:
            if not re.search(pattern, password):
                return False, f"Le mot de passe doit contenir {message}"
        
        return True, "Mot de passe valide"
    
    def get_user_credentials(self):
        """Demande les identifiants utilisateur pour LLMUI"""
        print("\n" + "="*60)
        print("🔑 Configuration utilisateur LLMUI Interface")
        print("="*60)
        username = input("Nom d'utilisateur pour l'interface web [admin]: ").strip() or "admin"
        
        while True:
            password = getpass.getpass("Mot de passe pour l'interface web: ")
            if not password:
                print("❌ Le mot de passe ne peut pas être vide")
                continue
            
            # Vérification de la robustesse
            is_strong, message = self.is_strong_password(password)
            if not is_strong:
                print(f"❌ {message}")
                continue
            
            password_confirm = getpass.getpass("Confirmez le mot de passe: ")
            if password == password_confirm:
                break
            else:
                print("❌ Les mots de passe ne correspondent pas")
        
        # Hash sécurisé du mot de passe
        password_hash = self.hash_password_secure(password)
        
        return username, password_hash
    
    def init_database_with_user(self, username, password_hash):
        """
        Initialise la base de données avec le schéma EXACT de llmui_backend.py
        CORRECTIF v0.5.1: Schéma compatible avec processing_time
        """
        db_path = "/var/lib/llmui/llmui.db"
        
        self.execute_command(
            "sudo mkdir -p /var/lib/llmui /var/log/llmui",
            "Création répertoires data",
            4
        )
        
        self.execute_command(
            f"sudo chown -R llmui:llmui /var/lib/llmui /var/log/llmui",
            "Permissions répertoires",
            4
        )
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Table users - pour l'authentification web
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
        
        # Table conversations - SCHÉMA EXACT de llmui_backend.py avec processing_time
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
        
        # Table messages - pour le contexte conversationnel
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        
        # Table embeddings - pour la recherche sémantique
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
        
        # Table stats - pour les statistiques d'utilisation
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
        
        # Table sessions - pour la gestion des sessions web
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
            "Permissions base de données",
            4
        )
        
        self.log(f"Utilisateur '{username}' créé avec succès", "SUCCESS")
        self.log("✅ Base de données initialisée avec schéma compatible llmui_backend.py", "SUCCESS")
    
    def run_installation(self):
        """Processus d'installation principal"""
        self.log("="*60, "INFO")
        self.log("DÉMARRAGE D'ANDY - Installation LLMUI-CORE v0.5.1", "INFO")
        self.log("="*60, "INFO")
        
        # Étape 1: Vérification système
        self.log("=== ÉTAPE 1: Vérification système ===", "INFO")
        if not self.check_python_version():
            self.log("Python 3.8+ requis", "ERROR")
            return False
        
        pkg_manager = self.detect_package_manager()
        if not pkg_manager:
            return False
        
        # Étape 2: Installation des dépendances
        self.log("=== ÉTAPE 2: Installation des dépendances ===", "INFO")
        
        if pkg_manager == "apt":
            self.execute_command("sudo apt-get update", "Update apt", 2)
            self.execute_command(
                "sudo apt-get install -y python3-pip python3-venv nginx git curl sqlite3 build-essential python3-dev",
                "Installation paquets",
                2,
                critical=True
            )
        elif pkg_manager in ["dnf", "yum"]:
            self.execute_command(
                f"sudo {pkg_manager} install -y python3-pip nginx git curl sqlite gcc python3-devel",
                "Installation paquets",
                2,
                critical=True
            )
        
        # Étape 3: Installation Ollama
        self.log("=== ÉTAPE 3: Installation Ollama et modèles ===", "INFO")
        if not self.install_ollama_and_models():
            return False
        
        # Étape 4: Création utilisateur système
        self.log("=== ÉTAPE 4: Création utilisateur système ===", "INFO")
        self.execute_command(
            "sudo useradd -r -s /bin/false -d /opt/llmui-core llmui 2>/dev/null || true",
            "Création utilisateur llmui",
            4
        )
        
        # Étape 5: Création de la structure de base
        self.log("=== ÉTAPE 5: Création structure de base ===", "INFO")
        
        self.execute_command(
            "sudo mkdir -p /opt/llmui-core/{src,web,logs,scripts}",
            "Création structure répertoires",
            5
        )
        
        # Étape 5b: Installation Python venv et dépendances CRITIQUES
        self.log("=== ÉTAPE 5b: Installation environnement Python ===", "INFO")
        
        # Créer le venv
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
        
        # CORRECTIF v0.5.1: Installer TOUTES les dépendances critiques immédiatement
        self.log("📦 Installation des dépendances critiques Python...", "INFO")
        
        critical_packages = [
            "fastapi>=0.115.0",
            "uvicorn[standard]>=0.30.0",
            "pydantic>=2.10.0",
            "pydantic-settings>=2.7.0",
            "httpx>=0.27.0",
            "python-multipart>=0.0.9",
            "bcrypt>=4.2.0",
            "pytz>=2024.1"
        ]
        
        for package in critical_packages:
            success, _ = self.execute_command(
                f"cd /opt/llmui-core && venv/bin/pip install '{package}'",
                f"Installation {package.split('>=')[0]}",
                5
            )
            if not success:
                self.log(f"⚠️ Échec installation {package}, sera retentée plus tard", "WARNING")
        
        # Fixer les permissions après installation
        self.execute_command(
            "sudo chown -R llmui:llmui /opt/llmui-core/venv",
            "Permissions venv",
            5
        )
        
        # Get user credentials
        username, password_hash = self.get_user_credentials()
        
        # Initialiser la base de données avec l'utilisateur ET le bon schéma
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
        
        # Étape 9: Configuration pare-feu avec règles strictes
        self.log("=== ÉTAPE 9: Configuration pare-feu (sécurité) ===", "INFO")
        self.configure_firewall_strict()
        
        self.log("\n✅ Installation de base terminée avec succès!", "SUCCESS")
        self.log("⚠️  Prochaine étape: sudo python3 andy_deploy_source.py", "INFO")
        
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
            6
        )
        
        self.log("Services systemd créés", "SUCCESS")
    
    def configure_nginx(self):
        """Configure Nginx comme reverse proxy"""
        
        nginx_config = """# LLMUI Core - Nginx Configuration
# Generated by Andy v0.5.1

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
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
                self.log(f"✅ {name} OK", "SUCCESS")
            else:
                self.log(f"❌ {name} ÉCHEC", "ERROR")
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
            print("✅ Installation de base terminée!")
            print("="*60)
            print(f"📋 Logs: /tmp/andy_install.log")
            print(f"🗃️ Base de données: /tmp/andy_installation.db")
            print(f"🌐 Dépôt GitHub: {GITHUB_REPO}")
            print("\n⚠️  PROCHAINES ÉTAPES:")
            print("   1. sudo python3 andy_deploy_source.py")
            print("   2. sudo python3 andy_start_services.py")
            print("="*60)
            return 0  # Code de retour succès
        else:
            print("\n❌ Installation échouée. Consultez les logs.")
            return 1  # Code de retour échec
    except KeyboardInterrupt:
        andy.log("Installation interrompue par l'utilisateur", "WARNING")
        return 1
    except Exception as e:
        andy.log(f"Erreur fatale: {str(e)}", "ERROR")
        import traceback
        andy.log(traceback.format_exc(), "ERROR")
        return 1
    finally:
        andy.cleanup()

if __name__ == "__main__":
    if os.geteuid() != 0:
        print("Ce script doit être exécuté en tant que root (sudo)")
        sys.exit(1)
    sys.exit(main())
