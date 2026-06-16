# LLMUI Core v1.0.0

> **Sprache / Language:** [🇫🇷 Français](README.md) | [🇬🇧 English](README.en.md) | [🇪🇸 Español](README.es.md) | 🇩🇪 Deutsch | [🇵🇹 Português](README.pt.md) | [🇸🇦 العربية](README.ar.md)

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688.svg)](https://fastapi.tiangolo.com)
[![Ollama](https://img.shields.io/badge/Ollama-local-black.svg)](https://ollama.com)
[![PostgreSQL 16+](https://img.shields.io/badge/PostgreSQL-16%2B-336791.svg)](https://postgresql.org)
[![Platform](https://img.shields.io/badge/Platform-Debian%2013%20%7C%20Ubuntu%2024.04-lightgrey.svg)](https://debian.org)

> **Multi-Modell-KI-Konsens-Weboberfläche — digitale Souveränität on-premise**

Entwickelt von **François Chalut** — Technologies Nexios TF Inc.  
Keine Cloud-Abhängigkeiten. Läuft vollständig on-premise über lokales Ollama.

---

## Übersicht

LLMUI Core bietet zwei Interaktionsmodi mit lokalen LLMs:

- **Einfacher Modus**: direkte Anfrage an ein einzelnes Ollama-Modell
- **Konsensmodus**: mehrere Worker-Modelle analysieren parallel, ein Merger fasst zusammen

### Architektur

```
┌─────────────┐
│   Nginx     │  ← HTTPS-Reverse-Proxy (Port 80/443)
└──────┬──────┘
       │
┌──────▼──────────┐
│  llmui-core     │  ← FastAPI-API (Port 8004)
│   (FastAPI)     │
└──────┬──────────┘
       │
┌──────▼──────┐
│   Ollama    │  ← Lokale LLM-Modelle (Port 11434)
└─────────────┘
```

---

## Voraussetzungen

| Komponente | Version |
|------------|---------|
| Python | 3.11+ |
| PostgreSQL | 16+ |
| Ollama | 0.1+ |
| Nginx | 1.18+ |
| Betriebssystem | Debian 13 / Ubuntu 24.04 / Zorin OS 18 |

**Empfohlene Hardware:** 4 CPU-Kerne, 16 GB RAM, 50 GB Festplatte

---

## Installation

### 1. Repository klonen

```bash
git clone https://github.com/GenAICos/llmui-core.git
cd llmui-core
```

### 2. Python-Abhängigkeiten installieren

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Umgebung konfigurieren

```bash
cp .env.example .env
# .env mit Ihren Werten bearbeiten:
#   DATABASE_URL=postgresql+asyncpg://llmui_user:PASSWORT@localhost:5432/llmui_core
#   APP_PORT=8004
#   APP_ENV=production
```

### 4. PostgreSQL-Datenbank erstellen

```bash
# Sicheres Passwort generieren
openssl rand -hex 32

# postInstallScripts/create_database.sql bearbeiten, um DB_PASSWORD zu ersetzen
psql -U postgres -f postInstallScripts/create_database.sql
```

Siehe [`postInstallScripts/README.md`](postInstallScripts/README.md) für Details.

### 5. Administratorkonto erstellen

```bash
python3 scripts/create_admin.py
```

Das Skript fragt nach einer E-Mail-Adresse und einem Passwort (mindestens 12 Zeichen, Argon2-gehasht) und registriert das Admin-Konto in PostgreSQL. Die TOTP-Konfiguration (für Admins obligatorisch) wird beim ersten Login abgefragt.

### 6. Nginx konfigurieren

```bash
# Vhost kopieren und anpassen (DOMAIN und APP_PORT ersetzen)
cp postInstallScripts/nginx_vhost.conf /etc/nginx/sites-available/llmui-core
ln -s /etc/nginx/sites-available/llmui-core /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 7. Backend starten

```bash
python3 src/llmui_backend.py
```

Oder über systemd. Für eine vollständig automatisierte Installation (Voraussetzungen, PostgreSQL, **Erstellung des Administratorkontos**, systemd-Dienste, Firewall) verwenden Sie den interaktiven Installer — er fragt nach der Admin-E-Mail und dem Passwort und registriert sie in PostgreSQL:

```bash
sudo ./scripts/install_interactive.sh
```

---

## Andy-Widget — KI-Support

**Andy** ist der integrierte Support-Assistent, erreichbar von allen Seiten über einen schwebenden Button (unten rechts).

- **Avatar**: `images/andyLogo.png`
- **Modell**: Ollama `qwen3.5:0.8b` (konfigurierbar über `/zadmin`)
- **Endpoint**: `POST /api/support/chat`
- **Option** „Mit einem Menschen sprechen" immer sichtbar

Andy antwortet in der Sprache des Nutzers und überträgt niemals sensible Daten.

---

## Projektstruktur

```
llmui-core/
├── web/                        ← Frontend Vanilla JS + benutzerdefiniertes CSS
│   ├── index.html              ← Hauptseite
│   ├── login.html              ← Anmeldeseite
│   ├── app.js                  ← Hauptlogik (LLMUIApp)
│   ├── andy.js                 ← Andy-Support-Widget
│   ├── andy.css                ← Andy-Widget-Stile
│   ├── i18n.js                 ← Internationalisierung (6 Sprachen)
│   └── ...
├── src/                        ← FastAPI-Backend
│   ├── llmui_backend.py        ← Haupt-API
│   └── llmui_proxy.py          ← Proxy + Sitzungen
├── images/
│   ├── Icon-Only-White.png     ← Header-Logo
│   └── andyLogo.png            ← Andy-Avatar
├── postInstallScripts/         ← Post-Installationsskripte
│   ├── nginx_vhost.conf        ← Nginx HTTPS Vhost
│   ├── create_database.sql     ← PostgreSQL-DB-Erstellung (idempotent)
│   └── README.md               ← Anleitung
├── scripts/                    ← Systeminstallationsskripte
├── tests/                      ← pytest-Tests
├── docs/                       ← Technische Dokumentation
├── CLAUDE.md                   ← Projektkontext für Claude Code
├── STANDARDS.md                ← Nexios TF-Standards (absolute Autorität)
├── CHANGELOG.md                ← Versionshistorie
├── .env.example                ← Vorlage für Umgebungsvariablen
└── requirements.txt            ← Python-Abhängigkeiten
```

---

## API-Endpunkte

| Methode | Route | Auth | Beschreibung |
|---------|-------|------|--------------|
| POST | `/api/auth/login` | Nein | Anmeldung |
| GET | `/api/auth/verify` | Ja | Token verifizieren |
| POST | `/api/auth/logout` | Ja | Abmeldung |
| GET | `/api/models` | Ja | Ollama-Modelle auflisten |
| POST | `/api/simple-generate` | Ja | Einfacher Modus Generierung |
| POST | `/api/consensus-generate` | Ja | Konsens-Modus Generierung |
| GET | `/api/stats` | Nein | Systemstatistiken |
| POST | `/api/support/chat` | Ja | Andy-Support-Chat |
| GET | `/health` | Nein | Health-Check |

Vollständige Dokumentation: [`docs/API.md`](docs/API.md)

---

## Funktionen

### Multi-Modell-Konsens
1. **Workers** analysieren den Prompt parallel (2 bis 5 Modelle)
2. **Merger** fasst die Antworten zu einer konsolidierten Antwort zusammen
3. Konfigurierbare Timeouts: 15 Min. → 12 Std. (4 Stufen)

### Unterstützte Dateien
`.txt` `.md` `.py` `.js` `.json` `.csv` `.sh` `.css` `.html` `.xml` `.yaml` `.docx` `.xlsx` `.pdf`

### Internationalisierung
6 Sprachen: `fr` `en` `es` `de` `pt` `ar` (RTL)

### Sicherheit
- Argon2 für Passwörter (niemals bcrypt/SHA-256)
- JWT + sichere Sitzungen
- TOTP obligatorisch für Admins
- Nginx-Sicherheits-Header (HSTS, CSP, X-Frame-Options…)
- Hell-/Dunkel-Thema

---

## Dienstverwaltung

```bash
# Status
sudo systemctl status llmui-core nginx

# Live-Protokolle
sudo journalctl -u llmui-core -f

# Neustart
sudo systemctl restart llmui-core
```

## Entwicklung

```bash
# Backend starten
python3 src/llmui_backend.py

# Tests
python3 -m pytest tests/ -v --tb=short

# Linting
ruff check src/

# Ollama prüfen
curl http://localhost:11434/api/tags
```

---

## Dokumentation

| Datei | Inhalt |
|-------|--------|
| [`STANDARDS.md`](STANDARDS.md) | Nexios TF-Standards (absolute Autorität) |
| [`CHANGELOG.md`](CHANGELOG.md) | Versionshistorie |
| [`postInstallScripts/README.md`](postInstallScripts/README.md) | Post-Installationsskripte |
| [`docs/API.md`](docs/API.md) | REST-API-Dokumentation |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Technische Architektur |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Fehlerbehebung |

---

## Lizenz

© Technologies Nexios TF Inc. — nexiostf.com  
AGPLv3 + Commons Clause — siehe [`LICENSE`](LICENSE)

---

## Support

- **Issues**: [github.com/GenAICos/llmui-core/issues](https://github.com/GenAICos/llmui-core/issues)
- **E-Mail**: support@nexiostf.com

---

**Entwickelt in Quebec von François Chalut — für digitale Souveränität 🇨🇦**
