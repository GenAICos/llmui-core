#!/usr/bin/env python3
"""
==============================================================================
Andy Deploy Source - Déploiement des fichiers source LLMUI Core v0.5.0
==============================================================================
Clone le dépôt Git et copie les fichiers vers /opt/llmui-core/

"""

import subprocess
import sys
import os
import shutil

# Dépôt GitHub connu par Andy
GITHUB_REPO = "https://github.com/GenAICos/llmui-core.git"

def log(message, level="INFO"):
    """Log simple"""
    print(f"[{level}] {message}")

def execute_command(command, description):
    """Exécute une commande"""
    log(f"{description}...", "INFO")
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    
    if result.returncode == 0:
        log(f"✓ {description} - OK", "SUCCESS")
        return True, result.stdout
    else:
        log(f"✗ {description} - ÉCHEC", "ERROR")
        if result.stderr:
            log(result.stderr, "ERROR")
        return False, result.stderr

def main():
    log("=== Déploiement des fichiers source LLMUI Core v0.5.0 ===", "INFO")
    log(f"Dépôt GitHub: {GITHUB_REPO}", "INFO")
    
    # Clone du dépôt
    temp_dir = "/tmp/llmui-source"
    
    # Nettoyage du répertoire temporaire
    if os.path.exists(temp_dir):
        log("Nettoyage du répertoire temporaire...", "INFO")
        shutil.rmtree(temp_dir)
    
    success, _ = execute_command(
        f"git clone {GITHUB_REPO} {temp_dir}",
        "Clonage du dépôt GitHub"
    )
    
    if not success:
        log("Échec du clonage", "ERROR")
        log("Vérifiez votre connexion internet et l'accès à GitHub", "ERROR")
        sys.exit(1)
    
    # Copie des fichiers
    log("Copie des fichiers source vers /opt/llmui-core/...", "INFO")
    
    # Copie du répertoire src
    if os.path.exists(f"{temp_dir}/src"):
        execute_command(
            f"sudo cp -r {temp_dir}/src /opt/llmui-core/",
            "Copie répertoire src"
        )
    else:
        log("⚠️  Répertoire src/ non trouvé dans le dépôt", "WARNING")
    
    # Copie du répertoire web
    if os.path.exists(f"{temp_dir}/web"):
        execute_command(
            f"sudo cp -r {temp_dir}/web /opt/llmui-core/",
            "Copie répertoire web"
        )
    else:
        log("⚠️  Répertoire web/ non trouvé dans le dépôt", "WARNING")
    
    # Copie du répertoire scripts
    if os.path.exists(f"{temp_dir}/scripts"):
        execute_command(
            f"sudo cp -r {temp_dir}/scripts /opt/llmui-core/",
            "Copie répertoire scripts"
        )
    
    # Copie config.yaml.example
    if os.path.exists(f"{temp_dir}/config.yaml.example"):
        # Vérifier si config.yaml existe déjà
        if os.path.exists("/opt/llmui-core/config.yaml"):
            execute_command(
                f"sudo cp {temp_dir}/config.yaml.example /opt/llmui-core/config.yaml.example",
                "Copie config.yaml.example (config.yaml existe déjà)"
            )
        else:
            execute_command(
                f"sudo cp {temp_dir}/config.yaml.example /opt/llmui-core/config.yaml",
                "Copie config.yaml depuis example"
            )
    
    # Copie config_yaml.example si présent (tolérant aux deux noms)
    if os.path.exists(f"{temp_dir}/config_yaml.example"):
        if not os.path.exists("/opt/llmui-core/config.yaml"):
            execute_command(
                f"sudo cp {temp_dir}/config_yaml.example /opt/llmui-core/config.yaml",
                "Copie config_yaml.example vers config.yaml"
            )
    
    # Copie requirements.txt si présent
    if os.path.exists(f"{temp_dir}/requirements.txt"):
        execute_command(
            f"sudo cp {temp_dir}/requirements.txt /opt/llmui-core/",
            "Copie requirements.txt"
        )
        
        log("📦 Vérification et installation des dépendances additionnelles...", "INFO")
        
        # Lire requirements.txt pour voir ce qui manque
        try:
            with open("/opt/llmui-core/requirements.txt", 'r') as f:
                requirements = f.read()
            
            # Liste des packages déjà installés par andy_installer.py
            already_installed = [
                "fastapi", "uvicorn", "pydantic", "pydantic-settings",
                "httpx", "python-multipart", "bcrypt", "pytz"
            ]
            
            # Vérifier si torch/transformers sont dans requirements
            needs_torch = "torch" in requirements.lower()
            needs_transformers = "transformers" in requirements.lower()
            needs_sentence = "sentence-transformers" in requirements.lower()
            
            if needs_torch or needs_transformers or needs_sentence:
                log("⚠️  Dépendances ML/AI détectées - installation nécessaire", "INFO")
                
                # Installer les dépendances ML qui ne sont pas encore installées
                ml_packages = []
                if needs_torch:
                    ml_packages.append("torch>=2.0.0")
                if needs_transformers:
                    ml_packages.append("transformers>=4.30.0")
                if needs_sentence:
                    ml_packages.append("sentence-transformers>=2.2.0")
                
                for package in ml_packages:
                    log(f"📦 Installation {package}...", "INFO")
                    execute_command(
                        f"/opt/llmui-core/venv/bin/pip install '{package}'",
                        f"Installation {package.split('>=')[0]}"
                    )
            
            # Installer tous les autres packages du requirements.txt qui manquent
            log("📦 Installation des dépendances additionnelles du requirements.txt...", "INFO")
            execute_command(
                "/opt/llmui-core/venv/bin/pip install -r /opt/llmui-core/requirements.txt --upgrade",
                "Installation dépendances additionnelles"
            )
            
        except Exception as e:
            log(f"⚠️  Erreur lors de l'analyse du requirements.txt: {e}", "WARNING")
            log("Installation de toutes les dépendances par sécurité...", "INFO")
            execute_command(
                "/opt/llmui-core/venv/bin/pip install -r /opt/llmui-core/requirements.txt",
                "Installation dépendances"
            )
    
    # Créer le dossier logs s'il n'existe pas
    execute_command(
        "sudo mkdir -p /opt/llmui-core/logs",
        "Création répertoire logs"
    )
    
    # Copier config_yaml.example vers config.yaml s'il n'existe pas déjà
    if not os.path.exists("/opt/llmui-core/config.yaml"):
        if os.path.exists("/opt/llmui-core/config_yaml.example"):
            execute_command(
                "sudo cp /opt/llmui-core/config_yaml.example /opt/llmui-core/config.yaml",
                "Création config.yaml depuis config_yaml.example"
            )
        elif os.path.exists("/opt/llmui-core/config.yaml.example"):
            execute_command(
                "sudo cp /opt/llmui-core/config.yaml.example /opt/llmui-core/config.yaml",
                "Création config.yaml depuis config.yaml.example"
            )
    
    # Ajustement des permissions
    log("Configuration des permissions...", "INFO")
    execute_command(
        "sudo chown -R llmui:llmui /opt/llmui-core/src",
        "Permissions src"
    )
    execute_command(
        "sudo chown -R llmui:llmui /opt/llmui-core/web",
        "Permissions web"
    )
    execute_command(
        "sudo chown -R llmui:llmui /opt/llmui-core/logs",
        "Permissions logs"
    )
    execute_command(
        "sudo chown -R llmui:llmui /opt/llmui-core/venv",
        "Permissions venv"
    )
    
    if os.path.exists("/opt/llmui-core/config.yaml"):
        execute_command(
            "sudo chown llmui:llmui /opt/llmui-core/config.yaml",
            "Permissions config"
        )
        execute_command(
            "sudo chmod 600 /opt/llmui-core/config.yaml",
            "Chmod config"
        )
    
    if os.path.exists("/opt/llmui-core/src"):
        execute_command(
            "sudo chmod +x /opt/llmui-core/src/*.py 2>/dev/null || true",
            "Scripts exécutables"
        )
    
    # Nettoyage
    log("Nettoyage du répertoire temporaire...", "INFO")
    shutil.rmtree(temp_dir)
    
    log("\n✓ Fichiers source déployés avec succès", "SUCCESS")
    log("\nProchaine étape: sudo python3 andy_start_services.py", "INFO")

if __name__ == "__main__":
    if os.geteuid() != 0:
        print("Ce script doit être exécuté en tant que root (sudo)")
        sys.exit(1)
    main()
