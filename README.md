# LLMUI Core v0.5.0

[![AGPL v3](https://img.shields.io/badge/AGPL%20v3-Open%20Source-green.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Commons Clause](https://img.shields.io/badge/Commons%20Clause-No%20Commercial-red.svg)](LICENSE)
[![Enterprise Clause](https://img.shields.io/badge/Enterprise-Publication%20Required-orange.svg)](ENTERPRISE_CLAUSE_EXPLAINED.md)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://python.org)
[![Platform](https://img.shields.io/badge/Platform-Linux-lightgrey.svg)](https://kernel.org)

> **Plateforme de consensus multi-modèles IA avec souveraineté numérique**

Développé par **Génie IA Centre Opérationnel Sécurité inc.** - Une solution québécoise pour l'intelligence artificielle locale et éthique.

---

## 🎯 Vue d'ensemble

LLMUI Core est une plateforme innovante de consensus entre plusieurs modèles de langage (LLM), permettant de:

- **Orchestrer plusieurs modèles IA** en parallèle (workers + mergers)
- **Obtenir des réponses par consensus** pour une qualité supérieure
- **Garantir la souveraineté numérique** - hébergement local, sans cloud
- **Intégrer des systèmes de mémoire avancés** (RAG, hybride)
- **Traiter des fichiers** (PDF, DOCX, images, etc.)
- **Maintenir l'historique complet** avec SQLite

### Architecture

```
┌─────────────┐
│   Nginx     │ ← Interface web (port 80/443)
└──────┬──────┘
       │
┌──────▼──────┐
│ llmui-proxy │ ← Gestion sessions, auth (port 8080)
└──────┬──────┘
       │
┌──────▼──────┐
│llmui-backend│ ← Orchestration LLM (port 5000)
└──────┬──────┘
       │
┌──────▼──────┐
│   Ollama    │ ← Modèles locaux (port 11434)
└─────────────┘
  • phi3:3.8b (worker)
  • gemma2:2b (worker)
  • granite4:micro-h (merger)
```

---

## 📋 Prérequis

### Matériel recommandé
- **CPU**: 4 cœurs minimum, 8+ recommandé
- **RAM**: 8GB minimum, 16GB+ recommandé
- **Disque**: 20GB minimum, 50GB+ recommandé
- **GPU**: Optionnel mais améliore les performances

### Système d'exploitation
- Debian 11/12
- Ubuntu 20.04/22.04/24.04
- Rocky Linux 8/9
- RHEL 8/9

### Logiciels
- Python 3.8+
- Accès root (sudo)
- Git

---

## 🚀 Installation rapide avec Andy

**Andy** est l'assistant DevOps autonome qui automatise l'installation complète de LLMUI Core.

### Installation en une commande

```bash
# Cloner le dépôt
git clone https://github.com/votre-repo/llmui-core.git
cd llmui-core

# Lancer l'installation interactive
sudo bash andy_setup.sh
```

### Installation complète automatique

```bash
# Installation en 3 étapes automatisées
sudo python3 andy_installer.py      # Étape 1: Base système
sudo python3 andy_deploy_source.py  # Étape 2: Fichiers source
sudo python3 andy_start_services.py # Étape 3: Services
```

Andy va automatiquement:
- ✅ Mettre à jour l'OS
- ✅ Installer Ollama + 3 modèles LLM
- ✅ Configurer Python + dépendances
- ✅ Créer les services systemd
- ✅ Configurer Nginx + SSL
- ✅ Configurer le pare-feu
- ✅ Vérifier l'installation

> **Note**: Andy vous demandera uniquement le nom d'utilisateur et le mot de passe pour l'interface LLMUI.

### Ce que fait Andy

1. **Installation de base** (`andy_installer.py`)
   - Détection automatique du système (apt/dnf/yum)
   - Installation des dépendances système
   - Installation d'Ollama et téléchargement des modèles
   - Création de l'environnement virtuel Python
   - Configuration des services systemd
   - Configuration Nginx et pare-feu

2. **Déploiement des sources** (`andy_deploy_source.py`)
   - Clone du dépôt Git (ou copie manuelle)
   - Installation des fichiers dans `/opt/llmui-core/`
   - Configuration des permissions

3. **Démarrage des services** (`andy_start_services.py`)
   - Activation des services systemd
   - Démarrage backend → proxy → nginx
   - Vérification de l'état des services
   - Test HTTP et affichage de l'URL d'accès

### Menu interactif (andy_setup.sh)

```
╔══════════════════════════════════════════════════════════════════════════╗
║                           MENU PRINCIPAL                                  ║
╚══════════════════════════════════════════════════════════════════════════╝

  [1] Installation complète (recommandé)
  [2] Installation de base uniquement
  [3] Déployer les fichiers source
  [4] Démarrer les services
  [5] Vérifier l'installation
  [6] Consulter les logs
  [7] Lire la documentation
  [Q] Quitter
```

---

## 📦 Structure du projet

```
llmui-core/
├── andy_setup.sh              # Menu interactif
├── andy_installer.py          # Installation base système
├── andy_deploy_source.py      # Déploiement sources
├── andy_start_services.py     # Démarrage services
├── README.md                  # Ce fichier
├── README_ANDY.md             # Documentation Andy
├── INSTALL.md                 # Guide installation détaillé
├── LICENSE                    # Licence propriétaire
│
├── src/                       # Code source backend
│   ├── llmui_backend.py      # Serveur FastAPI principal
│   ├── llmui_proxy.py        # Serveur proxy
│   ├── auth.py               # Authentification
│   ├── database.py           # Gestion SQLite
│   ├── memory.py             # Système mémoire
│   └── file_processor.py     # Traitement fichiers
│
├── web/                       # Interface web
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
│
├── config.yaml                # Configuration principale
├── requirements.txt           # Dépendances Python
│
└── docs/                      # Documentation
    ├── ARCHITECTURE.md
    ├── API.md
    ├── CONFIGURATION.md
    └── TROUBLESHOOTING.md
```

---

## 🔧 Configuration

### Fichier principal: `config.yaml`

```yaml
server:
  host: "0.0.0.0"
  port: 5000
  ssl_enabled: false

ollama:
  base_url: "http://localhost:11434"
  models:
    workers:
      - "phi3:3.8b"
      - "gemma2:2b"
    merger: "granite4:micro-h"

database:
  path: "/opt/llmui-core/data/llmui.db"

security:
  jwt_secret: "auto-generated"
  session_timeout: 3600
```

### Ports utilisés

| Service | Port | Description |
|---------|------|-------------|
| Nginx | 80/443 | Interface web |
| llmui-proxy | 8080 | Proxy + auth |
| llmui-backend | 5000 | API backend |
| Ollama | 11434 | Serveur LLM |

---

## 🎮 Utilisation

### Accès à l'interface

Une fois installé, accédez à LLMUI Core via votre navigateur:

```
http://VOTRE_IP/
```

L'IP du serveur est affichée à la fin de l'installation par Andy.

### Gestion des services

```bash
# Statut des services
sudo systemctl status llmui-backend
sudo systemctl status llmui-proxy
sudo systemctl status nginx

# Redémarrer les services
sudo systemctl restart llmui-backend
sudo systemctl restart llmui-proxy
sudo systemctl restart nginx

# Logs en temps réel
sudo journalctl -u llmui-backend -f
sudo journalctl -u llmui-proxy -f
```

### API REST

Documentation complète de l'API disponible dans [`docs/API.md`](docs/API.md).

Exemples d'endpoints:

```bash
# Health check
curl http://localhost:5000/api/health

# Liste des modèles
curl http://localhost:5000/api/models

# Nouvelle conversation
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Bonjour!", "user_id": "user123"}'
```

---

## 📊 Fonctionnalités

### ✨ Consensus multi-modèles

LLMUI Core utilise une approche unique:
1. **Workers analysent** le prompt en parallèle
2. **Merger synthétise** les réponses en consensus
3. **Qualité supérieure** grâce à la diversité des modèles

### 🧠 Système de mémoire avancé

- **Mémoire court terme**: Contexte de conversation
- **Mémoire long terme**: SQLite avec recherche sémantique
- **RAG (Retrieval-Augmented Generation)**: Base vectorielle
- **Mémoire hybride**: Combinaison intelligente

### 📁 Traitement de fichiers

Formats supportés:
- **Documents**: PDF, DOCX, TXT, MD
- **Images**: PNG, JPG, WEBP
- **Données**: CSV, JSON, YAML
- **Code**: Python, JavaScript, etc.

### 🔐 Sécurité

- **Authentification JWT**
- **Chiffrement des sessions**
- **Pare-feu configuré**
- **Headers de sécurité Nginx**
- **Isolation des services**
- **Permissions strictes**

---

## 📖 Documentation complète

- **[INSTALL.md](INSTALL.md)** - Guide d'installation détaillé
- **[README_ANDY.md](README_ANDY.md)** - Documentation Andy
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Architecture technique
- **[API.md](docs/API.md)** - Documentation API REST
- **[CONFIGURATION.md](docs/CONFIGURATION.md)** - Configuration avancée
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Dépannage

---

## 🐛 Dépannage rapide

### Les services ne démarrent pas

```bash
# Vérifier les logs
sudo journalctl -u llmui-backend -n 50
sudo journalctl -u llmui-proxy -n 50

# Vérifier les permissions
ls -la /opt/llmui-core/

# Vérifier l'environnement Python
/opt/llmui-core/venv/bin/python --version
/opt/llmui-core/venv/bin/pip list
```

### Nginx erreur 502

Le backend n'est pas démarré:
```bash
sudo systemctl status llmui-backend
sudo systemctl start llmui-backend
```

### Ollama ne répond pas

```bash
ollama list
ollama ps
sudo systemctl status ollama
sudo systemctl restart ollama
```

### Consulter les logs d'Andy

```bash
# Log d'installation
less /tmp/andy_install.log

# Base de données SQLite
sqlite3 /tmp/andy_installation.db
```

---

## 🔄 Mise à jour

```bash
# Sauvegarder la configuration
sudo cp /opt/llmui-core/config.yaml /opt/llmui-core/config.yaml.bak

# Arrêter les services
sudo systemctl stop llmui-backend llmui-proxy

# Mettre à jour le code
cd /path/to/llmui-core
git pull origin main

# Redéployer
sudo python3 andy_deploy_source.py

# Redémarrer
sudo python3 andy_start_services.py
```

---

## 🤝 Contribution

Ce projet est développé par **Francois Chalut**

Pour toute question ou contribution:
- **Email**: contact@llmui.org
- **Issues**: [GitHub Issues](https://github.com/GenAICos/llmui-core/issues)

---

## 📜 Licence

© 2025 Francois Chalut.

AGPLv3 + common clause

Voir [LICENSE](LICENSE) pour plus de détails.

---

## 🌟 Philosophie du projet

LLMUI Core s'inscrit dans une vision de **souveraineté numérique québécoise**:

- 🇨🇦 **Local d'abord**: Hébergement et contrôle complets
- 🔓 **Open Architecture**: Extensible et adaptable
- 🛡️ **Sécurité par conception**: Protection des données
- 🤖 **IA éthique**: Transparence et consensus
- 🌱 **Autonomie technologique**: Indépendance des GAFAM

---

## 📞 Support

**Documentation**: [GitHub Wiki](https://github.com/GenAICos/llmui-core/wiki)  
**Logs Andy**: `/tmp/andy_install.log`  
**Base de données Andy**: `/tmp/andy_installation.db`  
**Installation**: `/opt/llmui-core/`

---

**Développé avec 💙 au Québec par Francois Chalut**
