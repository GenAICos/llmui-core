# CLAUDE.md — LLMUI Core

> Contexte complet pour Claude Code — Technologies Nexios TF Inc.
> Référence : STANDARDS.md v1.7.0

---

## Description du projet

**LLMUI Core** est l'interface web de consultation multi-modèles de Technologies Nexios TF Inc.
Elle offre deux modes d'interaction avec des LLMs locaux via Ollama :

- **Mode Simple** : requête vers un seul modèle
- **Mode Consensus** : plusieurs modèles workers + un modèle merger qui synthétise

Zéro dépendance cloud. Tout tourne on-premise (Ollama local).

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Vanilla JavaScript + HTML5 + CSS custom |
| Backend | FastAPI (Python 3.11+) + Uvicorn |
| LLM | Ollama local (port 11434) |
| Base de données | PostgreSQL 16+ (SQLAlchemy async + Alembic) |
| Cache | Redis |
| Auth | Argon2 + JWT + TOTP (pyotp) |
| Web server | Nginx (reverse proxy) |
| OS cible | Debian 13 / Ubuntu 24.04 / Zorin OS 18 |

---

## Structure des fichiers

```
llmui-core/
├── web/                    ← Frontend (Vanilla JS)
│   ├── index.html          ← Page principale
│   ├── login.html          ← Page de connexion
│   ├── app.js              ← Logique principale (LLMUIApp)
│   ├── ui.js               ← Composants UI
│   ├── auth.js             ← Authentification
│   ├── session-guard.js    ← Protection de session
│   ├── andy.js             ← Widget support Andy
│   ├── andy.css            ← Styles widget Andy
│   ├── i18n.js             ← Internationalisation (6 langues)
│   ├── variables.css       ← Variables CSS (thème dark/light)
│   └── ...
├── src/                    ← Backend (FastAPI)
│   ├── llmui_backend.py    ← API principale
│   ├── llmui_proxy.py      ← Proxy + sessions
│   └── ...
├── images/                 ← Assets visuels
│   ├── Icon-Only-White.png ← Logo header (fond dégradé cyan/bleu)
│   └── andyLogo.png        ← Avatar Andy
├── postInstallScripts/     ← Scripts post-installation OBLIGATOIRES
├── scripts/                ← Scripts d'installation système
├── tests/                  ← Tests pytest
└── STANDARDS.md            ← Standards Nexios TF (autorité absolue)
```

---

## Commandes essentielles

```bash
# Démarrer le backend (développement)
cd /home/user/llmui-core && python3 src/llmui_backend.py

# Tests
python3 -m pytest tests/ -v --tb=short

# Linting Python
ruff check src/

# Vérifier Ollama
curl http://localhost:11434/api/tags
```

---

## Variables d'environnement

Seules ces 3 variables vont dans `.env` (voir `.env.example`) :

```env
DATABASE_URL=postgresql+asyncpg://llmui_user:CHANGEME@localhost:5432/llmui_core
APP_PORT=8004
APP_ENV=production
```

**Tout le reste** (SMTP, secrets JWT, config Andy, etc.) est dans PostgreSQL via `/zadmin`.

---

## Endpoints API principaux

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion (email + password) |
| GET | `/api/auth/verify` | Vérifier le token JWT |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/models` | Liste des modèles Ollama |
| POST | `/api/simple-generate` | Génération mode simple |
| POST | `/api/consensus-generate` | Génération mode consensus |
| GET | `/api/stats` | Statistiques système |
| POST | `/api/support/chat` | Chat Andy support |
| GET | `/health` | Health check |

---

## Standards à respecter (STANDARDS.md fait autorité)

### Ce qui est obligatoire
- **Argon2** pour tous les mots de passe (jamais bcrypt, SHA-256, MD5)
- **TOTP** obligatoire pour tous les admins
- **PostgreSQL 16+** uniquement (jamais SQLite, même en dev)
- **Ollama** uniquement pour les LLMs (jamais OpenAI, Anthropic, etc.)
- **CSS custom** uniquement (jamais Tailwind, Bootstrap)
- **Conventional Commits** pour tous les commits git
- Headers de copyright `// Copyright © Technologies Nexios TF Inc. — nexiostf.com` dans chaque fichier source
- Fichier `postInstallScripts/` obligatoire avec nginx_vhost.conf, create_database.sql, README.md

### Ce qui est interdit
- Docker / Docker Compose / Podman
- Services cloud (AWS, GCP, Azure, Vercel, etc.)
- SQLite
- APIs LLM externes (OpenAI, Anthropic, Mistral, etc.)
- Tailwind CSS, Bootstrap, jQuery
- `console.log()` en production
- `SELECT *` en SQL production
- Credentials hardcodés dans le code source

---

## Widget Andy Support

Andy est l'agent de support IA intégré. Caractéristiques :

- **Bouton flottant** (bottom-right) sur toutes les pages
- **Avatar** : `images/andyLogo.png`
- **Logo header** : `images/Icon-Only-White.png` (fond dégradé cyan→bleu)
- **API** : `POST /api/support/chat`
- **LLM** : Ollama `qwen3.5:0.8b` par défaut (configurable dans `/zadmin`)
- **Base de connaissance** : PostgreSQL table `andy_knowledge`
- Répond dans la langue de l'utilisateur
- Option "Parler à un humain" toujours visible

---

## Internationalisation

6 langues supportées : `fr` (primaire), `en` (primaire), `es`, `de`, `pt`, `ar` (RTL).
Aucun texte hardcodé dans l'UI — tout passe par `data-i18n` et `i18n.js`.

---

*Technologies Nexios TF Inc. — nexiostf.com — La Tuque, Québec, Canada*
