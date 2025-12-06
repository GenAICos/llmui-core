#!/usr/bin/env python3
"""
==============================================================================
Andy - Assistant DevOps Autonome v0.5.0
Installation automatisée COMPLÈTE de LLMUI Core
==============================================================================
Auteur: Francois Chalut
Date: 2025-11-22
Licence: AGPLv3 + common clause

NOUVEAUTÉS v0.5.0:
- Merge complet de andy_deploy_source.py dans andy_installer.py
- Installation complète en une seule exécution
- Gestion automatique de toutes les dépendances
- Déploiement des sources inclus
- Détection et résolution des problèmes Python 3.13
- Installation automatique de Python 3.11/3.12 si nécessaire
- Stratégie de changement de version Python intelligente
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
import shutil
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
        self.python_cmd = "python3"  # Commande Python à utiliser
        self.venv_recreated = False  # Flag pour éviter les boucles infinies
        
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
    
    def detect_python_compilation_issue(self, error_message):
        """Détecte si l'erreur est liée à une incompatibilité Python 3.13"""
        python_313_indicators = [
            "ForwardRef._evaluate() missing 1 required keyword-only argument: 'recursive_guard'",
            "pydantic-core",
            "maturin failed",
            "Failed building wheel",
            "Py_3_13",
            "generate_self_schema.py"
        ]
        
        indicators_found = sum(1 for indicator in python_313_indicators if indicator in error_message)
        return indicators_found >= 2
    
    def get_available_python_versions(self):
        """Détecte les versions de Python disponibles sur le système"""
        versions = []
        for cmd in ["python3.12", "python3.11", "python3.10", "python3"]:
            success, output = self.execute_command(f"{cmd} --version 2>&1", f"Détection {cmd}")
            if success and output:
                version_match = re.search(r'Python (\d+\.\d+)', output)
                if version_match:
                    version = version_match.group(1)
                    versions.append((cmd, version))
        return versions
    
    def install_python_from_source(self, target_version="3.12.8"):
        """Compile et installe Python depuis les sources"""
        self.log(f"🔨 Compilation de Python {target_version} depuis les sources...", "INFO")
        self.log("⏰ Cette opération prendra environ 5-10 minutes", "INFO")
        
        # Dépendances pour compiler Python
        pkg_manager = self.detect_package_manager()
        
        if pkg_manager == "apt":
            self.log("📦 Installation des dépendances de compilation...", "INFO")
            self.execute_command(
                "sudo apt-get install -y build-essential zlib1g-dev libncurses5-dev libgdbm-dev libnss3-dev libssl-dev libreadline-dev libffi-dev libsqlite3-dev wget libbz2-dev liblzma-dev",
                "Installation dépendances compilation Python",
                2
            )
        elif pkg_manager in ["dnf", "yum"]:
            self.execute_command(
                f"sudo {pkg_manager} install -y gcc zlib-devel bzip2 bzip2-devel readline-devel sqlite sqlite-devel openssl-devel tk-devel libffi-devel xz-devel wget",
                "Installation dépendances compilation Python",
                2
            )
        
        # Télécharger Python
        python_url = f"https://www.python.org/ftp/python/{target_version}/Python-{target_version}.tgz"
        download_dir = "/tmp/python-source"
        
        self.execute_command(f"mkdir -p {download_dir}", "Création répertoire téléchargement", 2)
        
        self.log(f"📥 Téléchargement de Python {target_version}...", "INFO")
        success, _ = self.execute_command(
            f"cd {download_dir} && wget {python_url}",
            f"Téléchargement Python {target_version}",
            2
        )
        
        if not success:
            self.log(f"❌ Échec du téléchargement de Python {target_version}", "ERROR")
            return False
        
        # Extraire l'archive
        self.log("📦 Extraction de l'archive...", "INFO")
        self.execute_command(
            f"cd {download_dir} && tar -xzf Python-{target_version}.tgz",
            "Extraction archive Python",
            2
        )
        
        # Compiler et installer
        self.log("🔨 Compilation de Python (cela peut prendre 5-10 minutes)...", "INFO")
        major_minor = '.'.join(target_version.split('.')[:2])
        
        compile_commands = f"""
cd {download_dir}/Python-{target_version}
./configure --enable-optimizations --prefix=/usr/local/python{major_minor}
make -j$(nproc)
sudo make altinstall
"""
        
        success, _ = self.execute_command(
            compile_commands,
            f"Compilation Python {target_version}",
            2
        )
        
        if not success:
            self.log(f"❌ Échec de la compilation de Python {target_version}", "ERROR")
            return False
        
        # Vérifier l'installation
        python_binary = f"/usr/local/python{major_minor}/bin/python{major_minor}"
        success, output = self.execute_command(
            f"{python_binary} --version",
            "Vérification Python compilé",
            2
        )
        
        if success:
            self.python_cmd = python_binary
            self.log(f"✅ Python {target_version} compilé et installé avec succès à {python_binary}", "SUCCESS")
            
            # Créer un lien symbolique pour faciliter l'utilisation
            self.execute_command(
                f"sudo ln -sf {python_binary} /usr/local/bin/python{major_minor}",
                "Création lien symbolique",
                2
            )
            
            # Nettoyer
            self.log("🧹 Nettoyage des fichiers temporaires...", "INFO")
            self.execute_command(f"rm -rf {download_dir}", "Nettoyage", 2)
            
            return True
        else:
            self.log(f"❌ Python compilé mais non fonctionnel", "ERROR")
            return False
    
    def install_python_version(self, target_version="3.12"):
        """Installe une version spécifique de Python"""
        self.log(f"🐍 Installation de Python {target_version}...", "INFO")
        
        pkg_manager = self.detect_package_manager()
        
        if pkg_manager == "apt":
            # Ajouter le PPA deadsnakes pour Python
            self.execute_command(
                "sudo apt-get update",
                "Update apt",
                2
            )
            self.execute_command(
                "sudo apt-get install -y software-properties-common",
                "Installation software-properties-common",
                2
            )
            
            # Tenter d'ajouter le PPA
            success_ppa, _ = self.execute_command(
                "sudo add-apt-repository -y ppa:deadsnakes/ppa",
                "Ajout PPA deadsnakes",
                2
            )
            
            success_update, error_update = self.execute_command(
                "sudo apt-get update",
                "Update apt avec PPA",
                2
            )
            
            # Vérifier si le PPA est disponible pour cette distribution
            if not success_update or "does not have a Release file" in error_update:
                self.log("⚠️ PPA deadsnakes non disponible pour cette distribution", "WARNING")
                self.log("🔄 Basculement vers la compilation depuis les sources...", "INFO")
                
                # Mapper la version mineure vers une version patch complète
                version_map = {
                    "3.12": "3.12.8",
                    "3.11": "3.11.11",
                    "3.10": "3.10.16"
                }
                
                full_version = version_map.get(target_version, f"{target_version}.0")
                return self.install_python_from_source(full_version)
            
            # Installer Python depuis le PPA
            success, _ = self.execute_command(
                f"sudo apt-get install -y python{target_version} python{target_version}-venv python{target_version}-dev",
                f"Installation Python {target_version}",
                2
            )
            
            if success:
                self.python_cmd = f"python{target_version}"
                self.log(f"✅ Python {target_version} installé avec succès", "SUCCESS")
                return True
            else:
                self.log(f"❌ Échec installation Python {target_version} via PPA", "ERROR")
                self.log("🔄 Tentative de compilation depuis les sources...", "INFO")
                
                version_map = {
                    "3.12": "3.12.8",
                    "3.11": "3.11.11",
                    "3.10": "3.10.16"
                }
                
                full_version = version_map.get(target_version, f"{target_version}.0")
                return self.install_python_from_source(full_version)
                
        elif pkg_manager in ["dnf", "yum"]:
            success, _ = self.execute_command(
                f"sudo {pkg_manager} install -y python{target_version.replace('.', '')} python{target_version.replace('.', '')}-devel",
                f"Installation Python {target_version}",
                2
            )
            
            if success:
                self.python_cmd = f"python{target_version}"
                self.log(f"✅ Python {target_version} installé avec succès", "SUCCESS")
                return True
            else:
                self.log(f"❌ Échec installation Python {target_version}", "ERROR")
                self.log("🔄 Tentative de compilation depuis les sources...", "INFO")
                
                version_map = {
                    "3.12": "3.12.8",
                    "3.11": "3.11.11",
                    "3.10": "3.10.16"
                }
                
                full_version = version_map.get(target_version, f"{target_version}.0")
                return self.install_python_from_source(full_version)
        
        return False
    
    def recreate_venv_with_compatible_python(self):
        """Recrée le venv avec une version compatible de Python"""
        self.log("🔄 Recréation du venv avec Python compatible...", "INFO")
        
        # Supprimer l'ancien venv
        self.execute_command(
            "sudo rm -rf /opt/llmui-core/venv",
            "Suppression ancien venv",
            5
        )
        
        # Créer le nouveau venv avec la version de Python choisie
        success, _ = self.execute_command(
            f"cd /opt/llmui-core && {self.python_cmd} -m venv venv",
            f"Création venv avec {self.python_cmd}",
            5,
            critical=True
        )
        
        if not success:
            return False
        
        # Upgrade pip
        self.execute_command(
            "cd /opt/llmui-core && venv/bin/pip install --upgrade pip",
            "Upgrade pip",
            5
        )
        
        # Réinstaller les dépendances critiques
        self.log("📦 Réinstallation des dépendances critiques...", "INFO")
        critical_packages = [
            "fastapi>=0.115.0",
            "uvicorn[standard]>=0.30.0",
            "pydantic>=2.10.0",
            "pydantic-settings>=2.7.0",
            "httpx>=0.27.0",
            "python-multipart>=0.0.9",
            "bcrypt>=4.2.0",
            # pytz retiré - zoneinfo natif (Python 3.9+)
            "itsdangerous>=2.1.0",
            "starlette>=0.41.0"
        ]
        
        for package in critical_packages:
            self.execute_command(
                f"cd /opt/llmui-core && venv/bin/pip install '{package}'",
                f"Installation {package.split('>=')[0]}",
                5
            )
        
        # Fixer les permissions
        self.execute_command(
            "sudo chown -R llmui:llmui /opt/llmui-core/venv",
            "Permissions venv",
            5
        )
        
        self.log(f"✅ Venv recréé avec {self.python_cmd}", "SUCCESS")
        self.venv_recreated = True
        return True
    
    def attempt_python_version_switch(self):
        """Tente de passer à une autre version de Python si l'installation échoue."""
        
        # Versions compatibles, de la plus récente à la moins récente
        target_versions = ["3.12", "3.11", "3.10"]
        
        current_python_version = self.python_cmd.replace("python", "")
        self.log(f"🐍 Version Python actuelle: {current_python_version}", "INFO")

        for target in target_versions:
            if target not in current_python_version:  # Ne pas essayer la même version
                self.log(f"🔄 Tentative de basculer vers Python {target}...", "INFO")
                
                # 1. Vérifier si elle est déjà installée
                available_versions = self.get_available_python_versions()
                found_cmd = next((cmd for cmd, version in available_versions if version == target), None)
                
                if found_cmd:
                    self.python_cmd = found_cmd
                    self.log(f"✅ Python {target} trouvé en tant que {found_cmd}.", "SUCCESS")
                elif self.install_python_version(target):
                    # 2. Installer si non trouvée (self.python_cmd est mis à jour dans install_python_version)
                    self.log(f"✅ Installation de Python {target} réussie.", "SUCCESS")
                else:
                    self.log(f"❌ Échec de la recherche/installation de Python {target}.", "WARNING")
                    continue  # Passer à la version suivante
                
                # 3. Recréer le venv
                if self.recreate_venv_with_compatible_python():
                    return True  # Succès du changement
        
        return False  # Toutes les tentatives ont échoué
    
    def fix_requirements_txt(self, error_message, requirements_path="/opt/llmui-core/requirements.txt"):
        """Analyse l'erreur pip et corrige requirements.txt automatiquement"""
        
        self.log("🔧 Andy analyse l'erreur de dépendances...", "INFO")
        
        # Vérifier si c'est une simple erreur de module manquant
        missing_module_match = re.search(r"Could not find a version that satisfies the requirement (\S+)", error_message)
        if missing_module_match:
            self.log(f"🔍 Problème de contrainte de version détecté: {missing_module_match.group(1)}", "INFO")
        
        # Détecter si c'est un problème de compilation Python 3.13
        is_python_313_issue = self.detect_python_compilation_issue(error_message)
        
        if is_python_313_issue:
            self.log("⚠️ Problème de compilation détecté avec Python 3.13", "WARNING")
            self.log("💡 Andy recommande d'utiliser Python 3.11 ou 3.12", "INFO")
            
            # Ne pas tenter de changer Python si déjà fait
            if not self.venv_recreated:
                # Chercher une version compatible
                available_versions = self.get_available_python_versions()
                self.log(f"🔍 Versions Python disponibles: {available_versions}", "INFO")
                
                # Préférer 3.12, puis 3.11, puis 3.10
                compatible_version = None
                for cmd, version in available_versions:
                    if version in ["3.12", "3.11", "3.10"]:
                        compatible_version = (cmd, version)
                        break
                
                if compatible_version:
                    self.log(f"✅ Version compatible trouvée: {compatible_version[1]}", "SUCCESS")
                    self.python_cmd = compatible_version[0]
                    
                    # Recréer le venv avec la bonne version
                    if self.recreate_venv_with_compatible_python():
                        self.log("✅ Venv recréé avec succès", "SUCCESS")
                        return True
                else:
                    self.log("⚠️ Aucune version Python compatible trouvée", "WARNING")
                    self.log("🔧 Andy va tenter d'installer Python 3.12...", "INFO")
                    
                    if self.install_python_version("3.12"):
                        if self.recreate_venv_with_compatible_python():
                            self.log("✅ Venv recréé avec Python 3.12", "SUCCESS")
                            return True
                    else:
                        self.log("❌ Impossible d'installer Python 3.12", "ERROR")
                        self.log("💡 Tentative de correction du requirements.txt...", "INFO")
        
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
        
        # Construire le prompt SIMPLIFIÉ et FOCALISÉ pour Ollama
        prompt = f"""You are Andy, a DevOps AI assistant specialized in Python dependency resolution. An installation failed.

CRITICAL CONTEXT:
- Python Version: {python_version}
- CURRENT requirements.txt (full content):
{current_requirements}

ERROR MESSAGE (The critical part showing the conflicting or missing package version):
{error_message[-2000:]}

TASK:
Identify the *one or two* packages from requirements.txt that need their version specification modified (e.g., from == to >=, or changing a specific number) to resolve the error in the ERROR MESSAGE.

OUTPUT FORMAT - Provide ONLY fixes in this exact format:

FIXES:
old_package_line -> new_package_line

Example 1 (Version conflict):
torch<2.2.0,>=2.0.1 -> torch>=2.5.0

Example 2 (Compilation issue on this Python version):
pydantic==2.5.0 -> pydantic>=2.10.0

If you are certain the issue is NOT fixable by changing requirements.txt (e.g., missing system library), reply with:
FIXES:
NONE

Now analyze and provide fixes:"""

        # Logger le prompt pour déboguer
        self.log(f"✉️ Prompt envoyé à Ollama (pour debug):\n{prompt[:500]}...", "DEBUG")

        # Appeler Ollama
        response = self.call_ollama(prompt, max_tokens=1000)
        
        if not response:
            self.log("Andy n'a pas pu analyser l'erreur avec Ollama", "WARNING")
            return self.apply_basic_fixes(error_message, requirements_path, is_python_313_issue)
        
        self.log(f"💡 Analyse d'Andy:\n{response}", "INFO")
        
        # Vérifier si Andy dit que c'est non-fixable
        if "FIXES:\nNONE" in response or "FIXES: NONE" in response:
            self.log("⚠️ Andy indique que le problème n'est pas résoluble via requirements.txt", "WARNING")
            return False
        
        # Vérifier si Andy recommande un changement de version Python
        if "PYTHON_RECOMMENDATION" in response and ("3.11" in response or "3.12" in response):
            self.log("💡 Andy recommande d'utiliser Python 3.11 ou 3.12", "INFO")
        
        # Parser la réponse pour extraire les corrections
        fixes = []
        lines = response.split('\n')
        in_fixes_section = False
        
        for line in lines:
            if 'FIXES:' in line:
                in_fixes_section = True
                continue
            
            if in_fixes_section and '->' in line:
                parts = line.split('->')
                if len(parts) == 2:
                    old_line = parts[0].strip()
                    new_line = parts[1].strip()
                    # Nettoyer les lignes
                    old_line = re.sub(r'^[-\*\s]+', '', old_line)
                    new_line = re.sub(r'^[-\*\s]+', '', new_line)
                    if old_line and new_line and old_line.lower() != 'none':
                        fixes.append((old_line, new_line))
        
        if not fixes:
            self.log("Andy n'a pas trouvé de corrections dans la réponse", "WARNING")
            return self.apply_basic_fixes(error_message, requirements_path, is_python_313_issue)
        
        # Appliquer les corrections avec recherche flexible
        self.log(f"🔨 Application de {len(fixes)} corrections...", "INFO")
        updated_requirements = current_requirements
        changes_made = False
        
        for old_line, new_line in fixes:
            # Recherche flexible - normaliser les espaces et essayer plusieurs variations
            old_normalized = re.sub(r'\s+', '', old_line)
            
            # Chercher la ligne dans le fichier
            found = False
            for req_line in current_requirements.split('\n'):
                req_normalized = re.sub(r'\s+', '', req_line.strip())
                if old_normalized == req_normalized or old_line in req_line:
                    updated_requirements = updated_requirements.replace(req_line.strip(), new_line)
                    self.log(f"  ✅ {req_line.strip()} → {new_line}", "SUCCESS")
                    changes_made = True
                    found = True
                    
                    # Enregistrer la correction dans la DB
                    cursor = self.conn.cursor()
                    cursor.execute(
                        "INSERT INTO corrections (original_command, corrected_command, reason) VALUES (?, ?, ?)",
                        (req_line.strip(), new_line, "Fix pip dependency version conflict")
                    )
                    self.conn.commit()
                    break
            
            if not found:
                # Essayer une recherche par nom de package seulement
                package_name = old_line.split('>=')[0].split('==')[0].split('<')[0].split('>')[0].strip()
                self.log(f"  🔍 Recherche flexible pour le package: {package_name}", "INFO")
                
                for req_line in current_requirements.split('\n'):
                    if req_line.strip().startswith(package_name):
                        updated_requirements = updated_requirements.replace(req_line.strip(), new_line)
                        self.log(f"  ✅ {req_line.strip()} → {new_line}", "SUCCESS")
                        changes_made = True
                        
                        cursor = self.conn.cursor()
                        cursor.execute(
                            "INSERT INTO corrections (original_command, corrected_command, reason) VALUES (?, ?, ?)",
                            (req_line.strip(), new_line, "Fix pip dependency version conflict")
                        )
                        self.conn.commit()
                        break
                else:
                    self.log(f"  ⚠️ Package non trouvé: {package_name}", "WARNING")
        
        if not changes_made:
            self.log("⚠️ Aucun changement appliqué, tentative de corrections basiques", "WARNING")
            return self.apply_basic_fixes(error_message, requirements_path, is_python_313_issue)
        
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
    
    def apply_basic_fixes(self, error_message, requirements_path, is_python_313_issue=False):
        """Applique des corrections basiques sans Ollama"""
        self.log("🔧 Application de corrections basiques...", "INFO")
        
        try:
            with open(requirements_path, 'r') as f:
                content = f.read()
            
            original_content = content
            changes_made = False
            
            # Corrections spécifiques pour torch - recherche par ligne complète
            if "torch" in error_message.lower():
                self.log("🔥 Conflit torch détecté - mise à jour intelligente", "INFO")
                
                # Lire ligne par ligne pour trouver torch
                lines = content.split('\n')
                new_lines = []
                
                for line in lines:
                    line_stripped = line.strip()
                    if line_stripped.startswith('torch') and not line_stripped.startswith('torchvision'):
                        # Remplacer toute contrainte torch par >=2.5.0
                        new_lines.append('torch>=2.5.0')
                        self.log(f"  ✅ {line_stripped} → torch>=2.5.0", "SUCCESS")
                        changes_made = True
                    elif line_stripped.startswith('torchvision'):
                        # Remplacer toute contrainte torchvision par >=0.20.0
                        new_lines.append('torchvision>=0.20.0')
                        self.log(f"  ✅ {line_stripped} → torchvision>=0.20.0", "SUCCESS")
                        changes_made = True
                    else:
                        new_lines.append(line)
                
                content = '\n'.join(new_lines)
            
            # Corrections spécifiques Python 3.13
            if is_python_313_issue:
                self.log("Python 3.13 - corrections pour pydantic-core et compilation Rust", "INFO")
                
                fixes = [
                    ("pydantic==2.5.0", "pydantic>=2.10.0"),
                    ("pydantic-core==2.14.1", "pydantic-core>=2.27.0"),
                    ("pydantic-settings==2.1.0", "pydantic-settings>=2.7.0"),
                    ("fastapi==0.104.1", "fastapi>=0.115.0"),
                    ("starlette==0.27.0", "starlette>=0.41.0"),
                ]
                
                for old, new in fixes:
                    if old in content:
                        content = content.replace(old, new)
                        self.log(f"  ✅ {old} → {new}", "SUCCESS")
                        changes_made = True
            
            # Détection et correction générale pour les versions
            python_version = sys.version_info
            if python_version >= (3, 13):
                self.log("Python 3.13+ détecté - application de corrections générales", "INFO")
                
                # Patterns à remplacer pour Python 3.13
                patterns = [
                    (r'pydantic==[\d\.]+', 'pydantic>=2.10.0'),
                    (r'pydantic-core==[\d\.]+', 'pydantic-core>=2.27.0'),
                    (r'pydantic-settings==[\d\.]+', 'pydantic-settings>=2.7.0'),
                    (r'fastapi==[\d\.]+', 'fastapi>=0.115.0'),
                    (r'starlette==[\d\.]+', 'starlette>=0.41.0'),
                ]
                
                for pattern, replacement in patterns:
                    new_content = re.sub(pattern, replacement, content)
                    if new_content != content:
                        self.log(f"  ✅ Pattern {pattern} → {replacement}", "SUCCESS")
                        content = new_content
                        changes_made = True
            
            # Sauvegarder si des changements ont été faits
            if changes_made:
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
        """Vérifie la version de Python et bascule vers 3.12 si Python 3.13 est détecté"""
        success, output = self.execute_command(f"{self.python_cmd} --version", "Vérification Python")
        if success:
            version = output.strip().split()[1]
            major, minor = map(int, version.split('.')[:2])
            
            self.log(f"Python {version} détecté", "INFO")
            
            if major >= 3 and minor >= 8:
                if minor == 13:
                    self.log(f"⚠️ Python 3.13 détecté - INCOMPATIBLE avec certaines dépendances", "WARNING")
                    self.log(f"🔧 Andy va automatiquement installer Python 3.12 pour éviter les problèmes", "INFO")
                    
                    # Stratégie : Installer Python 3.12 IMMÉDIATEMENT
                    if self.install_python_version("3.12"):
                        self.log("✅ Python 3.12 installé - Andy va l'utiliser pour l'installation", "SUCCESS")
                        # Le venv sera créé plus tard avec cette version
                        return True
                    else:
                        self.log("⚠️ Impossible d'installer Python 3.12, tentative avec 3.11...", "WARNING")
                        if self.install_python_version("3.11"):
                            self.log("✅ Python 3.11 installé - Andy va l'utiliser pour l'installation", "SUCCESS")
                            return True
                        else:
                            self.log("❌ Impossible d'installer Python 3.12 ou 3.11", "ERROR")
                            self.log("⚠️ Continuation avec Python 3.13 (risque d'erreurs)", "WARNING")
                            return True
                else:
                    self.log(f"✅ Python {version} OK", "SUCCESS")
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
        self.log("⏳ Attente de 20 secondes pour le démarrage complet d'Ollama...", "INFO")
        for i in range(20):
            time.sleep(1)
            if i % 10 == 0:  # Afficher un message toutes les 10 secondes
                self.log(f"⏰ Attente Ollama... {20-i} secondes restantes", "INFO")
        
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
        models = ["phi3:3.8b", "gemma2:2b", "granite4:micro-h", "qwen2.5:3b"]
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
        print("🔐 Configuration utilisateur LLMUI Interface")
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
        
        # Log de débogage (sans afficher le hash complet pour la sécurité)
        hash_preview = password_hash[:20] + "..." if len(password_hash) > 20 else password_hash
        self.log(f"🔐 Hash généré: {hash_preview} (longueur: {len(password_hash)})", "INFO")
        
        return username, password_hash
    
    def init_database_with_user(self, username, password_hash):
        """
        Initialise la base de données avec le schéma EXACT de llmui_backend.py
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
        
        # Table users - SCHÉMA EXACT de llmui_backend.py
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
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')
        
        # Insérer l'utilisateur admin (id auto-incrémenté)
        now = datetime.now().isoformat()
        cursor.execute(
            "INSERT OR REPLACE INTO users (username, password_hash, email, is_admin, created_at) VALUES (?, ?, ?, 1, ?)",
            (username, password_hash, "admin@llmui.org", now)
        )
        
        self.log(f"✅ Utilisateur '{username}' créé dans la base de données", "SUCCESS")
        
        conn.commit()
        conn.close()
        
        # CORRECTION: Permissions APRÈS création de la DB
        # 1. Ownership de la DB
        self.execute_command(
            f"sudo chown llmui:llmui {db_path}",
            "Ownership base de données",
            4
        )
        
        # 2. Permissions de la DB (660 = rw-rw----)
        self.execute_command(
            f"sudo chmod 660 {db_path}",
            "Permissions fichier DB (660)",
            4
        )
        
        # 3. Permissions du répertoire parent (775 = rwxrwxr-x)
        # Important pour SQLite qui crée des fichiers temporaires
        self.execute_command(
            "sudo chmod 775 /var/lib/llmui",
            "Permissions répertoire DB (775)",
            4
        )
        
        self.execute_command(
            "sudo chmod 775 /var/log/llmui",
            "Permissions répertoire logs (775)",
            4
        )
        )
        
        self.log(f"Utilisateur '{username}' créé avec succès", "SUCCESS")
        self.log("✅ Base de données initialisée avec schéma compatible llmui_backend.py", "SUCCESS")
    
    def deploy_source_files(self):
        """Déploie les fichiers source depuis GitHub"""
        self.log("=== DÉPLOIEMENT DES SOURCES DEPUIS GITHUB ===", "INFO")
        
        temp_dir = "/tmp/llmui-source"
        
        # Nettoyage du répertoire temporaire
        if os.path.exists(temp_dir):
            self.log("Nettoyage du répertoire temporaire...", "INFO")
            shutil.rmtree(temp_dir)
        
        # Clone du dépôt
        success, _ = self.execute_command(
            f"git clone {self.github_repo} {temp_dir}",
            "Clonage dépôt GitHub",
            11
        )
        
        if not success:
            self.log("Échec du clonage du dépôt", "ERROR")
            self.log("⚠️ Vérifiez votre connexion internet et l'accès à GitHub", "WARNING")
            return False
        
        # Copie des fichiers
        self.log("📦 Copie des fichiers source vers /opt/llmui-core/...", "INFO")
        
        # Copie du répertoire src
        if os.path.exists(f"{temp_dir}/src"):
            self.execute_command(
                f"sudo cp -r {temp_dir}/src /opt/llmui-core/",
                "Copie répertoire src",
                11
            )
        else:
            self.log("⚠️ Répertoire src/ non trouvé dans le dépôt", "WARNING")
        
        # Copie du répertoire web
        if os.path.exists(f"{temp_dir}/web"):
            self.execute_command(
                f"sudo cp -r {temp_dir}/web /opt/llmui-core/",
                "Copie répertoire web",
                11
            )
        else:
            self.log("⚠️ Répertoire web/ non trouvé dans le dépôt", "WARNING")
        
        # Copie du répertoire scripts
        if os.path.exists(f"{temp_dir}/scripts"):
            self.execute_command(
                f"sudo cp -r {temp_dir}/scripts /opt/llmui-core/",
                "Copie répertoire scripts",
                11
            )
        
        # Copie config.yaml.example
        if os.path.exists(f"{temp_dir}/config.yaml.example"):
            if os.path.exists("/opt/llmui-core/config.yaml"):
                self.execute_command(
                    f"sudo cp {temp_dir}/config.yaml.example /opt/llmui-core/config.yaml.example",
                    "Copie config.yaml.example (config.yaml existe déjà)",
                    11
                )
            else:
                self.execute_command(
                    f"sudo cp {temp_dir}/config.yaml.example /opt/llmui-core/config.yaml",
                    "Copie config.yaml depuis example",
                    11
                )
        
        # Copie config_yaml.example si présent
        if os.path.exists(f"{temp_dir}/config_yaml.example"):
            if not os.path.exists("/opt/llmui-core/config.yaml"):
                self.execute_command(
                    f"sudo cp {temp_dir}/config_yaml.example /opt/llmui-core/config.yaml",
                    "Copie config_yaml.example vers config.yaml",
                    11
                )
        
        # Copie requirements.txt si présent et installation des dépendances
        if os.path.exists(f"{temp_dir}/requirements.txt"):
            self.execute_command(
                f"sudo cp {temp_dir}/requirements.txt /opt/llmui-core/",
                "Copie requirements.txt",
                11
            )
            
            self.log("📦 Installation des dépendances additionnelles depuis requirements.txt...", "INFO")
            
            # Tentative d'installation avec gestion des erreurs de compilation
            retry_count = 0
            max_retries = 3
            
            while retry_count < max_retries:
                success, error = self.execute_command(
                    "/opt/llmui-core/venv/bin/pip install -r /opt/llmui-core/requirements.txt --upgrade",
                    f"Installation dépendances (tentative {retry_count + 1})",
                    11
                )
                
                if success:
                    self.log("✅ Dépendances installées avec succès", "SUCCESS")
                    break
                else:
                    self.log(f"⚠️ Erreur lors de l'installation (tentative {retry_count + 1}/{max_retries})", "WARNING")
                    
                    # --- STRATÉGIE D'ITÉRATION AMÉLIORÉE ---
                    
                    # Si nous avons dépassé le seuil de 2 échecs de correction
                    if retry_count >= 2:
                        self.log("❌ Échec de la correction du requirements.txt après 2 tentatives", "ERROR")
                        
                        # Tenter de changer de version Python (si pas déjà fait)
                        if not self.venv_recreated:
                            self.log("🔄 Andy va tenter de changer la version Python...", "INFO")
                            if self.attempt_python_version_switch():
                                self.log("✅ Passage à une nouvelle version Python réussi. Réinitialisation des tentatives.", "SUCCESS")
                                retry_count = 0  # Réinitialiser le compteur
                                continue  # Recommencer l'installation immédiatement
                            else:
                                self.log("❌ Impossible de trouver/installer une nouvelle version Python compatible.", "ERROR")
                                break  # Sortir de la boucle si le changement Python échoue
                        else:
                            self.log("❌ Changement de Python déjà effectué, abandon", "ERROR")
                            break
                    
                    # Tentative de correction par LLM/fallback
                    if self.fix_requirements_txt(error):
                        self.log("🔧 Corrections appliquées, nouvelle tentative...", "INFO")
                        retry_count += 1
                    else:
                        self.log("❌ Impossible de corriger automatiquement", "ERROR")
                        break
        
        # Créer le dossier logs s'il n'existe pas
        self.execute_command(
            "sudo mkdir -p /opt/llmui-core/logs",
            "Création répertoire logs",
            11
        )
        
        # Copier config_yaml.example vers config.yaml s'il n'existe pas déjà 
        if not os.path.exists("/opt/llmui-core/config.yaml"):
            if os.path.exists("/opt/llmui-core/config_yaml.example"):
                self.execute_command(
                    "sudo cp /opt/llmui-core/config_yaml.example /opt/llmui-core/config.yaml",
                    "Création config.yaml depuis config_yaml.example",
                    11
                )
            elif os.path.exists("/opt/llmui-core/config.yaml.example"):
                self.execute_command(
                    "sudo cp /opt/llmui-core/config.yaml.example /opt/llmui-core/config.yaml",
                    "Création config.yaml depuis config.yaml.example",
                    11
                )
        
        # Ajustement des permissions
        self.log("🔒 Configuration des permissions...", "INFO")
        self.execute_command(
            "sudo chown -R llmui:llmui /opt/llmui-core/src",
            "Permissions src",
            11
        )
        self.execute_command(
            "sudo chown -R llmui:llmui /opt/llmui-core/web",
            "Permissions web",
            11
        )
        self.execute_command(
            "sudo chown -R llmui:llmui /opt/llmui-core/logs",
            "Permissions logs",
            11
        )
        self.execute_command(
            "sudo chown -R llmui:llmui /opt/llmui-core/venv",
            "Permissions venv",
            11
        )
        
        if os.path.exists("/opt/llmui-core/config.yaml"):
            self.execute_command(
                "sudo chown llmui:llmui /opt/llmui-core/config.yaml",
                "Permissions config",
                11
            )
            self.execute_command(
                "sudo chmod 600 /opt/llmui-core/config.yaml",
                "Chmod config",
                11
            )
        
        if os.path.exists("/opt/llmui-core/src"):
            self.execute_command(
                "sudo chmod +x /opt/llmui-core/src/*.py 2>/dev/null || true",
                "Scripts exécutables",
                11
            )
        
        # Nettoyage
        self.log("🧹 Nettoyage du répertoire temporaire...", "INFO")
        shutil.rmtree(temp_dir)
        
        self.log("✅ Fichiers source déployés avec succès", "SUCCESS")
        return True
    
    def run_installation(self):
        """Processus d'installation principal"""
        self.log("="*60, "INFO")
        self.log("DÉMARRAGE D'ANDY - Installation LLMUI-CORE v0.5.0", "INFO")
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
                "sudo apt-get install -y python3-pip python3-venv nginx git curl sqlite3 build-essential python3-dev software-properties-common",
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
            "sudo mkdir -p /opt/llmui-core/src /opt/llmui-core/web /opt/llmui-core/logs /opt/llmui-core/scripts",
            "Création structure répertoires",
            5
        )
        
        # Étape 5b: Installation Python venv et dépendances CRITIQUES
        self.log("=== ÉTAPE 5b: Installation environnement Python ===", "INFO")
        
        # Créer le venv avec la commande Python appropriée (peut être 3.12 si détecté)
        success, _ = self.execute_command(
            f"cd /opt/llmui-core && {self.python_cmd} -m venv venv",
            f"Création venv avec {self.python_cmd}",
            5,
            critical=True
        )
        
        if not success:
            self.log("❌ Échec création venv", "ERROR")
            return False
        
        # Upgrade pip
        self.execute_command(
            "cd /opt/llmui-core && venv/bin/pip install --upgrade pip",
            "Upgrade pip",
            5
        )
        
        # Installation des dépendances critiques
        self.log("📦 Installation des dépendances critiques Python...", "INFO")
        
        critical_packages = [
            "fastapi>=0.115.0",
            "uvicorn[standard]>=0.30.0",
            "pydantic>=2.10.0",
            "pydantic-settings>=2.7.0",
            "httpx>=0.27.0",
            "python-multipart>=0.0.9",
            "bcrypt>=4.2.0",
            # pytz retiré - zoneinfo natif (Python 3.9+)
            "itsdangerous>=2.1.0",
            "starlette>=0.41.0"
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
        
        # CORRECTION: Permissions critiques pour la DB
        self.execute_command(
            "sudo chown -R llmui:llmui /var/lib/llmui",
            "Ownership /var/lib/llmui",
            8
        )
        
        self.execute_command(
            "sudo chmod 775 /var/lib/llmui",
            "Permissions répertoire DB",
            8
        )
        
        if os.path.exists("/var/lib/llmui/llmui.db"):
            self.execute_command(
                "sudo chmod 660 /var/lib/llmui/llmui.db",
                "Permissions fichier DB",
                8
            )
        
        self.execute_command(
            "sudo chown -R llmui:llmui /var/log/llmui",
            "Ownership /var/log/llmui",
            8
        )
        
        self.execute_command(
            "sudo chmod 775 /var/log/llmui",
            "Permissions répertoire logs",
            8
        )
        
        # Étape 9: Configuration pare-feu avec règles strictes
        self.log("=== ÉTAPE 9: Configuration pare-feu (sécurité) ===", "INFO")
        self.configure_firewall_strict()
        
        # Étape 10: Déploiement des sources depuis GitHub
        self.log("=== ÉTAPE 10: Déploiement des fichiers source ===", "INFO")
        if not self.deploy_source_files():
            self.log("⚠️ Échec du déploiement des sources", "WARNING")
            self.log("Vous devrez peut-être exécuter manuellement:", "INFO")
            self.log("sudo python3 andy_deploy_source.py", "INFO")
        
        # Étape 11: Démarrage des services
        self.log("=== ÉTAPE 11: Démarrage des services ===", "INFO")
        self.start_services()
        
        self.log("\n✅ Installation COMPLÈTE terminée avec succès!", "SUCCESS")
        
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
# Generated by Andy v0.5.0

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
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
            self.execute_command("sudo ufw --force enable", "Activation UFW", 9)
            self.execute_command("sudo ufw default deny incoming", "UFW deny incoming", 9)
            self.execute_command("sudo ufw default allow outgoing", "UFW allow outgoing", 9)
            
            # Règles publiques
            self.execute_command("sudo ufw allow 22/tcp", "UFW allow SSH", 9)
            self.execute_command("sudo ufw allow 80/tcp", "UFW allow HTTP", 9)
            self.execute_command("sudo ufw allow 443/tcp", "UFW allow HTTPS", 9)
            
            # Règles localhost only pour ports internes
            self.execute_command("sudo ufw allow from 127.0.0.1 to any port 5000 proto tcp", "UFW backend localhost only", 9)
            self.execute_command("sudo ufw allow from 127.0.0.1 to any port 8080 proto tcp", "UFW proxy localhost only", 9)
            self.execute_command("sudo ufw allow from 127.0.0.1 to any port 11434 proto tcp", "UFW Ollama localhost only", 9)
            
            self.execute_command("sudo ufw reload", "UFW reload", 9)
            self.log("UFW configuré avec règles strictes", "SUCCESS")
            
        elif self.execute_command("command -v firewall-cmd", "Détection firewalld")[0]:
            self.log("Configuration firewalld avec règles strictes...", "INFO")
            self.execute_command("sudo systemctl enable --now firewalld", "Activation firewalld", 9)
            
            # Règles publiques
            self.execute_command("sudo firewall-cmd --permanent --add-service=ssh", "Firewalld allow SSH", 9)
            self.execute_command("sudo firewall-cmd --permanent --add-service=http", "Firewalld allow HTTP", 9)
            self.execute_command("sudo firewall-cmd --permanent --add-service=https", "Firewalld allow HTTPS", 9)
            
            # Règles localhost only
            self.execute_command("sudo firewall-cmd --permanent --add-rich-rule='rule family=\"ipv4\" source address=\"127.0.0.1\" port port=\"5000\" protocol=\"tcp\" accept'", "Firewalld backend localhost", 9)
            self.execute_command("sudo firewall-cmd --permanent --add-rich-rule='rule family=\"ipv4\" source address=\"127.0.0.1\" port port=\"8080\" protocol=\"tcp\" accept'", "Firewalld proxy localhost", 9)
            self.execute_command("sudo firewall-cmd --permanent --add-rich-rule='rule family=\"ipv4\" source address=\"127.0.0.1\" port port=\"11434\" protocol=\"tcp\" accept'", "Firewalld Ollama localhost", 9)
            
            self.execute_command("sudo firewall-cmd --reload", "Firewalld reload", 9)
            self.log("Firewalld configuré avec règles strictes", "SUCCESS")
        else:
            self.log("⚠️ Aucun pare-feu détecté - configuration manuelle recommandée", "WARNING")
    
    def start_services(self):
        """Démarre les services LLMUI"""
        self.log("🚀 Démarrage des services...", "INFO")
        
        # Enable services
        self.execute_command(
            "sudo systemctl enable llmui-backend llmui-proxy nginx",
            "Enable services",
            12
        )
        
        # Start backend
        success, _ = self.execute_command(
            "sudo systemctl start llmui-backend",
            "Démarrage backend",
            12
        )
        
        if success:
            self.log("✅ Service backend démarré", "SUCCESS")
            time.sleep(5)  # Attendre que le backend soit prêt
            
            # Vérifier si le service est vraiment actif
            success_check, _ = self.execute_command(
                "sudo systemctl is-active llmui-backend",
                "Vérif backend actif",
                12
            )
            
            if not success_check:
                self.log("⚠️ Backend démarré mais pas actif, vérification des logs...", "WARNING")
                self.log("💡 Logs du backend:", "INFO")
                self.execute_command(
                    "sudo journalctl -u llmui-backend -n 30 --no-pager",
                    "Logs backend détaillés",
                    12
                )
                
                # Vérifier s'il manque des dépendances
                success_log, log_output = self.execute_command(
                    "sudo journalctl -u llmui-backend -n 30 --no-pager | grep -i 'ModuleNotFoundError\\|ImportError'",
                    "Recherche erreurs modules",
                    12
                )
                
                if success_log and log_output:
                    self.log(f"🔍 Erreur de module détectée: {log_output}", "ERROR")
                    
                    # Extraire le nom du module manquant
                    module_match = re.search(r"No module named ['\"]([^'\"]+)['\"]", log_output)
                    if module_match:
                        missing_module = module_match.group(1)
                        self.log(f"📦 Installation du module manquant: {missing_module}", "INFO")
                        
                        self.execute_command(
                            f"/opt/llmui-core/venv/bin/pip install {missing_module}",
                            f"Installation {missing_module}",
                            12
                        )
                        
                        # Redémarrer le backend
                        self.log("🔄 Redémarrage du backend...", "INFO")
                        self.execute_command(
                            "sudo systemctl restart llmui-backend",
                            "Redémarrage backend",
                            12
                        )
                        time.sleep(5)
        else:
            self.log("❌ Échec démarrage backend", "ERROR")
            self.log("💡 Vérification des logs...", "INFO")
            self.execute_command(
                "sudo journalctl -u llmui-backend -n 50 --no-pager",
                "Logs backend",
                12
            )
            return False
        
        # Start proxy
        success, _ = self.execute_command(
            "sudo systemctl start llmui-proxy",
            "Démarrage proxy",
            12
        )
        
        if success:
            self.log("✅ Service proxy démarré", "SUCCESS")
        else:
            self.log("❌ Échec démarrage proxy", "ERROR")
            return False
        
        # Ensure nginx is running
        self.execute_command(
            "sudo systemctl restart nginx",
            "Redémarrage nginx",
            12
        )
        
        # Wait for services to stabilize
        time.sleep(3)
        
        # Check services status
        self.log("\n📊 Vérification des services:", "INFO")
        
        services = ["llmui-backend", "llmui-proxy", "nginx", "ollama"]
        all_ok = True
        
        for service in services:
            success, _ = self.execute_command(
                f"sudo systemctl is-active {service}",
                f"Vérif {service}",
                12
            )
            if success:
                self.log(f"  ✅ {service} actif", "SUCCESS")
            else:
                self.log(f"  ❌ {service} inactif", "ERROR")
                all_ok = False
        
        return all_ok
    
    def get_server_ip(self):
        """Récupère l'IP du serveur"""
        try:
            # Essayer de récupérer l'IP publique
            success, output = self.execute_command(
                "curl -s ifconfig.me",
                "Récupération IP publique",
                12
            )
            if success and output.strip():
                return output.strip()
            
            # Fallback: IP locale
            success, output = self.execute_command(
                "hostname -I | awk '{print $1}'",
                "Récupération IP locale",
                12
            )
            if success and output.strip():
                return output.strip()
            
            return "localhost"
        except:
            return "localhost"
    
    def verify_installation(self):
        """Vérifie que l'installation complète fonctionne"""
        self.log("\n=== VÉRIFICATION POST-INSTALLATION COMPLÈTE ===", "INFO")
        
        checks = [
            ("test -d /opt/llmui-core", "Répertoire installation"),
            ("test -d /opt/llmui-core/src", "Répertoire src"),
            ("test -d /opt/llmui-core/web", "Répertoire web"),
            ("test -f /var/lib/llmui/llmui.db", "Base de données"),
            ("test -f /etc/systemd/system/llmui-backend.service", "Service backend créé"),
            ("test -f /etc/systemd/system/llmui-proxy.service", "Service proxy créé"),
            ("test -f /etc/nginx/sites-available/llmui", "Config Nginx"),
            ("sudo systemctl is-active nginx", "Service nginx"),
            ("sudo systemctl is-active llmui-backend", "Service backend"),
            ("sudo systemctl is-active llmui-proxy", "Service proxy")
        ]
        
        all_ok = True
        for cmd, name in checks:
            success, output = self.execute_command(cmd, f"Vérif {name}", 13)
            if success:
                self.log(f"✅ {name} OK", "SUCCESS")
            else:
                self.log(f"❌ {name} ÉCHEC", "ERROR")
                all_ok = False
        
        # Test HTTP
        self.log("\n🌐 Test de connexion HTTP...", "INFO")
        success, _ = self.execute_command(
            "curl -s -o /dev/null -w '%{http_code}' http://localhost/",
            "Test HTTP localhost",
            13
        )
        
        if success:
            self.log("✅ Interface web accessible", "SUCCESS")
        else:
            self.log("⚠️ Interface web non accessible", "WARNING")
        
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
            if andy.verify_installation():
                server_ip = andy.get_server_ip()
                
                print("\n" + "="*70)
                print("✅ INSTALLATION COMPLÈTE TERMINÉE AVEC SUCCÈS!")
                print("="*70)
                print(f"\n🌐 Accédez à LLMUI Core via:")
                print(f"   http://{server_ip}/")
                print(f"   http://localhost/  (si local)")
                print(f"\n📋 Logs: /tmp/andy_install.log")
                print(f"🗃️ Base de données Andy: /tmp/andy_installation.db")
                print(f"📊 Logs services:")
                print(f"   Backend: /opt/llmui-core/logs/backend.log")
                print(f"   Proxy: /opt/llmui-core/logs/proxy.log")
                print(f"\n🔧 Commandes utiles:")
                print(f"   sudo systemctl status llmui-backend")
                print(f"   sudo systemctl status llmui-proxy")
                print(f"   sudo journalctl -u llmui-backend -f")
                print(f"\n💡 Version Python utilisée: {andy.python_cmd}")
                print("="*70)
                return 0
            else:
                print("\n⚠️ Installation terminée avec des avertissements")
                print("Consultez les logs pour plus de détails")
                return 1
        else:
            print("\n❌ Installation échouée. Consultez les logs.")
            return 1
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
