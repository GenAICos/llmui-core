# 🚀 Quick Start - LLMUI Core v0.5.0

Ultra-quick guide to install and use LLMUI Core in less than 15 minutes.

---

## ⚡ Express Installation

### Prerequisites
- Linux server (Debian/Ubuntu/Rocky/RHEL)
- Python 3.8+
- Root access (sudo)
- 8GB RAM minimum
- 20GB free disk space

### 3 Commands to Install Everything

```bash
# 1. Clone repository
git clone https://github.com/your-repo/llmui-core.git && cd llmui-core

# 2. Launch interactive installation
sudo bash andy_setup.sh

# 3. Choose option [1] - Complete Installation
```

**That's it!** Andy handles the rest. ☕

---

## 📋 What Will Happen

Andy will automatically:

1. ✅ Update your system
2. ✅ Install Ollama + 3 LLM models (~10 minutes)
3. ✅ Configure Python and dependencies
4. ✅ Create systemd services
5. ✅ Configure Nginx
6. ✅ Configure firewall
7. ✅ Start all services
8. ✅ Display access URL

**Total duration**: 15-30 minutes (depending on internet connection)

---

## 🎯 First Use

### Access the Interface

Once installation is complete, Andy displays:

```
✓ Interface accessible at: http://192.168.1.100/
```

Open this URL in your browser!

### First Steps

1. **Home Page**
   - Modern chat interface
   - Conversation history
   - File upload

2. **First Conversation**
   ```
   You: Hello! Can you explain how you work?
   
   LLMUI: Hello! I am LLMUI Core, a consensus platform...
   ```

3. **File Upload**
   - Click on 📎
   - Select a PDF, DOCX, or image
   - Ask questions about the document

---

## 🛠️ Useful Commands

### Check Status

```bash
# Via Andy
sudo bash andy_setup.sh
# Choose option [5] - Verify installation

# Or manually
sudo systemctl status llmui-backend llmui-proxy nginx
```

### View Logs

```bash
# Backend
sudo journalctl -u llmui-backend -f

# Proxy
sudo journalctl -u llmui-proxy -f

# Nginx
sudo tail -f /var/log/nginx/llmui-access.log
```

### Restart Services

```bash
sudo systemctl restart llmui-backend llmui-proxy nginx
```

---

## 📱 Quick REST API

### Health Check

```bash
curl http://localhost:5000/api/health
```

### Model List

```bash
curl http://localhost:5000/api/models
```

### Send Message

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello!",
    "user_id": "test_user"
  }'
```

---

## 🔧 Quick Configuration

### Main File

Edit `/opt/llmui-core/config.yaml`:

```yaml
server:
  port: 5000
  
ollama:
  models:
    workers:
      - "phi3:3.8b"
      - "gemma2:2b"
    merger: "granite4:micro-h"

# Restart after modification
```

```bash
sudo systemctl restart llmui-backend llmui-proxy
```

### Add SSL (Optional)

```bash
sudo certbot --nginx -d your-domain.com
```

---

## 🛠 Common Problems

### Services Won't Start

```bash
# Check logs
sudo journalctl -u llmui-backend -n 50

# Check permissions
ls -la /opt/llmui-core/

# Restart
sudo systemctl restart llmui-backend llmui-proxy
```

### Blank Page in Browser

```bash
# Check Nginx
sudo systemctl status nginx
sudo nginx -t

# Check backend
curl http://localhost:5000/api/health
```

### Ollama Not Responding

```bash
# Check Ollama
ollama list
ollama ps

# Restart
sudo systemctl restart ollama

# Test a model
ollama run phi3:3.8b "test"
```

---

## 📚 Go Further

### Complete Documentation

- **[README.md](README.md)** - Complete overview
- **[INSTALL.md](INSTALL.md)** - Detailed installation guide
- **[README_ANDY.md](README_ANDY.md)** - Andy documentation
- **[ANDY_INTERACTIVE.md](ANDY_INTERACTIVE.md)** - Interactive menu guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribute to project

### Tutorials

1. **Advanced Configuration**: INSTALL.md section "Post-installation configuration"
2. **Complete REST API**: docs/API.md
3. **Technical Architecture**: docs/ARCHITECTURE.md
4. **Troubleshooting**: docs/TROUBLESHOOTING.md

### Support

- **GitHub Issues**: [Create an issue](https://github.com/your-repo/llmui-core/issues)
- **Email**: support@genie-ia.ca
- **Documentation**: [Wiki](https://github.com/your-repo/llmui-core/wiki)

---

## 🎓 Usage Examples

### Simple Chat

```python
import requests

response = requests.post('http://localhost:5000/api/chat', json={
    "message": "Explain artificial intelligence to me",
    "user_id": "user123"
})

print(response.json()['response'])
```

### Document Upload and Analysis

```python
files = {'file': open('document.pdf', 'rb')}
data = {
    'user_id': 'user123',
    'question': 'Summarize this document'
}

response = requests.post(
    'http://localhost:5000/api/upload',
    files=files,
    data=data
)

print(response.json()['summary'])
```

### Conversation with Context

```python
# First message
response1 = requests.post('http://localhost:5000/api/chat', json={
    "message": "My name is François",
    "user_id": "user123",
    "conversation_id": "conv_001"
})

# Message with context
response2 = requests.post('http://localhost:5000/api/chat', json={
    "message": "What is my name?",
    "user_id": "user123",
    "conversation_id": "conv_001"
})

print(response2.json()['response'])  # "François"
```

---

## ⚙️ Configuration by Use Case

### Development Server

```yaml
# config.yaml
server:
  debug: true
  
logging:
  level: "DEBUG"
```

### Production

```yaml
# config.yaml
server:
  ssl_enabled: true
  ssl_cert: "/opt/llmui-core/ssl/cert.pem"
  ssl_key: "/opt/llmui-core/ssl/key.pem"
  
security:
  max_login_attempts: 5
  lockout_duration: 900
  
logging:
  level: "INFO"
```

### Maximum Performance

```yaml
# config.yaml
ollama:
  timeout: 120  # Reduce for faster responses
  
memory:
  type: "short_term"  # Disable RAG for speed
  max_tokens: 2048
```

---

## 🚦 Post-Installation Checklist

- [ ] Services started (backend, proxy, nginx)
- [ ] Interface accessible via browser
- [ ] API health check test OK
- [ ] Message sending test OK
- [ ] Ollama responding correctly
- [ ] Logs without errors
- [ ] Firewall configured
- [ ] SSL configured (if production)
- [ ] Backup configured

---

## 🎉 Congratulations!

You now have a complete LLMUI Core installation!

### Suggested Next Steps

1. ✅ Test different types of questions
2. ✅ Upload and analyze documents
3. ✅ Explore REST API
4. ✅ Configure SSL for production
5. ✅ Read complete documentation
6. ✅ Join the community

---

## 💡 Pro Tips

### Performance

- Use an SSD for `/opt/llmui-core/data`
- Minimum 8GB RAM, 16GB recommended
- GPU optional but greatly improves performance

### Security

- Change default password
- Enable SSL in production
- Update regularly
- Check logs daily

### Maintenance

```bash
# Daily backup
sudo tar -czf ~/llmui-backup-$(date +%Y%m%d).tar.gz /opt/llmui-core/data

# Clean old logs
sudo journalctl --vacuum-time=7d

# Update
cd /path/to/llmui-core && git pull
sudo python3 andy_deploy_source.py
sudo systemctl restart llmui-backend llmui-proxy
```

---

## 📞 Need Help?

### Resources

- 📖 **Documentation**: README.md, INSTALL.md
- 🐛 **Bugs**: [GitHub Issues](https://github.com/your-repo/llmui-core/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-repo/llmui-core/discussions)
- 📧 **Email**: support@genie-ia.ca

### Before Asking for Help

1. Check logs: `sudo journalctl -u llmui-backend -n 100`
2. Check documentation: README.md and INSTALL.md
3. Search existing issues
4. Prepare system information:
   ```bash
   uname -a
   python3 --version
   ollama --version
   systemctl status llmui-backend llmui-proxy nginx
   ```

---

**🎊 Welcome to the LLMUI Core ecosystem!**

*For Quebec's digital sovereignty* 🇨🇦

---

**Francois Chalut** - 2025
