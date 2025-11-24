# LLMUI Core v0.5.0

[![AGPL v3](https://img.shields.io/badge/AGPL%20v3-Open%20Source-green.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Commons Clause](https://img.shields.io/badge/Commons%20Clause-No%20Commercial-red.svg)](LICENSE)
[![Enterprise Clause](https://img.shields.io/badge/Enterprise-Publication%20Required-orange.svg)](ENTERPRISE_CLAUSE_EXPLAINED.md)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://python.org)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20WSL-lightgrey.svg)](https://kernel.org)

> **Multi-model AI consensus platform with digital sovereignty**

Developed by **Francois Chalut** - A Quebec solution for local and ethical artificial intelligence.

---

## 🎯 Overview

LLMUI Core is an innovative consensus platform between multiple language models (LLMs), allowing you to:

- **Orchestrate multiple AI models** in parallel (workers + mergers)
- **Obtain consensus responses** for superior quality
- **Ensure digital sovereignty** - local hosting, no cloud
- **Integrate advanced memory systems** (RAG, hybrid)
- **Process files** (PDF, DOCX, images, etc.)
- **Maintain complete history** with SQLite

### Architecture

```
┌─────────────┐
│   Nginx     │ ← Web interface (port 80/443)
└──────┬──────┘
       │
┌──────▼──────┐
│ llmui-proxy │ ← Session management, auth (port 8080)
└──────┬──────┘
       │
┌──────▼──────┐
│llmui-backend│ ← LLM orchestration (port 5000)
└──────┬──────┘
       │
┌──────▼──────┐
│   Ollama    │ ← Local models (port 11434)
└─────────────┘
  • phi3:3.8b (worker)
  • gemma2:2b (worker)
  • granite4:micro-h (merger)
```

---

## 📋 Prerequisites

### Recommended Hardware
- **CPU**: 4 cores minimum, 8+ recommended
- **RAM**: 8GB minimum, 16GB+ recommended
- **Disk**: 20GB minimum, 50GB+ recommended
- **GPU**: Optional but greatly improves performance

### Operating System

#### Native Linux
- Debian 11/12
- Ubuntu 20.04/22.04/24.04
- Rocky Linux 8/9
- RHEL 8/9

#### Windows via WSL
- Windows 10/11 with WSL2 enabled
- Ubuntu 20.04/22.04/24.04 distribution in WSL
- 16GB RAM recommended for Windows + WSL

### Software
- Python 3.8+
- Root access (sudo)
- Git

---

## 🪟 Installation on Windows (WSL)

### Step 1: Enable WSL2

Open PowerShell as administrator:

```powershell
# Enable WSL
wsl --install

# Or if already installed, upgrade to WSL2
wsl --set-default-version 2

# Install Ubuntu
wsl --install -d Ubuntu-22.04
```

Restart your computer after installation.

### Step 2: WSL Configuration

Launch Ubuntu from the Start menu and configure your user.

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y git python3 python3-pip
```

### Step 3: Install LLMUI Core in WSL

```bash
# Clone the repository
git clone https://github.com/GenAICos/llmui-core.git
cd llmui-core

# Launch installation with Andy
sudo bash andy_setup.sh
```

### Access from Windows

Once installed in WSL, access the interface via:

```
http://localhost/
```

Windows browser can directly access WSL services!

### Important Notes for WSL

- **Performance**: WSL2 offers excellent performance but will consume Windows RAM
- **Files**: Access WSL files from Windows via `\\wsl$\Ubuntu-22.04\`
- **Network**: WSL ports are automatically forwarded to Windows
- **Memory**: Configure `.wslconfig` to limit RAM usage if needed

#### .wslconfig Configuration (optional)

Create `C:\Users\YourName\.wslconfig`:

```ini
[wsl2]
memory=8GB
processors=4
swap=4GB
```

---

## 🚀 Quick Installation with Andy

**Andy** is the autonomous DevOps assistant that automates the complete installation of LLMUI Core.

### One-Command Installation

```bash
# Clone repository
git clone https://github.com/GenAICos/llmui-core.git
cd llmui-core

# Launch interactive installation
sudo bash andy_setup.sh
```

### Complete Automatic Installation

```bash
# Installation in 3 automated steps
sudo python3 andy_installer.py      # Step 1: System base
sudo python3 andy_deploy_source.py  # Step 2: Source files
sudo python3 andy_start_services.py # Step 3: Services
```

Andy will automatically:
- ✅ Update OS
- ✅ Install Ollama + 3 LLM models
- ✅ Configure Python + dependencies
- ✅ Create systemd services
- ✅ Configure Nginx + SSL
- ✅ Configure firewall
- ✅ Verify installation

> **Note**: Andy will only ask you for the username and password for the LLMUI interface.

### What Andy Does

1. **Base Installation** (`andy_installer.py`)
   - Automatic system detection (apt/dnf/yum)
   - System dependency installation
   - Ollama installation and model download
   - Python virtual environment creation
   - Systemd service configuration
   - Nginx and firewall configuration

2. **Source Deployment** (`andy_deploy_source.py`)
   - Git repository clone (or manual copy)
   - File installation in `/opt/llmui-core/`
   - Permission configuration

3. **Service Startup** (`andy_start_services.py`)
   - Systemd service activation
   - Backend → proxy → nginx startup
   - Service status verification
   - HTTP test and access URL display

### Interactive Menu (andy_setup.sh)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                           MAIN MENU                                       ║
╚═══════════════════════════════════════════════════════════════════════════╝

  [1] Complete installation (recommended)
  [2] Base installation only
  [3] Deploy source files
  [4] Start services
  [5] Verify installation
  [6] View logs
  [7] Read documentation
  [Q] Quit
```

---

## 📦 Project Structure

```
llmui-core/
├── andy_setup.sh              # Interactive menu
├── andy_installer.py          # System base installation
├── andy_deploy_source.py      # Source deployment
├── andy_start_services.py     # Service startup
├── README.md                  # This file
├── README_ANDY.md             # Andy documentation
├── INSTALL.md                 # Detailed installation guide
├── LICENSE                    # Proprietary license
│
├── src/                       # Backend source code
│   ├── llmui_backend.py      # Main FastAPI server
│   ├── llmui_proxy.py        # Proxy server
│   ├── auth.py               # Authentication
│   ├── database.py           # SQLite management
│   ├── memory.py             # Memory system
│   └── file_processor.py     # File processing
│
├── web/                       # Web interface
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
│
├── config.yaml                # Main configuration
├── requirements.txt           # Python dependencies
│
└── docs/                      # Documentation
    ├── ARCHITECTURE.md
    ├── API.md
    ├── CONFIGURATION.md
    └── TROUBLESHOOTING.md
```

---

## 🔧 Configuration

### Main File: `config.yaml`

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

### Ports Used

| Service | Port | Description |
|---------|------|-------------|
| Nginx | 80/443 | Web interface |
| llmui-proxy | 8080 | Proxy + auth |
| llmui-backend | 5000 | Backend API |
| Ollama | 11434 | LLM server |

---

## 🎮 Usage

### Interface Access

Once installed, access LLMUI Core via your browser:

**Linux:**
```
http://YOUR_IP/
```

**Windows (WSL):**
```
http://localhost/
```

The server IP is displayed at the end of Andy's installation.

### Service Management

```bash
# Service status
sudo systemctl status llmui-backend
sudo systemctl status llmui-proxy
sudo systemctl status nginx

# Restart services
sudo systemctl restart llmui-backend
sudo systemctl restart llmui-proxy
sudo systemctl restart nginx

# Real-time logs
sudo journalctl -u llmui-backend -f
sudo journalctl -u llmui-proxy -f
```

### REST API

Complete API documentation available in [`docs/API.md`](docs/API.md).

Endpoint examples:

```bash
# Health check
curl http://localhost:5000/api/health

# Model list
curl http://localhost:5000/api/models

# New conversation
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "user_id": "user123"}'
```

---

## 📊 Features

### ✨ Multi-Model Consensus

LLMUI Core uses a unique approach:
1. **Workers analyze** the prompt in parallel
2. **Merger synthesizes** responses into consensus
3. **Superior quality** thanks to model diversity

### 🧠 Advanced Memory System

- **Short-term memory**: Conversation context

### 📄 File Processing

Supported formats:
- **Documents**: PDF, DOCX, TXT, MD
- **Images**: PNG, JPG, WEBP
- **Data**: CSV, JSON, YAML
- **Code**: Python, JavaScript, etc.

### 🔐 Security

- **JWT authentication**
- **Session encryption**
- **Configured firewall**
- **Nginx security headers**
- **Service isolation**
- **Strict permissions**

---

## 📖 Complete Documentation

- **[INSTALL.md](INSTALL.md)** - Detailed installation guide
- **[README_ANDY.md](README_ANDY.md)** - Andy documentation
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Technical architecture
- **[API.md](docs/API.md)** - REST API documentation
- **[CONFIGURATION.md](docs/CONFIGURATION.md)** - Advanced configuration
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Troubleshooting

---

## 🛠 Quick Troubleshooting

### Services Won't Start

```bash
# Check logs
sudo journalctl -u llmui-backend -n 50
sudo journalctl -u llmui-proxy -n 50

# Check permissions
ls -la /opt/llmui-core/

# Check Python environment
/opt/llmui-core/venv/bin/python --version
/opt/llmui-core/venv/bin/pip list
```

### Nginx Error 502

Backend not started:
```bash
sudo systemctl status llmui-backend
sudo systemctl start llmui-backend
```

### Ollama Not Responding

```bash
ollama list
ollama ps
sudo systemctl status ollama
sudo systemctl restart ollama
```

### WSL-Specific Issues

```bash
# Restart WSL from PowerShell (Windows)
wsl --shutdown
wsl

# Check WSL version
wsl --list --verbose

# Free up memory
sudo sh -c "echo 3 > /proc/sys/vm/drop_caches"
```

### View Andy Logs

```bash
# Installation log
less /tmp/andy_install.log

# SQLite database
sqlite3 /tmp/andy_installation.db
```

---

## 📄 Update

```bash
# Backup configuration
sudo cp /opt/llmui-core/config.yaml /opt/llmui-core/config.yaml.bak

# Stop services
sudo systemctl stop llmui-backend llmui-proxy

# Update code
cd /path/to/llmui-core
git pull origin main

# Redeploy
sudo python3 andy_deploy_source.py

# Restart
sudo python3 andy_start_services.py
```

---

## 🤝 Contribution

This project is developed by **Francois Chalut**

For any questions or contributions:
- **Email**: contact@llmui.org
- **Issues**: [GitHub Issues](https://github.com/GenAICos/llmui-core/issues)

---

## 📜 License

© 2025 Francois Chalut.

AGPLv3 + common clause

See [LICENSE](LICENSE) for more details.

---

## 🌟 Project Philosophy

LLMUI Core is part of a vision of **Quebec digital sovereignty**:

- 🇨🇦 **Local first**: Complete hosting and control
- 🔓 **Open Architecture**: Extensible and adaptable
- 🛡️ **Security by design**: Data protection
- 🤖 **Ethical AI**: Transparency and consensus
- 🌱 **Technological autonomy**: Independence from GAFAM

---

## 📞 Support

**Documentation**: [GitHub Wiki](https://github.com/GenAICos/llmui-core/wiki)  
**Andy Logs**: `/tmp/andy_install.log`  
**Andy Database**: `/tmp/andy_installation.db`  
**Installation**: `/opt/llmui-core/`

---

**Developed with 💙 in Quebec by Francois Chalut**
