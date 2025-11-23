#!/usr/bin/env python3
"""
Backend d'installation pour LLMUI
Gère l'installation via l'interface web
Auteur: Francois Chalut
Version: 0.5.0
"""

import os
import sys
import json
import subprocess
import shutil
from pathlib import Path
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class InstallationError(Exception):
    """Exception levée lors d'erreurs d'installation"""
    pass

class LLMUIInstaller:
    def __init__(self, install_dir="/opt/llmui-core"):
        self.install_dir = Path(install_dir)
        self.venv_dir = self.install_dir / "venv"
        self.web_dir = self.install_dir / "web"
        self.errors = []
        self.warnings = []
        
    def log_error(self, message):
        """Enregistre une erreur"""
        self.errors.append(message)
        logger.error(message)
        
    def log_warning(self, message):
        """Enregistre un avertissement"""
        self.warnings.append(message)
        logger.warning(message)
        
    def check_prerequisites(self):
        """Vérifie les prérequis système"""
        logger.info("Vérification des prérequis...")
        
        # Vérifier Python
        try:
            result = subprocess.run(
                ["python3", "--version"],
                capture_output=True,
                text=True,
                check=True
            )
            logger.info(f"Python détecté: {result.stdout.strip()}")
        except subprocess.CalledProcessError:
            self.log_error("Python 3 n'est pas installé")
            return False
            
        # Vérifier pip
        try:
            subprocess.run(
                ["python3", "-m", "pip", "--version"],
                capture_output=True,
                check=True
            )
            logger.info("pip est disponible")
        except subprocess.CalledProcessError:
            self.log_error("pip n'est pas disponible")
            return False
            
        return True
        
    def create_directory_structure(self):
        """Crée la structure de répertoires"""
        logger.info("Création de la structure de répertoires...")
        
        directories = [
            self.install_dir / "src",
            self.install_dir / "web",
            self.install_dir / "ssl",
            self.install_dir / "scripts",
            self.install_dir / "docs",
            self.install_dir / "examples",
            self.install_dir / "tests",
            self.install_dir / "images",
            self.install_dir / "tools"
        ]
        
        for directory in directories:
            try:
                directory.mkdir(parents=True, exist_ok=True)
                logger.info(f"Créé: {directory}")
            except Exception as e:
                self.log_error(f"Échec création {directory}: {e}")
                return False
                
        return True
        
    def setup_virtual_environment(self):
        """Configure l'environnement virtuel Python"""
        logger.info("Configuration de l'environnement virtuel...")
        
        try:
            # Créer le venv
            subprocess.run(
                ["python3", "-m", "venv", str(self.venv_dir)],
                check=True,
                capture_output=True
            )
            logger.info("Environnement virtuel créé")
            
            # Corriger les permissions
            pip_path = self.venv_dir / "bin" / "pip"
            if pip_path.exists():
                os.chmod(pip_path, 0o755)
                logger.info("Permissions pip corrigées")
                
            # Mettre à jour pip
            try:
                subprocess.run(
                    [str(self.venv_dir / "bin" / "pip"), "install", "--upgrade", "pip"],
                    check=True,
                    capture_output=True
                )
                logger.info("pip mis à jour")
            except subprocess.CalledProcessError as e:
                self.log_warning(f"Échec mise à jour pip: {e}")
                
            return True
            
        except Exception as e:
            self.log_error(f"Échec configuration venv: {e}")
            return False
            
    def install_dependencies(self):
        """Installe les dépendances Python"""
        logger.info("Installation des dépendances...")
        
        requirements = [
            "fastapi==0.121.0",
            "uvicorn[standard]==0.38.0",
            "httpx==0.28.1",
            "pydantic==2.12.3",
            "python-multipart",
            "itsdangerous==2.2.0",
            "pytz==2025.2",
            "pyyaml"
        ]
        
        pip_path = self.venv_dir / "bin" / "pip"
        
        try:
            for package in requirements:
                logger.info(f"Installation de {package}...")
                result = subprocess.run(
                    [str(pip_path), "install", package],
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                
                if result.returncode != 0:
                    self.log_error(f"Échec installation {package}: {result.stderr}")
                    return False
                    
            logger.info("Toutes les dépendances sont installées")
            return True
            
        except subprocess.TimeoutExpired:
            self.log_error("Timeout lors de l'installation des dépendances")
            return False
        except Exception as e:
            self.log_error(f"Erreur installation dépendances: {e}")
            return False
            
    def setup_ssl(self):
        """Configure les certificats SSL"""
        logger.info("Configuration SSL...")
        
        ssl_script = self.install_dir / "scripts" / "generate_ssl.sh"
        ssl_cert = self.install_dir / "ssl" / "llmui.crt"
        
        if ssl_cert.exists():
            logger.info("Certificats SSL déjà présents")
            return True
            
        if not ssl_script.exists():
            self.log_warning("Script SSL non trouvé")
            return True  # Non critique
            
        try:
            subprocess.run(
                ["bash", str(ssl_script)],
                check=True,
                capture_output=True
            )
            logger.info("Certificats SSL générés")
            return True
        except subprocess.CalledProcessError as e:
            self.log_warning(f"Échec génération SSL: {e}")
            return True  # Non critique
            
    def create_configuration(self):
        """Crée les fichiers de configuration"""
        logger.info("Création de la configuration...")
        
        config_file = self.install_dir / "config.yaml"
        config_example = self.install_dir / "config.yaml.example"
        
        if config_file.exists():
            logger.info("Configuration déjà existante")
            return True
            
        if config_example.exists():
            try:
                shutil.copy(config_example, config_file)
                logger.info("Configuration créée depuis l'exemple")
                return True
            except Exception as e:
                self.log_warning(f"Échec copie configuration: {e}")
                
        # Créer une configuration minimale
        minimal_config = """
server:
  host: "0.0.0.0"
  port: 8000
  ssl_enabled: false

proxy:
  port: 9000
  backend_url: "http://localhost:8000"

security:
  jwt_secret: "change-this-secret-key"
  session_timeout: 3600

logging:
  level: "INFO"
  file: "llmui.log"
"""
        
        try:
            config_file.write_text(minimal_config)
            logger.info("Configuration minimale créée")
            return True
        except Exception as e:
            self.log_error(f"Échec création configuration: {e}")
            return False
            
    def verify_web_files(self):
        """Vérifie que les fichiers web essentiels existent"""
        logger.info("Vérification des fichiers web...")
        
        essential_files = [
            "index.html",
            "login.html",
            "app.js",
            "auth.js",
            "main.js",
            "base.css"
        ]
        
        missing_files = []
        for filename in essential_files:
            filepath = self.web_dir / filename
            if not filepath.exists():
                missing_files.append(filename)
                
        if missing_files:
            self.log_warning(f"Fichiers web manquants: {', '.join(missing_files)}")
            # Ne pas créer de fichiers minimaux - laisser les originaux
            return True
            
        logger.info("Tous les fichiers web essentiels sont présents")
        return True
        
    def start_services(self):
        """Démarre les services"""
        logger.info("Démarrage des services...")
        
        python_path = self.venv_dir / "bin" / "python"
        backend_script = self.install_dir / "src" / "llmui_backend.py"
        proxy_script = self.install_dir / "src" / "llmui_proxy.py"
        
        # Vérifier que les scripts existent
        if not backend_script.exists():
            self.log_error(f"Script backend non trouvé: {backend_script}")
            return False
            
        if not proxy_script.exists():
            self.log_error(f"Script proxy non trouvé: {proxy_script}")
            return False
            
        try:
            # Démarrer le backend
            logger.info("Démarrage du backend...")
            subprocess.Popen(
                [str(python_path), str(backend_script)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=str(self.install_dir)
            )
            
            # Attendre un peu
            import time
            time.sleep(2)
            
            # Vérifier que le backend répond
            try:
                import urllib.request
                urllib.request.urlopen("http://localhost:8000/health", timeout=5)
                logger.info("Backend démarré avec succès")
            except Exception as e:
                self.log_error(f"Le backend ne répond pas: {e}")
                return False
                
            # Démarrer le proxy
            logger.info("Démarrage du proxy...")
            subprocess.Popen(
                [str(python_path), str(proxy_script)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=str(self.install_dir)
            )
            
            time.sleep(2)
            
            # Vérifier que le proxy répond
            try:
                urllib.request.urlopen("http://localhost:9000/", timeout=5)
                logger.info("Proxy démarré avec succès")
            except Exception as e:
                self.log_error(f"Le proxy ne répond pas: {e}")
                return False
                
            return True
            
        except Exception as e:
            self.log_error(f"Erreur démarrage services: {e}")
            return False
            
    def run_installation(self):
        """Exécute l'installation complète"""
        logger.info("=== Début de l'installation LLMUI ===")
        
        steps = [
            ("Prérequis", self.check_prerequisites),
            ("Structure", self.create_directory_structure),
            ("Environnement virtuel", self.setup_virtual_environment),
            ("Dépendances", self.install_dependencies),
            ("SSL", self.setup_ssl),
            ("Configuration", self.create_configuration),
            ("Fichiers web", self.verify_web_files),
            ("Services", self.start_services)
        ]
        
        for step_name, step_func in steps:
            logger.info(f"\n--- Étape: {step_name} ---")
            if not step_func():
                logger.error(f"Échec de l'étape: {step_name}")
                return False
                
        logger.info("\n=== Installation terminée ===")
        return True
        
    def get_status(self):
        """Retourne le statut de l'installation"""
        return {
            "success": len(self.errors) == 0,
            "errors": self.errors,
            "warnings": self.warnings,
            "install_dir": str(self.install_dir),
            "web_url": "http://localhost:9000",
            "api_url": "http://localhost:8000"
        }

def main():
    """Point d'entrée principal"""
    installer = LLMUIInstaller()
    
    try:
        success = installer.run_installation()
        status = installer.get_status()
        
        # Afficher le résumé
        print("\n" + "="*60)
        if success:
            print("✅ Installation réussie !")
            print(f"\n🌐 Interface web: {status['web_url']}")
            print(f"🔧 API backend: {status['api_url']}")
        else:
            print("❌ L'installation a rencontré des erreurs")
            print("\nErreurs:")
            for error in status['errors']:
                print(f"  • {error}")
                
        if status['warnings']:
            print("\n⚠️  Avertissements:")
            for warning in status['warnings']:
                print(f"  • {warning}")
                
        print("="*60 + "\n")
        
        # Sortir avec le code approprié
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n\nInstallation interrompue par l'utilisateur")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Erreur fatale: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
