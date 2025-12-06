#!/usr/bin/env python3
"""
==============================================================================
Andy Start Services - Démarrage des services LLMUI Core V 0.5.0
==============================================================================
Ce script démarre les services après que les fichiers source ont été copiés
==============================================================================
"""

import subprocess
import sys
import os

def log(message, level="INFO"):
    """Log simple"""
    print(f"[{level}] {message}")

def execute_command(command, description):
    """Exécute une commande"""
    log(f"{description}...", "INFO")
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    
    if result.returncode == 0:
        log(f"✓ {description} - OK", "SUCCESS")
        return True
    else:
        log(f"✗ {description} - ÉCHEC", "ERROR")
        if result.stderr:
            log(result.stderr, "ERROR")
        return False

def check_source_files():
    """Vérifie que les fichiers source sont présents"""
    required_files = [
        "/opt/llmui-core/src/llmui_backend.py",
        "/opt/llmui-core/src/llmui_proxy.py",
        "/opt/llmui-core/web/index.html",
        "/opt/llmui-core/config.yaml"
    ]
    
    missing = []
    for file in required_files:
        if not os.path.exists(file):
            missing.append(file)
    
    if missing:
        log("Fichiers source manquants:", "ERROR")
        for f in missing:
            log(f"  - {f}", "ERROR")
        return False
    
    return True

def main():
    log("=== Démarrage des services LLMUI Core ===", "INFO")
    
    # Vérification des fichiers
    if not check_source_files():
        log("Copiez d'abord les fichiers source vers /opt/llmui-core/", "ERROR")
        sys.exit(1)
    
    # Activation et démarrage des services
    execute_command("sudo systemctl enable llmui-backend", "Activation service backend")
    execute_command("sudo systemctl start llmui-backend", "Démarrage service backend")
    
    # Attente du backend
    log("Attente du démarrage du backend (5 secondes)...", "INFO")
    subprocess.run("sleep 5", shell=True)
    
    execute_command("sudo systemctl enable llmui-proxy", "Activation service proxy")
    execute_command("sudo systemctl start llmui-proxy", "Démarrage service proxy")
    
    # Attente du proxy
    log("Attente du démarrage du proxy (3 secondes)...", "INFO")
    subprocess.run("sleep 3", shell=True)
    
    execute_command("sudo systemctl restart nginx", "Redémarrage Nginx")
    
    # Vérification finale
    log("\n=== VÉRIFICATION DES SERVICES ===", "INFO")
    execute_command("sudo systemctl is-active llmui-backend", "Backend actif")
    execute_command("sudo systemctl is-active llmui-proxy", "Proxy actif")
    execute_command("sudo systemctl is-active nginx", "Nginx actif")
    execute_command("curl -I http://localhost/", "Test HTTP")
    
    # Affichage de l'IP
    result = subprocess.run("hostname -I | awk '{print $1}'", shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        ip = result.stdout.strip()
        log(f"\n✓ Interface accessible sur: http://{ip}/", "SUCCESS")
    
    log("\n=== Services démarrés avec succès ===", "SUCCESS")
    log("Consultez les logs avec: sudo journalctl -u llmui-backend -f", "INFO")

if __name__ == "__main__":
    if os.geteuid() != 0:
        print("Ce script doit être exécuté en tant que root (sudo)")
        sys.exit(1)
    main()
