# LLMUI Core v1.0.0

> **Language / Langue:** [🇫🇷 Français](README.md) | 🇬🇧 English | [🇪🇸 Español](README.es.md) | [🇩🇪 Deutsch](README.de.md) | [🇵🇹 Português](README.pt.md) | [🇸🇦 العربية](README.ar.md)

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688.svg)](https://fastapi.tiangolo.com)
[![Ollama](https://img.shields.io/badge/Ollama-local-black.svg)](https://ollama.com)
[![PostgreSQL 16+](https://img.shields.io/badge/PostgreSQL-16%2B-336791.svg)](https://postgresql.org)
[![Platform](https://img.shields.io/badge/Platform-Debian%2013%20%7C%20Ubuntu%2024.04-lightgrey.svg)](https://debian.org)

> **Multi-model AI consensus web interface — on-premise digital sovereignty**

Developed by **François Chalut** — Technologies Nexios TF Inc.  
Zero cloud dependencies. Runs entirely on-premise via local Ollama.

---

## Overview

LLMUI Core offers two interaction modes with local LLMs:

- **Simple Mode**: direct request to a single Ollama model
- **Consensus Mode**: multiple worker models analyze in parallel, a merger synthesizes

### Architecture

```
┌─────────────┐
│   Nginx     │  ← HTTPS reverse proxy (port 80/443)
└──────┬──────┘
       │
┌──────▼──────────┐
│  llmui-core     │  ← FastAPI API (port 8004)
│   (FastAPI)     │
└──────┬──────────┘
       │
┌──────▼──────┐
│   Ollama    │  ← Local LLM models (port 11434)
└─────────────┘
```

---

## Prerequisites

| Component | Version |
|-----------|---------|
| Python | 3.11+ |
| PostgreSQL | 16+ |
| Ollama | 0.1+ |
| Nginx | 1.18+ |
| OS | Debian 13 / Ubuntu 24.04 / Zorin OS 18 |

**Recommended hardware:** 4 CPU cores, 16 GB RAM, 50 GB disk

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/GenAICos/llmui-core.git
cd llmui-core
```

### 2. Install Python dependencies

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure the environment

```bash
cp .env.example .env
# Edit .env with your values:
#   DATABASE_URL=postgresql+asyncpg://llmui_user:PASSWORD@localhost:5432/llmui_core
#   APP_PORT=8004
#   APP_ENV=production
```

### 4. Create the PostgreSQL database

```bash
# Generate a secure password
openssl rand -hex 32

# Edit postInstallScripts/create_database.sql to replace DB_PASSWORD
psql -U postgres -f postInstallScripts/create_database.sql
```

See [`postInstallScripts/README.md`](postInstallScripts/README.md) for details.

### 5. Create the administrator account

```bash
python3 scripts/create_admin.py
```

The script asks for an email and password (minimum 12 characters, Argon2 hashed) then registers the admin account in PostgreSQL. TOTP configuration (mandatory for admins) is prompted at first login.

### 6. Configure Nginx

```bash
# Copy and adapt the vhost (replace DOMAIN and APP_PORT)
cp postInstallScripts/nginx_vhost.conf /etc/nginx/sites-available/llmui-core
ln -s /etc/nginx/sites-available/llmui-core /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 7. Start the backend

```bash
python3 src/llmui_backend.py
```

Or via systemd. For a complete automated installation (prerequisites, PostgreSQL, **admin account creation**, systemd services, firewall), use the interactive installer — it asks for the admin email and password then registers them in PostgreSQL:

```bash
sudo ./scripts/install_interactive.sh
```

---

## Andy Widget — AI Support

**Andy** is the integrated support assistant, accessible from all pages via a floating button (bottom-right).

- **Avatar**: `images/andyLogo.png`
- **Model**: Ollama `qwen3.5:0.8b` (configurable via `/zadmin`)
- **Endpoint**: `POST /api/support/chat`
- **"Talk to a human"** option always visible

Andy responds in the user's language and never transmits sensitive data.

---

## Project Structure

```
llmui-core/
├── web/                        ← Frontend Vanilla JS + custom CSS
│   ├── index.html              ← Main page
│   ├── login.html              ← Login page
│   ├── app.js                  ← Main logic (LLMUIApp)
│   ├── andy.js                 ← Andy support widget
│   ├── andy.css                ← Andy widget styles
│   ├── i18n.js                 ← Internationalization (6 languages)
│   └── ...
├── src/                        ← FastAPI backend
│   ├── llmui_backend.py        ← Main API
│   └── llmui_proxy.py          ← Proxy + sessions
├── images/
│   ├── Icon-Only-White.png     ← Header logo
│   └── andyLogo.png            ← Andy avatar
├── postInstallScripts/         ← Post-installation scripts
│   ├── nginx_vhost.conf        ← Nginx HTTPS vhost
│   ├── create_database.sql     ← PostgreSQL DB creation (idempotent)
│   └── README.md               ← Instructions
├── scripts/                    ← System installation scripts
├── tests/                      ← pytest tests
├── docs/                       ← Technical documentation
├── CLAUDE.md                   ← Project context for Claude Code
├── STANDARDS.md                ← Nexios TF standards (absolute authority)
├── CHANGELOG.md                ← Version history
├── .env.example                ← Environment variables template
└── requirements.txt            ← Python dependencies
```

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/verify` | Yes | Verify token |
| POST | `/api/auth/logout` | Yes | Logout |
| GET | `/api/models` | Yes | List Ollama models |
| POST | `/api/simple-generate` | Yes | Simple mode generation |
| POST | `/api/consensus-generate` | Yes | Consensus mode generation |
| GET | `/api/stats` | No | System statistics |
| POST | `/api/support/chat` | Yes | Andy support chat |
| GET | `/health` | No | Health check |

Full documentation: [`docs/API.md`](docs/API.md)

---

## Features

### Multi-model Consensus
1. **Workers** analyze the prompt in parallel (2 to 5 models)
2. **Merger** synthesizes responses into a consolidated answer
3. Configurable timeouts: 15 min → 12 h (4 levels)

### Supported Files
`.txt` `.md` `.py` `.js` `.json` `.csv` `.sh` `.css` `.html` `.xml` `.yaml` `.docx` `.xlsx` `.pdf`

### Internationalization
6 languages: `fr` `en` `es` `de` `pt` `ar` (RTL)

### Security
- Argon2 for passwords (never bcrypt/SHA-256)
- JWT + secure sessions
- TOTP mandatory for admins
- Nginx security headers (HSTS, CSP, X-Frame-Options…)
- Light/dark theme

---

## Service Management

```bash
# Status
sudo systemctl status llmui-core nginx

# Live logs
sudo journalctl -u llmui-core -f

# Restart
sudo systemctl restart llmui-core
```

## Development

```bash
# Start the backend
python3 src/llmui_backend.py

# Tests
python3 -m pytest tests/ -v --tb=short

# Linting
ruff check src/

# Check Ollama
curl http://localhost:11434/api/tags
```

---

## Documentation

| File | Content |
|------|---------|
| [`STANDARDS.md`](STANDARDS.md) | Nexios TF standards (absolute authority) |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |
| [`postInstallScripts/README.md`](postInstallScripts/README.md) | Post-installation scripts |
| [`docs/API.md`](docs/API.md) | REST API documentation |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Technical architecture |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Troubleshooting |

---

## License

© Technologies Nexios TF Inc. — nexiostf.com  
AGPLv3 + Commons Clause — see [`LICENSE`](LICENSE)

---

## Support

- **Issues**: [github.com/GenAICos/llmui-core/issues](https://github.com/GenAICos/llmui-core/issues)
- **Email**: support@nexiostf.com

---

**Developed in Quebec by François Chalut — for digital sovereignty 🇨🇦**
