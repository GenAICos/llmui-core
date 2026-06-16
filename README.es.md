# LLMUI Core v1.0.0

> **Idioma / Language:** [🇫🇷 Français](README.md) | [🇬🇧 English](README.en.md) | 🇪🇸 Español | [🇩🇪 Deutsch](README.de.md) | [🇵🇹 Português](README.pt.md) | [🇸🇦 العربية](README.ar.md)

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688.svg)](https://fastapi.tiangolo.com)
[![Ollama](https://img.shields.io/badge/Ollama-local-black.svg)](https://ollama.com)
[![PostgreSQL 16+](https://img.shields.io/badge/PostgreSQL-16%2B-336791.svg)](https://postgresql.org)
[![Platform](https://img.shields.io/badge/Platform-Debian%2013%20%7C%20Ubuntu%2024.04-lightgrey.svg)](https://debian.org)

> **Interfaz web de consenso multi-modelo IA — soberanía digital on-premise**

Desarrollado por **François Chalut** — Technologies Nexios TF Inc.  
Cero dependencias en la nube. Todo funciona on-premise mediante Ollama local.

---

## Visión general

LLMUI Core ofrece dos modos de interacción con LLMs locales:

- **Modo Simple**: solicitud directa a un único modelo Ollama
- **Modo Consenso**: varios modelos workers analizan en paralelo, un merger sintetiza

### Arquitectura

```
┌─────────────┐
│   Nginx     │  ← Proxy inverso HTTPS (puerto 80/443)
└──────┬──────┘
       │
┌──────▼──────────┐
│  llmui-core     │  ← API FastAPI (puerto 8004)
│   (FastAPI)     │
└──────┬──────────┘
       │
┌──────▼──────┐
│   Ollama    │  ← Modelos LLM locales (puerto 11434)
└─────────────┘
```

---

## Requisitos previos

| Componente | Versión |
|------------|---------|
| Python | 3.11+ |
| PostgreSQL | 16+ |
| Ollama | 0.1+ |
| Nginx | 1.18+ |
| SO | Debian 13 / Ubuntu 24.04 / Zorin OS 18 |

**Hardware recomendado:** 4 núcleos CPU, 16 GB RAM, 50 GB de disco

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/GenAICos/llmui-core.git
cd llmui-core
```

### 2. Instalar las dependencias Python

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configurar el entorno

```bash
cp .env.example .env
# Editar .env con sus valores:
#   DATABASE_URL=postgresql+asyncpg://llmui_user:CONTRASEÑA@localhost:5432/llmui_core
#   APP_PORT=8004
#   APP_ENV=production
```

### 4. Crear la base de datos PostgreSQL

```bash
# Generar una contraseña segura
openssl rand -hex 32

# Editar postInstallScripts/create_database.sql para reemplazar DB_PASSWORD
psql -U postgres -f postInstallScripts/create_database.sql
```

Ver [`postInstallScripts/README.md`](postInstallScripts/README.md) para más detalles.

### 5. Crear la cuenta de administrador

```bash
python3 scripts/create_admin.py
```

El script solicita un correo electrónico y una contraseña (mínimo 12 caracteres, cifrada con Argon2) y registra la cuenta de administrador en PostgreSQL. La configuración TOTP (obligatoria para los administradores) se solicita en el primer inicio de sesión.

### 6. Configurar Nginx

```bash
# Copiar y adaptar el vhost (reemplazar DOMAIN y APP_PORT)
cp postInstallScripts/nginx_vhost.conf /etc/nginx/sites-available/llmui-core
ln -s /etc/nginx/sites-available/llmui-core /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 7. Iniciar el backend

```bash
python3 src/llmui_backend.py
```

O mediante systemd. Para una instalación automatizada completa (requisitos previos, PostgreSQL, **creación de la cuenta de administrador**, servicios systemd, cortafuegos), utilice el instalador interactivo — solicita el correo y la contraseña del administrador y los registra en PostgreSQL:

```bash
sudo ./scripts/install_interactive.sh
```

---

## Widget Andy — Soporte IA

**Andy** es el asistente de soporte integrado, accesible desde todas las páginas mediante un botón flotante (abajo a la derecha).

- **Avatar**: `images/andyLogo.png`
- **Modelo**: Ollama `qwen3.5:0.8b` (configurable vía `/zadmin`)
- **Endpoint**: `POST /api/support/chat`
- **Opción** "Hablar con un humano" siempre visible

Andy responde en el idioma del usuario y nunca transmite datos sensibles.

---

## Estructura del proyecto

```
llmui-core/
├── web/                        ← Frontend Vanilla JS + CSS personalizado
│   ├── index.html              ← Página principal
│   ├── login.html              ← Página de inicio de sesión
│   ├── app.js                  ← Lógica principal (LLMUIApp)
│   ├── andy.js                 ← Widget de soporte Andy
│   ├── andy.css                ← Estilos del widget Andy
│   ├── i18n.js                 ← Internacionalización (6 idiomas)
│   └── ...
├── src/                        ← Backend FastAPI
│   ├── llmui_backend.py        ← API principal
│   └── llmui_proxy.py          ← Proxy + sesiones
├── images/
│   ├── Icon-Only-White.png     ← Logo del encabezado
│   └── andyLogo.png            ← Avatar de Andy
├── postInstallScripts/         ← Scripts post-instalación
│   ├── nginx_vhost.conf        ← Vhost Nginx HTTPS
│   ├── create_database.sql     ← Creación DB PostgreSQL (idempotente)
│   └── README.md               ← Instrucciones
├── scripts/                    ← Scripts de instalación del sistema
├── tests/                      ← Tests pytest
├── docs/                       ← Documentación técnica
├── CLAUDE.md                   ← Contexto del proyecto para Claude Code
├── STANDARDS.md                ← Estándares Nexios TF (autoridad absoluta)
├── CHANGELOG.md                ← Historial de versiones
├── .env.example                ← Plantilla de variables de entorno
└── requirements.txt            ← Dependencias Python
```

---

## Endpoints de la API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Inicio de sesión |
| GET | `/api/auth/verify` | Sí | Verificar token |
| POST | `/api/auth/logout` | Sí | Cierre de sesión |
| GET | `/api/models` | Sí | Lista de modelos Ollama |
| POST | `/api/simple-generate` | Sí | Generación modo simple |
| POST | `/api/consensus-generate` | Sí | Generación modo consenso |
| GET | `/api/stats` | No | Estadísticas del sistema |
| POST | `/api/support/chat` | Sí | Chat de soporte Andy |
| GET | `/health` | No | Health check |

Documentación completa: [`docs/API.md`](docs/API.md)

---

## Funcionalidades

### Consenso multi-modelo
1. **Workers** analizan el prompt en paralelo (2 a 5 modelos)
2. **Merger** sintetiza las respuestas en una respuesta consolidada
3. Tiempos de espera configurables: 15 min → 12 h (4 niveles)

### Archivos compatibles
`.txt` `.md` `.py` `.js` `.json` `.csv` `.sh` `.css` `.html` `.xml` `.yaml` `.docx` `.xlsx` `.pdf`

### Internacionalización
6 idiomas: `fr` `en` `es` `de` `pt` `ar` (RTL)

### Seguridad
- Argon2 para contraseñas (nunca bcrypt/SHA-256)
- JWT + sesiones seguras
- TOTP obligatorio para administradores
- Cabeceras de seguridad Nginx (HSTS, CSP, X-Frame-Options…)
- Tema claro/oscuro

---

## Gestión de servicios

```bash
# Estado
sudo systemctl status llmui-core nginx

# Logs en tiempo real
sudo journalctl -u llmui-core -f

# Reiniciar
sudo systemctl restart llmui-core
```

## Desarrollo

```bash
# Iniciar el backend
python3 src/llmui_backend.py

# Tests
python3 -m pytest tests/ -v --tb=short

# Linting
ruff check src/

# Verificar Ollama
curl http://localhost:11434/api/tags
```

---

## Documentación

| Archivo | Contenido |
|---------|-----------|
| [`STANDARDS.md`](STANDARDS.md) | Estándares Nexios TF (autoridad absoluta) |
| [`CHANGELOG.md`](CHANGELOG.md) | Historial de versiones |
| [`postInstallScripts/README.md`](postInstallScripts/README.md) | Scripts post-instalación |
| [`docs/API.md`](docs/API.md) | Documentación API REST |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitectura técnica |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Resolución de problemas |

---

## Licencia

© Technologies Nexios TF Inc. — nexiostf.com  
AGPLv3 + Commons Clause — ver [`LICENSE`](LICENSE)

---

## Soporte

- **Issues**: [github.com/GenAICos/llmui-core/issues](https://github.com/GenAICos/llmui-core/issues)
- **Email**: support@nexiostf.com

---

**Desarrollado en Quebec por François Chalut — por la soberanía digital 🇨🇦**
