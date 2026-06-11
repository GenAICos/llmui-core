#!/usr/bin/env python3
"""
Créateur et gestionnaire de base de connaissances pour Andy
Version 1.0.0
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Base de connaissances initiale enrichie
INITIAL_KNOWLEDGE = {
    "version": "1.0.0",
    "created_at": datetime.now().isoformat(),
    "last_updated": datetime.now().isoformat(),
    
    "known_errors": [
        {
            "id": 1,
            "error_pattern": "command not found: docker",
            "keywords": ["docker", "command not found"],
            "fix_command": "curl -fsSL https://get.docker.com | sh && sudo systemctl start docker && sudo systemctl enable docker",
            "description": "Docker n'est pas installé",
            "confidence": "high",
            "os_compatibility": ["ubuntu", "debian", "fedora", "centos"]
        },
        {
            "id": 2,
            "error_pattern": "Cannot connect to the Docker daemon",
            "keywords": ["docker", "daemon", "connect"],
            "fix_command": "sudo systemctl start docker",
            "description": "Le daemon Docker n'est pas démarré",
            "confidence": "high",
            "os_compatibility": ["all"]
        },
        {
            "id": 3,
            "error_pattern": "command not found: python3",
            "keywords": ["python3", "command not found"],
            "fix_command": "sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv || sudo dnf install -y python3 python3-pip || sudo pacman -S python python-pip",
            "description": "Python3 n'est pas installé",
            "confidence": "high",
            "os_compatibility": ["ubuntu", "debian", "fedora", "arch"]
        },
        {
            "id": 4,
            "error_pattern": "Permission denied",
            "keywords": ["permission denied", "access denied"],
            "fix_command": "sudo chmod +x",
            "description": "Problème de permissions",
            "confidence": "medium",
            "os_compatibility": ["all"]
        },
        {
            "id": 5,
            "error_pattern": "Port 8000 is already in use",
            "keywords": ["port", "already in use", "8000"],
            "fix_command": "sudo lsof -ti:8000 | xargs sudo kill -9 2>/dev/null || true",
            "description": "Le port 8000 est déjà utilisé",
            "confidence": "high",
            "os_compatibility": ["all"]
        },
        {
            "id": 6,
            "error_pattern": "Failed to start ollama.service",
            "keywords": ["ollama", "failed", "start", "service"],
            "fix_command": "sudo systemctl restart ollama.service && sleep 5",
            "description": "Échec du démarrage du service Ollama",
            "confidence": "high",
            "os_compatibility": ["all"]
        },
        {
            "id": 7,
            "error_pattern": "Connection refused",
            "keywords": ["connection refused", "refused"],
            "fix_command": "sleep 10 && systemctl status",
            "description": "Connexion refusée, service peut-être pas encore prêt",
            "confidence": "medium",
            "os_compatibility": ["all"]
        },
        {
            "id": 8,
            "error_pattern": "No space left on device",
            "keywords": ["no space", "device", "disk"],
            "fix_command": "df -h && sudo apt-get clean || sudo dnf clean all",
            "description": "Espace disque insuffisant",
            "confidence": "high",
            "os_compatibility": ["all"]
        },
        {
            "id": 9,
            "error_pattern": "unable to resolve host",
            "keywords": ["resolve", "host", "dns"],
            "fix_command": "echo 'nameserver 8.8.8.8' | sudo tee -a /etc/resolv.conf",
            "description": "Problème de résolution DNS",
            "confidence": "medium",
            "os_compatibility": ["all"]
        },
        {
            "id": 10,
            "error_pattern": "E: Could not get lock",
            "keywords": ["lock", "dpkg", "apt"],
            "fix_command": "sudo rm /var/lib/dpkg/lock-frontend && sudo rm /var/cache/apt/archives/lock && sudo dpkg --configure -a",
            "description": "Le gestionnaire de paquets est verrouillé",
            "confidence": "high",
            "os_compatibility": ["ubuntu", "debian"]
        },
        {
            "id": 11,
            "error_pattern": "systemctl: command not found",
            "keywords": ["systemctl", "command not found"],
            "fix_command": "echo 'System non-systemd détecté, utilisation de service à la place'",
            "description": "Système non-systemd",
            "confidence": "low",
            "os_compatibility": ["all"]
        },
        {
            "id": 12,
            "error_pattern": "Failed to enable unit",
            "keywords": ["enable", "unit", "failed"],
            "fix_command": "sudo systemctl daemon-reload",
            "description": "Échec d'activation de l'unité systemd",
            "confidence": "high",
            "os_compatibility": ["all"]
        },
        {
            "id": 13,
            "error_pattern": "certificate verify failed",
            "keywords": ["certificate", "ssl", "verify"],
            "fix_command": "sudo update-ca-certificates || sudo trust extract-compat",
            "description": "Problème de vérification de certificat SSL",
            "confidence": "medium",
            "os_compatibility": ["ubuntu", "debian", "fedora"]
        },
        {
            "id": 14,
            "error_pattern": "Module not found",
            "keywords": ["module", "not found", "import"],
            "fix_command": "source venv/bin/activate && pip install -r requirements.txt",
            "description": "Module Python manquant",
            "confidence": "high",
            "os_compatibility": ["all"]
        },
        {
            "id": 15,
            "error_pattern": "firewall-cmd: command not found",
            "keywords": ["firewall-cmd", "command not found"],
            "fix_command": "sudo apt-get install -y ufw || sudo dnf install -y firewalld",
            "description": "Outil de pare-feu non installé",
            "confidence": "high",
            "os_compatibility": ["ubuntu", "debian", "fedora"]
        }
    ],
    
    "installation_steps": [
        {
            "step": 1,
            "name": "verification_root",
            "description": "Vérification des privilèges root/sudo",
            "required": True,
            "retry_on_fail": False
        },
        {
            "step": 2,
            "name": "detection_os",
            "description": "Détection du système d'exploitation",
            "required": True,
            "retry_on_fail": False
        },
        {
            "step": 3,
            "name": "detection_ip",
            "description": "Détection de l'adresse IP",
            "required": True,
            "retry_on_fail": True
        },
        {
            "step": 4,
            "name": "install_system_deps",
            "description": "Installation des dépendances système",
            "required": True,
            "retry_on_fail": True
        },
        {
            "step": 5,
            "name": "create_directories",
            "description": "Création de la structure de répertoires",
            "required": True,
            "retry_on_fail": True
        },
        {
            "step": 6,
            "name": "create_venv",
            "description": "Création de l'environnement virtuel Python",
            "required": True,
            "retry_on_fail": True
        },
        {
            "step": 7,
            "name": "install_python_deps",
            "description": "Installation des dépendances Python",
            "required": True,
            "retry_on_fail": True
        },
        {
            "step": 8,
            "name": "copy_project_files",
            "description": "Copie des fichiers du projet",
            "required": True,
            "retry_on_fail": True
        },
        {
            "step": 9,
            "name": "generate_ssl",
            "description": "Génération des certificats SSL",
            "required": True,
            "retry_on_fail": True
        },
        {
            "step": 10,
            "name": "create_config",
            "description": "Création du fichier de configuration",
            "required": True,
            "retry_on_fail": True
        },
        {
            "step": 11,
            "name": "create_systemd_service",
            "description": "Création du service systemd",
            "required": True,
            "retry_on_fail": True
        },
        {
            "step": 12,
            "name": "configure_firewall",
            "description": "Configuration du pare-feu",
            "required": False,
            "retry_on_fail": True
        },
        {
            "step": 13,
            "name": "start_services",
            "description": "Démarrage des services",
            "required": True,
            "retry_on_fail": True
        },
        {
            "step": 14,
            "name": "verify_installation",
            "description": "Vérification de l'installation",
            "required": True,
            "retry_on_fail": False
        }
    ],
    
    "troubleshooting_commands": {
        "check_services": "sudo systemctl status llmui ollama",
        "view_logs": "sudo journalctl -u llmui -n 50",
        "check_ports": "sudo ss -tulpn | grep -E ':(8000|11434)'",
        "check_disk": "df -h",
        "check_memory": "free -h",
        "restart_services": "sudo systemctl restart llmui ollama",
        "check_python": "python3 --version && pip3 --version",
        "check_docker": "docker --version && sudo systemctl status docker"
    },
    
    "common_fixes": {
        "service_not_starting": [
            "sudo systemctl daemon-reload",
            "sudo systemctl reset-failed",
            "sudo systemctl start service_name"
        ],
        "port_in_use": [
            "sudo lsof -ti:PORT | xargs sudo kill -9",
            "sudo systemctl restart service_name"
        ],
        "permission_denied": [
            "sudo chmod +x file",
            "sudo chown user:user file"
        ],
        "module_not_found": [
            "source venv/bin/activate",
            "pip install -r requirements.txt"
        ]
    },
    
    "system_requirements": {
        "min_python_version": "3.8",
        "min_disk_space_gb": 10,
        "min_ram_gb": 4,
        "required_ports": [8000, 11434],
        "required_commands": ["curl", "git", "python3", "pip3"]
    },
    
    "metadata": {
        "author": "Andy AI Assistant",
        "project": "LLMUI",
        "version": "1.0.0",
        "license": "MIT"
    }
}

def create_knowledge_db(output_path: Path = None) -> bool:
    """Crée le fichier de base de connaissances"""
    
    if output_path is None:
        output_path = Path(__file__).parent / "knowledge_db.json"
    
    try:
        # Créer le répertoire si nécessaire
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Écrire le fichier
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(INITIAL_KNOWLEDGE, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Base de connaissances créée: {output_path}")
        print(f"📊 Statistiques:")
        print(f"   - Erreurs connues: {len(INITIAL_KNOWLEDGE['known_errors'])}")
        print(f"   - Étapes d'installation: {len(INITIAL_KNOWLEDGE['installation_steps'])}")
        print(f"   - Commandes de dépannage: {len(INITIAL_KNOWLEDGE['troubleshooting_commands'])}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la création: {e}")
        return False

def update_knowledge_db(db_path: Path, new_error: dict) -> bool:
    """Ajoute une nouvelle erreur à la base existante"""
    
    try:
        # Charger la base existante
        with open(db_path, 'r', encoding='utf-8') as f:
            knowledge = json.load(f)
        
        # Ajouter la nouvelle erreur
        new_error["id"] = len(knowledge["known_errors"]) + 1
        knowledge["known_errors"].append(new_error)
        knowledge["last_updated"] = datetime.now().isoformat()
        
        # Sauvegarder
        with open(db_path, 'w', encoding='utf-8') as f:
            json.dump(knowledge, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Erreur ajoutée à la base (ID: {new_error['id']})")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la mise à jour: {e}")
        return False

def validate_knowledge_db(db_path: Path) -> bool:
    """Valide le format de la base de connaissances"""
    
    try:
        with open(db_path, 'r', encoding='utf-8') as f:
            knowledge = json.load(f)
        
        # Vérifications
        required_keys = ["version", "known_errors", "installation_steps"]
        for key in required_keys:
            if key not in knowledge:
                print(f"❌ Clé manquante: {key}")
                return False
        
        # Valider les erreurs
        for error in knowledge["known_errors"]:
            required_error_keys = ["error_pattern", "keywords", "fix_command"]
            for key in required_error_keys:
                if key not in error:
                    print(f"❌ Clé manquante dans erreur: {key}")
                    return False
        
        print(f"✅ Base de connaissances valide")
        print(f"   Version: {knowledge.get('version')}")
        print(f"   Erreurs: {len(knowledge['known_errors'])}")
        print(f"   Dernière mise à jour: {knowledge.get('last_updated', 'N/A')}")
        
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON invalide: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur de validation: {e}")
        return False

def main():
    """Point d'entrée principal"""
    
    print("╔════════════════════════════════════════════════════════╗")
    print("║    Gestionnaire de Base de Connaissances Andy v1.0.0    ║")
    print("╚════════════════════════════════════════════════════════╝")
    print()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "create":
            output = Path(sys.argv[2]) if len(sys.argv) > 2 else None
            return 0 if create_knowledge_db(output) else 1
        
        elif command == "validate":
            if len(sys.argv) < 3:
                print("Usage: create_knowledge_db.py validate <fichier>")
                return 1
            return 0 if validate_knowledge_db(Path(sys.argv[2])) else 1
        
        elif command == "update":
            print("Fonctionnalité en développement")
            return 1
        
        else:
            print(f"Commande inconnue: {command}")
            print("Commandes disponibles: create, validate, update")
            return 1
    else:
        # Mode par défaut: créer la base
        return 0 if create_knowledge_db() else 1

if __name__ == "__main__":
    sys.exit(main())
