# LLMUI Core v1.0.0

> **Langue / Language:** 🇫🇷 Français | [🇬🇧 English](README.en.md) | [🇪🇸 Español](README.es.md) | [🇩🇪 Deutsch](README.de.md) | [🇵🇹 Português](README.pt.md) | [🇸🇦 العربية](README.ar.md)

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688.svg)](https://fastapi.tiangolo.com)
[![Ollama](https://img.shields.io/badge/Ollama-local-black.svg)](https://ollama.com)
[![PostgreSQL 16+](https://img.shields.io/badge/PostgreSQL-16%2B-336791.svg)](https://postgresql.org)
[![Platform](https://img.shields.io/badge/Platform-Debian%2013%20%7C%20Ubuntu%2024.04-lightgrey.svg)](https://debian.org)

> **Interface web de consensus multi-modèles IA — souveraineté numérique on-premise**

Développé par **François Chalut** — Technologies Nexios TF Inc.  
Zéro dépendance cloud. Tout tourne on-premise via Ollama local.

---

## Vue d'ensemble

LLMUI Core offre deux modes d'interaction avec des LLMs locaux :

- **Mode Simple** : requête directe vers un seul modèle Ollama
- **Mode Consensus** : plusieurs modèles workers analysent en parallèle, un merger synthétise

### Architecture

```
┌─────────────┐
│   Nginx     │  ← Reverse proxy HTTPS (port 80/443)
└──────┬──────┘
       │
┌──────▼──────────┐
│  llmui-core     │  ← API FastAPI (port 8004)
│   (FastAPI)     │
└──────┬──────────┘
       │
┌──────▼──────┐
│   Ollama    │  ← Modèles LLM locaux (port 11434)
└─────────────┘
```

---

## Prérequis

| Composant | Version |
|-----------|---------|
| Python | 3.11+ |
| PostgreSQL | 16+ |
| Ollama | 0.1+ |
| Nginx | 1.18+ |
| OS | Debian 13 / Ubuntu 24.04 / Zorin OS 18 |

**Matériel recommandé :** 4 cœurs CPU, 16 GB RAM, 50 GB disque

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/GenAICos/llmui-core.git
cd llmui-core
```

### 2. Installer les dépendances Python

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configurer l'environnement

```bash
cp .env.example .env
# Éditer .env avec vos valeurs :
#   DATABASE_URL=postgresql+asyncpg://llmui_user:MOTDEPASSE@localhost:5432/llmui_core
#   APP_PORT=8004
#   APP_ENV=production
```

### 4. Créer la base de données PostgreSQL

```bash
# Générer un mot de passe sécurisé
openssl rand -hex 32

# Éditer postInstallScripts/create_database.sql pour remplacer DB_PASSWORD
psql -U postgres -f postInstallScripts/create_database.sql
```

Voir [`postInstallScripts/README.md`](postInstallScripts/README.md) pour les détails.

### 5. Créer le compte administrateur

```bash
python3 scripts/create_admin.py
```

Le script demande un courriel et un mot de passe (12 caractères minimum, hashé en
Argon2) puis inscrit le compte admin dans PostgreSQL. La configuration TOTP
(obligatoire pour les admins) est ensuite demandée à la première connexion.

### 6. Configurer Nginx

```bash
# Copier et adapter le vhost (remplacer DOMAIN et APP_PORT)
cp postInstallScripts/nginx_vhost.conf /etc/nginx/sites-available/llmui-core
ln -s /etc/nginx/sites-available/llmui-core /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 7. Démarrer le backend

```bash
python3 src/llmui_backend.py
```

Ou via systemd. Pour une installation complète automatisée (prérequis, PostgreSQL,
**création du compte administrateur**, services systemd, pare-feu), utilisez
l'installateur interactif — il demande le courriel et le mot de passe de l'admin
puis les inscrit dans PostgreSQL :

```bash
sudo ./scripts/install_interactive.sh
```

---

## Widget Andy — Support IA

**Andy** est l'assistant de support intégré, accessible depuis toutes les pages via un bouton flottant (bas-droite).

- **Avatar** : `images/andyLogo.png`
- **Modèle** : Ollama `qwen3.5:0.8b` (configurable via `/zadmin`)
- **Endpoint** : `POST /api/support/chat`
- **Option** "Parler à un humain" toujours visible

Andy répond dans la langue de l'utilisateur et ne transmet jamais de données sensibles.

---

## Structure du projet

```
llmui-core/
├── web/                        ← Frontend Vanilla JS + CSS custom
│   ├── index.html              ← Page principale
│   ├── login.html              ← Page de connexion
│   ├── app.js                  ← Logique principale (LLMUIApp)
│   ├── andy.js                 ← Widget support Andy
│   ├── andy.css                ← Styles widget Andy
│   ├── i18n.js                 ← Internationalisation (6 langues)
│   └── ...
├── src/                        ← Backend FastAPI
│   ├── llmui_backend.py        ← API principale
│   └── llmui_proxy.py          ← Proxy + sessions
├── images/
│   ├── Icon-Only-White.png     ← Logo header
│   └── andyLogo.png            ← Avatar Andy
├── postInstallScripts/         ← Scripts post-installation
│   ├── nginx_vhost.conf        ← Vhost Nginx HTTPS
│   ├── create_database.sql     ← Création DB PostgreSQL (idempotent)
│   └── README.md               ← Instructions
├── scripts/                    ← Scripts d'installation système
├── tests/                      ← Tests pytest
├── docs/                       ← Documentation technique
├── CLAUDE.md                   ← Contexte projet pour Claude Code
├── STANDARDS.md                ← Standards Nexios TF (autorité absolue)
├── CHANGELOG.md                ← Historique des versions
├── .env.example                ← Template variables d'environnement
└── requirements.txt            ← Dépendances Python
```

---

## Endpoints API

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/login` | Non | Connexion |
| GET | `/api/auth/verify` | Oui | Vérifier le token |
| POST | `/api/auth/logout` | Oui | Déconnexion |
| GET | `/api/models` | Oui | Liste des modèles Ollama |
| POST | `/api/simple-generate` | Oui | Génération mode simple |
| POST | `/api/consensus-generate` | Oui | Génération mode consensus |
| GET | `/api/stats` | Non | Statistiques système |
| POST | `/api/support/chat` | Oui | Chat Andy support |
| GET | `/health` | Non | Health check |

Documentation complète : [`docs/API.md`](docs/API.md)

---

## Fonctionnalités

### Consensus multi-modèles
1. **Workers** analysent le prompt en parallèle (2 à 5 modèles)
2. **Merger** synthétise les réponses en une réponse consolidée
3. Timeouts configurables : 15 min → 12 h (4 niveaux)

### Fichiers supportés
`.txt` `.md` `.py` `.js` `.json` `.csv` `.sh` `.css` `.html` `.xml` `.yaml` `.docx` `.xlsx` `.pdf`

### Internationalisation
6 langues : `fr` `en` `es` `de` `pt` `ar` (RTL)

### Sécurité
- Argon2 pour les mots de passe (jamais bcrypt/SHA-256)
- JWT + sessions sécurisées
- TOTP obligatoire pour les admins
- Headers de sécurité Nginx (HSTS, CSP, X-Frame-Options…)
- Thème clair/sombre

---

## Gestion des services

```bash
# Statut
sudo systemctl status llmui-core nginx

# Logs en temps réel
sudo journalctl -u llmui-core -f

# Redémarrer
sudo systemctl restart llmui-core
```

## Développement

```bash
# Démarrer le backend
python3 src/llmui_backend.py

# Tests
python3 -m pytest tests/ -v --tb=short

# Linting
ruff check src/

# Vérifier Ollama
curl http://localhost:11434/api/tags
```

---

## Documentation

| Fichier | Contenu |
|---------|---------|
| [`STANDARDS.md`](STANDARDS.md) | Standards Nexios TF (autorité absolue) |
| [`CHANGELOG.md`](CHANGELOG.md) | Historique des versions |
| [`postInstallScripts/README.md`](postInstallScripts/README.md) | Scripts post-installation |
| [`docs/API.md`](docs/API.md) | Documentation API REST |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture technique |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Dépannage |

---

## Licence

© Technologies Nexios TF Inc. — nexiostf.com  
AGPLv3 + Commons Clause — voir [`LICENSE`](LICENSE)

---

## Support

- **Issues** : [github.com/GenAICos/llmui-core/issues](https://github.com/GenAICos/llmui-core/issues)
- **Email** : support@nexiostf.com

---

**Développé au Québec par François Chalut — pour la souveraineté numérique 🇨🇦**
