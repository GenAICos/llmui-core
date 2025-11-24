# 🎯 Three Ways to Install LLMUI Core v0.5.0

LLMUI Core offers **3 installation methods** to suit all comfort levels and needs.

---

## 🤖 Method 1: Andy (Automatic) - Recommended

**For**: New users, quick installations, production

### Files
- `andy_setup.sh` - Interactive menu
- `andy_installer.py` - Automatic installation
- `andy_deploy_source.py` - Source deployment
- `andy_start_services.py` - Service management

### Features
✅ **100% Automatic** - Installation in 3 commands  
✅ **Intelligent detection** - Identifies apt/dnf/yum automatically  
✅ **Error handling** - Fixes problems automatically  
✅ **Traceability** - SQLite database with complete history  
✅ **Interactive menu** - Modular options (install, verify, logs)  
✅ **Multi-OS** - Debian, Ubuntu, Rocky, RHEL  

### Complete Installation
```bash
# Option A: Interactive menu (recommended for beginners)
sudo bash andy_setup.sh
# → Choose [1] Complete Installation

# Option B: Command line (for scripts)
sudo python3 andy_installer.py      # Step 1: System base
sudo python3 andy_deploy_source.py  # Step 2: Source files
sudo python3 andy_start_services.py # Step 3: Services
```

### Duration
- **Total**: 15-30 minutes (depending on connection)
- **Interaction**: 2 minutes (username + password)
- **Rest**: 100% automatic

### Advantages
- 🚀 Fastest
- 🧠 Smartest
- 🔒 Most secure (traceability database)
- 📊 Detailed report at the end
- 🛡️ Automatic backup before modifications

### Documentation
- `README_ANDY.md` - Complete Andy documentation
- `ANDY_INTERACTIVE.md` - Interactive menu guide

---

## 📚 Method 2: Interactive Guided - For the Cautious

**For**: Those who want to understand each step, learning, total control

### Files
- `scripts/install_interactive.sh` - **Step-by-step guided installation**
- `scripts/install.sh` - Classic installation
- `scripts/install_backend.py` - Python backend

### Features
✅ **Detailed explanations** at each step  
✅ **Confirmation** before each action  
✅ **Ability to skip** steps  
✅ **Educational** - Perfect for learning  
✅ **Flexibility** - Customize installation  

### Guided Installation
```bash
# Launch interactive assistant
sudo bash scripts/install_interactive.sh

# The assistant will guide you through:
# 1. Prerequisites verification
# 2. Dependencies installation (with confirmation)
# 3. Ollama + models configuration (with explanations)
# 4. Systemd services configuration (step by step)
# 5. Nginx configuration (with options)
# 6. Firewall configuration (with choices)
# 7. Final verification (with tests)
```

### Interaction Example
```
┌─────────────────────────────────────────────┐
│ Step 2/7: Dependencies Installation        │
└─────────────────────────────────────────────┘

This step will install:
  • Python 3.8+ and pip
  • Nginx for reverse proxy
  • SQLite3 for database
  • Compilation tools

Do you want to continue? [Y/n]: Y
Install development tools too? [Y/n]: Y
```

### Duration
- **Total**: 20-40 minutes
- **Interaction**: 10-15 minutes (choices and confirmations)
- **Waiting**: 10-25 minutes

### Advantages
- 📖 Educational - You understand what's happening
- 🎛️ Control - Choice at each step
- ✋ Pause - Take time to read
- 📝 Transparency - No hidden actions
- 🎓 Perfect for learning Linux/DevOps

### For Whom?
- First steps with Linux
- Administrators wanting to understand architecture
- Custom installations
- Learning environments

---

## ⚙️ Method 3: Manual - For Experts

**For**: Experienced DevOps, special environments, maximum customization

### Documentation
- `INSTALL.md` - Complete manual installation guide

### Features
✅ **Absolute control** - Every command is documented  
✅ **Customization** - Adapt everything to your needs  
✅ **Understanding** - Total system mastery  
✅ **Flexibility** - For non-standard environments  

### Manual Installation
Follow `INSTALL.md` section "Manual installation", which details:

1. **System preparation**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install python3-pip python3-venv nginx...
   ```

2. **Ollama installation**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull phi3:3.8b
   ollama pull gemma2:2b
   ollama pull granite4:micro-h
   ```

3. **User configuration**
   ```bash
   sudo useradd -r -s /bin/bash -d /opt/llmui-core -m llmui
   sudo mkdir -p /opt/llmui-core/{logs,data,backups}...
   ```

4. **Python environment**
   ```bash
   sudo su - llmui -c "python3 -m venv venv"
   sudo su - llmui -c "venv/bin/pip install -r requirements.txt"
   ```

5. **Systemd services**
   - Manual creation of .service files
   - Fine parameter configuration

6. **Nginx configuration**
   - Complete reverse proxy customization
   - Advanced SSL configuration

7. **Firewall and security**
   - Manual UFW/firewalld configuration
   - Custom rules

### Duration
- **Total**: 30-60 minutes
- **Required experience**: Advanced Linux
- **Documentation**: 20-30 detailed pages

### Advantages
- 🎯 Maximum precision
- 🛠️ Unlimited customization
- 🔬 Deep understanding
- 🗝️ Non-standard environments
- 📚 Complete documentation

### For Whom?
- Senior DevOps
- Critical production environments
- Custom architectures
- Integration with existing infrastructure

---

## 📊 Comparison Table

| Criteria | Andy (Auto) | Interactive | Manual |
|---------|-------------|-------------|--------|
| **Total time** | 15-30 min | 20-40 min | 30-60 min |
| **Interaction** | 2 min | 10-15 min | Continuous |
| **Required level** | Beginner | Intermediate | Expert |
| **Learning** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Customization** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Automation** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Traceability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Error handling** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

---

## 🎯 Which Method to Choose?

### Are you new to LLMUI Core?
→ **Andy (Method 1)** - Installation in 3 clicks

### Want to learn how it works?
→ **Interactive (Method 2)** - Guided step by step

### Are you a senior DevOps with specific needs?
→ **Manual (Method 3)** - Total control

### Installing on multiple servers?
→ **Andy (Method 1)** - Automation and standardization

### Learning/training environment?
→ **Interactive (Method 2)** - Educational and flexible

### Critical production with special architecture?
→ **Manual (Method 3)** - Maximum customization

---

## 🔄 Combining Methods

You can **combine** methods:

### Example 1: Andy for base, manual for customization
```bash
# 1. Quick installation with Andy
sudo python3 andy_installer.py

# 2. Manual customization
sudo nano /opt/llmui-core/config.yaml
sudo systemctl restart llmui-backend
```

### Example 2: Interactive to learn, Andy to reproduce
```bash
# 1. First time: Interactive to understand
sudo bash scripts/install_interactive.sh

# 2. Following servers: Andy for speed
sudo bash andy_setup.sh
```

---

## 📖 Documentation by Method

### Andy
- `README.md` section "Installation with Andy"
- `QUICKSTART.md` - Quick start
- `README_ANDY.md` - Complete documentation
- `ANDY_INTERACTIVE.md` - Menu guide

### Interactive
- `INSTALL.md` - Step reference
- `scripts/install_interactive.sh` - The script itself (commented)

### Manual
- `INSTALL.md` section "Manual installation"
- `docs/ARCHITECTURE.md` - Technical architecture
- `docs/CONFIGURATION.md` - Advanced configuration

---

## 🆘 Support by Method

### Problem with Andy?
```bash
# Check logs
less /tmp/andy_install.log

# SQLite database
sqlite3 /tmp/andy_installation.db
SELECT * FROM commands WHERE status='failed';
```

### Problem with Interactive?
```bash
# Restart problematic step
sudo bash scripts/install_interactive.sh
# Choose to skip successful steps
```

### Problem with Manual?
```bash
# Check INSTALL.md section "Troubleshooting"
# Check system logs
sudo journalctl -xe
```

---

## ✅ Post-Installation Verification

Whatever method chosen, verify installation:

```bash
# Services active?
sudo systemctl status llmui-backend llmui-proxy nginx

# HTTP test
curl -I http://localhost/

# API test
curl http://localhost:5000/api/health

# Ollama models
ollama list
```

Or with Andy:
```bash
sudo bash andy_setup.sh
# Choose [5] Verify installation
```

---

## 💡 Final Advice

**For 90% of cases**: Use **Andy** (Method 1)
- Fastest installation
- Automatic error handling
- Complete traceability
- Production-ready

**To learn**: Use **Interactive** (Method 2)
- Understand each step
- Choose your options
- Perfect training

**For expert**: Use **Manual** (Method 3)
- Total control
- Maximum customization
- Special environments

---

**Francois Chalut**  
*Three methods, one goal: Digital sovereignty* 🇨🇦
