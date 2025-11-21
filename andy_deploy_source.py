#!/usr/bin/env python3
"""
==============================================================================
Andy Deploy Source - Déploiement des fichiers source LLMUI Core
==============================================================================
Clone le dépôt Git et copie les fichiers vers /opt/llmui-core/
==============================================================================
"""

import subprocess
import sys
import os
import shutil

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
    log("=== Déploiement des fichiers source LLMUI Core ===", "INFO")
    
    # Demander l'URL du dépôt
    print("\n" + "="*60)
    repo_url = input("URL du dépôt Git (ou ENTER pour passer): ").strip()
    
    if repo_url:
        # Clone du dépôt
        temp_dir = "/tmp/llmui-source"
        
        # Nettoyage du répertoire temporaire
        if os.path.exists(temp_dir):
            log("Nettoyage du répertoire temporaire...", "INFO")
            shutil.rmtree(temp_dir)
        
        success, _ = execute_command(
            f"git clone {repo_url} {temp_dir}",
            "Clonage du dépôt"
        )
        
        if not success:
            log("Échec du clonage", "ERROR")
            sys.exit(1)
        
        # Copie des fichiers
        log("Copie des fichiers source...", "INFO")
        
        # Copie du répertoire src
        if os.path.exists(f"{temp_dir}/src"):
            execute_command(
                f"sudo cp -r {temp_dir}/src /opt/llmui-core/",
                "Copie répertoire src"
            )
        
        # Copie du répertoire web
        if os.path.exists(f"{temp_dir}/web"):
            execute_command(
                f"sudo cp -r {temp_dir}/web /opt/llmui-core/",
                "Copie répertoire web"
            )
        
        # Copie config.yaml
        if os.path.exists(f"{temp_dir}/config.yaml"):
            execute_command(
                f"sudo cp {temp_dir}/config.yaml /opt/llmui-core/",
                "Copie config.yaml"
            )
        
        # Copie requirements.txt si présent
        if os.path.exists(f"{temp_dir}/requirements.txt"):
            execute_command(
                f"sudo cp {temp_dir}/requirements.txt /opt/llmui-core/",
                "Copie requirements.txt"
            )
        
        # Ajustement des permissions
        execute_command(
            "sudo chown -R admin:admin /opt/llmui-core/src",
            "Permissions src"
        )
        execute_command(
            "sudo chown -R admin:admin /opt/llmui-core/web",
            "Permissions web"
        )
        execute_command(
            "sudo chown admin:admin /opt/llmui-core/config.yaml",
            "Permissions config"
        )
        execute_command(
            "sudo chmod 600 /opt/llmui-core/config.yaml",
            "Chmod config"
        )
        execute_command(
            "sudo chmod +x /opt/llmui-core/src/*.py",
            "Scripts exécutables"
        )
        
        log("\n✓ Fichiers source déployés avec succès", "SUCCESS")
        log("\nProchaine étape: sudo python3 andy_start_services.py", "INFO")
        
    else:
        log("Pas de dépôt spécifié", "INFO")
        log("Copiez manuellement les fichiers vers /opt/llmui-core/", "INFO")
        log("Structure requise:", "INFO")
        log("  /opt/llmui-core/src/llmui_backend.py", "INFO")
        log("  /opt/llmui-core/src/llmui_proxy.py", "INFO")
        log("  /opt/llmui-core/web/index.html", "INFO")
        log("  /opt/llmui-core/config.yaml", "INFO")

if __name__ == "__main__":
    if os.geteuid() != 0:
        print("Ce script doit être exécuté en tant que root (sudo)")
        sys.exit(1)
    main()
