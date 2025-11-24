# Andy - Autonomous DevOps Assistant v0.5.0

Automated installation assistant for LLMUI Core developed by Génie IA Centre Opérationnel Sécurité inc.

## 🎯 Features

- ✓ **100% autonomous** - Follows commands step by step
- ✓ **Integrated SQLite database** - Stores commands, notes, corrections
- ✓ **Intelligent error handling** - Detects and adapts automatically
- ✓ **Multi-OS** - Supports apt, dnf, yum
- ✓ **WSL support** - Works on Windows via WSL2
- ✓ **Ollama installation** - Automatic with phi3, gemma2, granite4 models
- ✓ **Complete logging** - Total traceability
- ✓ **Post-installation verification** - Automatic tests

## 📋 Prerequisites

### Native Linux
- Debian/Ubuntu/RHEL/Rocky Linux
- Python 3.8+
- Root access (sudo)
- 20GB minimum disk space
- 4GB RAM minimum (8GB recommended)

### Windows via WSL
- Windows 10/11 with WSL2
- Ubuntu 20.04/22.04/24.04 distribution
- Python 3.8+ (installed automatically)
- 16GB RAM recommended (Windows + WSL)
- 30GB disk space

## 🪟 Installation on Windows (WSL)

### Initial WSL Setup

1. **Enable WSL2** (PowerShell as admin):
```powershell
wsl --install -d Ubuntu-22.04
```

2. **Restart Windows**

3. **Launch Ubuntu** and create your user

4. **Update the system**:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git python3 python3-pip
```

### Install LLMUI Core

Then follow the same steps as for Linux below!

## 🚀 Installation in 3 Steps

### Step 1: Base Installation
```bash
sudo python3 andy_installer.py
```

This step installs:
- OS update
- System dependencies (nginx, sqlite3, etc.)
- Ollama + LLM models
- Python virtual environment
- Systemd services (backend, proxy)
- Nginx configuration
- Firewall (UFW/firewalld)

**Andy will ask you for:**
- Username for LLMUI (default: llmui)
- Password for web interface

### Step 2: Source Deployment
```bash
sudo python3 andy_deploy_source.py
```

Options:
- **With Git**: Enter repository URL (public or private)
- **Manually**: Copy files to `/opt/llmui-core/`

Required structure:
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

### Step 3: Service Startup
```bash
sudo python3 andy_start_services.py
```

This step:
- Verifies presence of source files
- Starts systemd services
- Tests availability
- Displays access URL

## 📊 Generated Files

| File | Description |
|------|-------------|
| `/tmp/andy_install.log` | Complete installation log |
| `/tmp/andy_installation.db` | SQLite database with history |
| `/opt/llmui-core/` | LLMUI installation |
| `/etc/systemd/system/llmui-*.service` | Systemd services |
| `/etc/nginx/sites-available/llmui` | Nginx configuration |

## 🔍 Post-Installation Verification

### Service Status
```bash
sudo systemctl status llmui-backend
sudo systemctl status llmui-proxy
sudo systemctl status nginx
```

### Real-time Logs
```bash
# Backend
sudo journalctl -u llmui-backend -f

# Proxy
sudo journalctl -u llmui-proxy -f

# Nginx
sudo tail -f /var/log/nginx/llmui-access.log
```

### Interface Test

**Linux:**
```bash
curl -I http://localhost/
curl http://localhost/api/health
```

**Windows (from browser):**
```
http://localhost/
```

## 🔧 Useful Commands

### Restart Services
```bash
sudo systemctl restart llmui-backend
sudo systemctl restart llmui-proxy
sudo systemctl restart nginx
```

### Check Andy's Database
```bash
sqlite3 /tmp/andy_installation.db

# View executed commands
SELECT * FROM commands ORDER BY timestamp DESC;

# View Andy's notes
SELECT * FROM andy_notes ORDER BY timestamp DESC;

# View applied corrections
SELECT * FROM corrections ORDER BY timestamp DESC;
```

### Clean Reinstall
```bash
# Stop services
sudo systemctl stop llmui-backend llmui-proxy

# Remove installation
sudo rm -rf /opt/llmui-core
sudo userdel -r admin  # or chosen username

# Remove services
sudo rm /etc/systemd/system/llmui-*.service
sudo systemctl daemon-reload

# Restart installation
sudo python3 andy_installer.py
```

## 🐛 Troubleshooting

### Services Won't Start

1. Check logs:
```bash
sudo journalctl -u llmui-backend -n 50
```

2. Check permissions:
```bash
ls -la /opt/llmui-core/src/
```

3. Check virtual environment:
```bash
/opt/llmui-core/venv/bin/python --version
/opt/llmui-core/venv/bin/pip list
```

### Nginx Error 502

Backend probably not started:
```bash
sudo systemctl status llmui-backend
sudo journalctl -u llmui-backend -n 20
```

### Ollama Not Responding

```bash
ollama list
ollama ps
sudo systemctl status ollama
```

### Firewall Issues

```bash
# UFW
sudo ufw status verbose

# Firewalld
sudo firewall-cmd --list-all
```

### WSL-Specific Issues

#### WSL Won't Start
```powershell
# From PowerShell (admin)
wsl --shutdown
wsl --unregister Ubuntu-22.04
wsl --install -d Ubuntu-22.04
```

#### Out of Memory
Create `C:\Users\YourName\.wslconfig`:
```ini
[wsl2]
memory=8GB
processors=4
swap=4GB
```

Then restart WSL:
```powershell
wsl --shutdown
wsl
```

#### Services Don't Stay Active
```bash
# In WSL, check systemd
ps aux | grep systemd

# If systemd is not running, restart WSL
```

#### Network Access from Windows
```bash
# In WSL, get the IP
ip addr show eth0

# Then access from Windows:
# http://<WSL_IP>/
```

#### Windows Files to WSL
```bash
# Access Windows files from WSL
cd /mnt/c/Users/YourName/

# Access WSL files from Windows
# \\wsl$\Ubuntu-22.04\opt\llmui-core\
```

## 📝 Custom Configuration

### Modify LLMUI Configuration

Edit `/opt/llmui-core/config.yaml` then:
```bash
sudo systemctl restart llmui-backend llmui-proxy
```

### Add SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com
```

### Change Port

Edit `/etc/nginx/sites-available/llmui` and change `listen 80;`

## 🔐 Security

Andy automatically configures:
- Firewall with restrictive rules
- Nginx security headers
- Strict file permissions
- Systemd services with isolation

**Additional Recommendations:**
- Use SSL/TLS (certbot)
- Configure fail2ban for SSH
- Update OS regularly
- Use strong passwords

**WSL-Specific:**
- Windows Firewall already protects external access
- WSL ports are only accessible from Windows by default
- To expose services, configure Windows port forwarding

## 🪟 WSL Optimization

### Performance

```bash
# Free up cache memory
sudo sh -c "echo 3 > /proc/sys/vm/drop_caches"

# Check usage
free -h
df -h
```

### Recommended .wslconfig Configuration

`C:\Users\YourName\.wslconfig`:
```ini
[wsl2]
# Memory allocated to WSL
memory=8GB

# Number of processors
processors=4

# Swap (2x RAM)
swap=16GB

# Disable page reporting (better performance)
pageReporting=false

# Swap file location
swapFile=C:\\temp\\wsl-swap.vhdx
```

### Automatic Startup

Create a PowerShell script to start LLMUI at Windows startup:

`C:\Users\YourName\start-llmui.ps1`:
```powershell
wsl -d Ubuntu-22.04 -u root -- systemctl start llmui-backend
wsl -d Ubuntu-22.04 -u root -- systemctl start llmui-proxy
wsl -d Ubuntu-22.04 -u root -- systemctl start nginx
```

Add this script to Windows Task Scheduler.

## 📞 Support

- Logs: `/tmp/andy_install.log`
- Database: `/tmp/andy_installation.db`
- LLMUI Documentation: Check your Git repository

### WSL-Specific Support

- Microsoft Documentation: https://docs.microsoft.com/windows/wsl/
- Check version: `wsl --version`
- Update WSL: `wsl --update`

## 🎓 Andy Project Structure

```
andy_installer.py       # Base installation
andy_deploy_source.py   # Source file deployment
andy_start_services.py  # Service startup
README_ANDY.md          # This documentation
```

## 📜 License

Proprietary - Génie IA Centre Opérationnel Sécurité inc.

---

**Version:** 0.5.0  
**LLM Model:** qwen2.5:3b  
**Author:** François, Génie IA Centre Opérationnel Sécurité inc.  
**Date:** 2025-11-21  
**Platforms:** Linux, WSL2
