# Andy - Assistant DevOps Autonome v0.5.0

Assistant d'installation automatisé pour LLMUI Core développé par Génie IA Centre Opérationnel Sécurité inc.

## 🎯 Caractéristiques

- ✓ **100% autonome** - Suit les commandes pas à pas
- ✓ **Base SQLite intégrée** - Stocke commandes, notes, corrections
- ✓ **Gestion d'erreurs intelligente** - Détecte et adapte automatiquement
- ✓ **Multi-OS** - Support apt, dnf, yum
- ✓ **Support WSL** - Fonctionne sur Windows via WSL2
- ✓ **Installation Ollama** - Automatique avec modèles phi3, gemma2, granite4
- ✓ **Logging complet** - Traçabilité totale
- ✓ **Vérification post-installation** - Tests automatiques

## 📋 Prérequis

### Linux natif
- Debian/Ubuntu/RHEL/Rocky Linux
- Python 3.8+
- Accès root (sudo)
- 20GB d'espace disque minimum
- 4GB RAM minimum (8GB recommandé)

### Windows via WSL
- Windows 10/11 avec WSL2
- Distribution Ubuntu 20.04/22.04/24.04
- Python 3.8+ (installé automatiquement)
- 16GB RAM recommandés (Windows + WSL)
- 30GB d'espace disque

## 🪟 Installation sur Windows (WSL)

### Configuration initiale WSL

1. **Activer WSL2** (PowerShell en admin):
```powershell
wsl --install -d Ubuntu-22.04
```

2. **Redémarrer Windows**

3. **Lancer Ubuntu** et créer votre utilisateur

4. **Mettre à jour le système**:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git python3 python3-pip
```

### Installation LLMUI Core

Suivez ensuite les mêmes étapes que pour Linux ci-dessous!

## 🚀 Installation en 3 étapes

### Étape 1: Installation de base
```bash
sudo python3 andy_installer.py
```

Cette étape installe:
- Mise à jour OS
- Dépendances système (nginx, sqlite3, etc.)
- Ollama + modèles LLM
- Environnement virtuel Python
- Services systemd (backend, proxy)
- Configuration Nginx
- Pare-feu (UFW/firewalld)

**Andy vous demandera:**
- Nom d'utilisateur pour LLMUI (défaut: llmui)
- Mot de passe pour l'interface web

### Étape 2: Déploiement des sources
```bash
sudo python3 andy_deploy_source.py
```

Options:
- **Avec Git**: Entrez l'URL du dépôt (public ou privé)
- **Manuellement**: Copiez les fichiers vers `/opt/llmui-core/`

Structure requise:
```
/opt/llmui-core/
├── src/
│   ├── llmui_backend.py
│   ├── llmui_proxy.py
│   └── ...
├── web/
│   ├── index.html
│   └── ...
└── config.yaml
```

### Étape 3: Démarrage des services
```bash
sudo python3 andy_start_services.py
```

Cette étape:
- Vérifie la présence des fichiers source
- Démarre les services systemd
- Teste la disponibilité
- Affiche l'URL d'accès

## 📊 Fichiers générés

| Fichier | Description |
|---------|-------------|
| `/tmp/andy_install.log` | Log complet de l'installation |
| `/tmp/andy_installation.db` | Base SQLite avec historique |
| `/opt/llmui-core/` | Installation LLMUI |
| `/etc/systemd/system/llmui-*.service` | Services systemd |
| `/etc/nginx/sites-available/llmui` | Configuration Nginx |

## 🔍 Vérifications post-installation

### Statut des services
```bash
sudo systemctl status llmui-backend
sudo systemctl status llmui-proxy
sudo systemctl status nginx
```

### Logs en temps réel
```bash
# Backend
sudo journalctl -u llmui-backend -f

# Proxy
sudo journalctl -u llmui-proxy -f

# Nginx
sudo tail -f /var/log/nginx/llmui-access.log
```

### Test de l'interface

**Linux:**
```bash
curl -I http://localhost/
curl http://localhost/api/health
```

**Windows (depuis le navigateur):**
```
http://localhost/
```

## 🔧 Commandes utiles

### Redémarrer les services
```bash
sudo systemctl restart llmui-backend
sudo systemctl restart llmui-proxy
sudo systemctl restart nginx
```

### Consulter la base de données d'Andy
```bash
sqlite3 /tmp/andy_installation.db

# Voir les commandes exécutées
SELECT * FROM commands ORDER BY timestamp DESC;

# Voir les notes d'Andy
SELECT * FROM andy_notes ORDER BY timestamp DESC;

# Voir les corrections appliquées
SELECT * FROM corrections ORDER BY timestamp DESC;
```

### Réinstaller proprement
```bash
# Arrêter les services
sudo systemctl stop llmui-backend llmui-proxy

# Supprimer l'installation
sudo rm -rf /opt/llmui-core
sudo userdel -r admin  # ou le nom d'utilisateur choisi

# Supprimer les services
sudo rm /etc/systemd/system/llmui-*.service
sudo systemctl daemon-reload

# Relancer l'installation
sudo python3 andy_installer.py
```

## 🐛 Dépannage

### Les services ne démarrent pas

1. Vérifier les logs:
```bash
sudo journalctl -u llmui-backend -n 50
```

2. Vérifier les permissions:
```bash
ls -la /opt/llmui-core/src/
```

3. Vérifier l'environnement virtuel:
```bash
/opt/llmui-core/venv/bin/python --version
/opt/llmui-core/venv/bin/pip list
```

### Nginx erreur 502

Le backend n'est probablement pas démarré:
```bash
sudo systemctl status llmui-backend
sudo journalctl -u llmui-backend -n 20
```

### Ollama ne répond pas

```bash
ollama list
ollama ps
sudo systemctl status ollama
```

### Problèmes de pare-feu

```bash
# UFW
sudo ufw status verbose

# Firewalld
sudo firewall-cmd --list-all
```

### Problèmes spécifiques WSL

#### WSL ne démarre pas
```powershell
# Depuis PowerShell (admin)
wsl --shutdown
wsl --unregister Ubuntu-22.04
wsl --install -d Ubuntu-22.04
```

#### Manque de mémoire
Créez `C:\Users\VotreNom\.wslconfig`:
```ini
[wsl2]
memory=8GB
processors=4
swap=4GB
```

Puis redémarrez WSL:
```powershell
wsl --shutdown
wsl
```

#### Services qui ne restent pas actifs
```bash
# Dans WSL, vérifier systemd
ps aux | grep systemd

# Si systemd ne tourne pas, redémarrer WSL
```

#### Accès réseau depuis Windows
```bash
# Dans WSL, obtenir l'IP
ip addr show eth0

# Puis accéder depuis Windows:
# http://<IP_WSL>/
```

#### Fichiers Windows vers WSL
```bash
# Accéder aux fichiers Windows depuis WSL
cd /mnt/c/Users/VotreNom/

# Accéder aux fichiers WSL depuis Windows
# \\wsl$\Ubuntu-22.04\opt\llmui-core\
```

## 📝 Configuration personnalisée

### Modifier la configuration LLMUI

Éditez `/opt/llmui-core/config.yaml` puis:
```bash
sudo systemctl restart llmui-backend llmui-proxy
```

### Ajouter un certificat SSL

```bash
sudo certbot --nginx -d votre-domaine.com
```

### Changer le port

Éditez `/etc/nginx/sites-available/llmui` et changez `listen 80;`

## 🔐 Sécurité

Andy configure automatiquement:
- Pare-feu avec règles restrictives
- Headers de sécurité Nginx
- Permissions strictes sur les fichiers
- Services systemd avec isolation

**Recommandations supplémentaires:**
- Utilisez SSL/TLS (certbot)
- Configurez fail2ban pour le SSH
- Mettez à jour régulièrement l'OS
- Utilisez des mots de passe forts

**Spécifique à WSL:**
- Le pare-feu Windows protège déjà l'accès externe
- Les ports WSL ne sont accessibles que depuis Windows par défaut
- Pour exposer les services, configurez le port forwarding Windows

## 🪟 Optimisation WSL

### Performances

```bash
# Libérer la mémoire cache
sudo sh -c "echo 3 > /proc/sys/vm/drop_caches"

# Vérifier l'utilisation
free -h
df -h
```

### Configuration .wslconfig recommandée

`C:\Users\VotreNom\.wslconfig`:
```ini
[wsl2]
# Mémoire allouée à WSL
memory=8GB

# Nombre de processeurs
processors=4

# Swap (2x la RAM)
swap=16GB

# Désactiver la mémoire paginée (meilleure performance)
pageReporting=false

# Localisation du swap
swapFile=C:\\temp\\wsl-swap.vhdx
```

### Démarrage automatique

Créez un script PowerShell pour démarrer LLMUI au démarrage de Windows:

`C:\Users\VotreNom\start-llmui.ps1`:
```powershell
wsl -d Ubuntu-22.04 -u root -- systemctl start llmui-backend
wsl -d Ubuntu-22.04 -u root -- systemctl start llmui-proxy
wsl -d Ubuntu-22.04 -u root -- systemctl start nginx
```

Ajoutez ce script au Planificateur de tâches Windows.

## 📞 Support

- Logs: `/tmp/andy_install.log`
- Base de données: `/tmp/andy_installation.db`
- Documentation LLMUI: Consultez votre dépôt Git

### Support WSL spécifique

- Documentation Microsoft: https://docs.microsoft.com/windows/wsl/
- Vérifier la version: `wsl --version`
- Mettre à jour WSL: `wsl --update`

## 🎓 Structure du projet Andy

```
andy_installer.py       # Installation de base
andy_deploy_source.py   # Déploiement fichiers source
andy_start_services.py  # Démarrage services
README_ANDY.md          # Cette documentation
```

## 📜 Licence

Propriétaire - Génie IA Centre Opérationnel Sécurité inc.

---

**Version:** 0.5.0  
**Modèle LLM:** qwen2.5:3b  
**Auteur:** François, Génie IA Centre Opérationnel Sécurité inc.  
**Date:** 2025-11-21  
**Plateformes:** Linux, WSL2
