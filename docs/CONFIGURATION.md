# 🔧 LLMUI Core - Configuration Guide

**Version:** 2.0.0  
**Author:** François Chalut  
**Website:** https://llmui.org

This guide shows **exactly where and how** to customize LLMUI Core for your needs.

---

## 📍 Quick Reference - Files to Edit

| File | What to Edit | Why |
|------|--------------|-----|
| `src/llmui_backend.py` | Model defaults, timeouts, Ollama URL | Performance tuning |
| `src/llmui_proxy.py` | Ports, SSL, timeouts | Network configuration |
| `src/memory.py` | Memory limits, compression | Memory management |
| `scripts/install.sh` | Installation paths | Custom deployment |

---

## 1️⃣ Backend Configuration (`src/llmui_backend.py`)

### 🎯 **Lines 65-75: Ollama Connection**

```python
# ⚠️ EDIT THIS SECTION ⚠️
default_config = Config(
    # Your Ollama instance(s)
    ollama_urls=["http://localhost:11434"],  # ← EDIT HERE
    
    # EXAMPLES:
    # Single local instance:
    # ollama_urls=["http://localhost:11434"]
    
    # Multiple instances (load balancing):
    # ollama_urls=[
    #     "http://server1:11434",
    #     "http://server2:11434",
    #     "http://server3:11434"
    # ]
    
    # Remote instance:
    # ollama_urls=["http://192.168.1.100:11434"]
)
```

**When to edit:**
- Using remote Ollama server
- Load balancing across multiple servers
- Custom Ollama port

---

### 🤖 **Lines 66-68: Default Models**

```python
# ⚠️ EDIT THIS SECTION ⚠️
default_config = Config(
    # Worker models: 2-5 fast, diverse models
    worker_models=["llama3.2:3b", "qwen2.5:0.5b", "gemma2:2b"],  # ← EDIT HERE
    
    # Merger model: Larger, smarter model for synthesis
    merger_model="qwen3:8b",  # ← EDIT HERE
    
    # RECOMMENDED COMBINATIONS:
    
    # Fast (< 10s responses):
    # worker_models=["gemma2:2b", "phi3:3.8b", "qwen2.5:4b"]
    # merger_model="qwen2.5:8b"
    
    # Balanced (10-30s responses):
    # worker_models=["phi3:3.8b", "mistral:7b", "qwen2.5:7b"]
    # merger_model="qwen2.5:14b"
    
    # Thorough (30-60s+ responses):
    # worker_models=["llama3.1:8b", "qwen2.5:14b", "mistral:7b", "phi3:14b"]
    # merger_model="qwen2.5:32b"
    
    # Expert (1-5 min responses):
    # worker_models=["llama3.1:70b", "qwen2.5:72b", "mixtral:8x7b"]
    # merger_model="llama3.1:70b"
)
```

**How to choose workers:**
- **Diversity:** Different model families (Llama, Qwen, Phi, Gemma)
- **Size:** 2B-14B for workers, 8B+ for merger
- **Speed:** Smaller models = faster but less thorough

---

### ⏱️ **Lines 72-75: Timeouts**

```python
# ⚠️ EDIT THIS SECTION ⚠️
default_config = Config(
    request_timeout=1800,    # Total request timeout (30 min) ← EDIT
    worker_timeout=900,      # Per-worker timeout (15 min) ← EDIT
    merger_timeout=600,      # Merger timeout (10 min) ← EDIT
    retry_attempts=3,        # Retry failed requests ← EDIT
    
    # EXAMPLES BY USE CASE:
    
    # Fast responses (small models only):
    # request_timeout=600     # 10 minutes
    # worker_timeout=300      # 5 minutes
    # merger_timeout=300      # 5 minutes
    
    # Balanced (recommended):
    # request_timeout=1800    # 30 minutes
    # worker_timeout=900      # 15 minutes
    # merger_timeout=600      # 10 minutes
    
    # Large models (70B+):
    # request_timeout=3600    # 60 minutes
    # worker_timeout=1800     # 30 minutes
    # merger_timeout=1200     # 20 minutes
    
    # Very patient (405B models):
    # request_timeout=7200    # 2 hours
    # worker_timeout=3600     # 1 hour
    # merger_timeout=2400     # 40 minutes
)
```

**When to increase:**
- Using large models (70B+)
- Slow hardware (CPU-only)
- Complex, long queries

**When to decrease:**
- Only small models (< 7B)
- Fast hardware (multiple GPUs)
- Need quick responses

---

### 🎚️ **Line 69: Consensus Threshold**

```python
# ⚠️ EDIT THIS SECTION ⚠️
default_config = Config(
    consensus_threshold=0.50,  # 50% minimum confidence ← EDIT HERE
    
    # GUIDANCE:
    # 0.30 (30%) - Very lenient, accept most responses
    # 0.50 (50%) - Balanced (RECOMMENDED)
    # 0.70 (70%) - Strict, only high-confidence answers
    # 0.90 (90%) - Very strict, may trigger many retries
)
```

**Lower threshold (0.3-0.4):**
- Faster responses
- More creative/diverse answers
- Risk of lower quality

**Higher threshold (0.7-0.9):**
- Slower (more retries)
- Higher quality/accuracy
- May fail on subjective queries

---

## 2️⃣ Proxy Configuration (`src/llmui_proxy.py`)

### 🌐 **Lines 20-22: Network Settings**

```python
# ⚠️ EDIT THIS SECTION ⚠️
PORT = 8000  # HTTP port ← EDIT HERE
LLMUI_BACKEND_BASE = "http://localhost:5000"  # ← EDIT HERE
OLLAMA_BASE = "http://localhost:11434"  # ← EDIT HERE

# EXAMPLES:

# Remote backend:
# PORT = 8000
# LLMUI_BACKEND_BASE = "http://backend-server:5000"
# OLLAMA_BASE = "http://ollama-server:11434"

# Custom ports:
# PORT = 3000
# LLMUI_BACKEND_BASE = "http://localhost:5000"
# OLLAMA_BASE = "http://localhost:11434"

# Different servers:
# PORT = 8000
# LLMUI_BACKEND_BASE = "http://10.0.1.10:5000"
# OLLAMA_BASE = "http://10.0.1.20:11434"
```

---

### 🔒 **Lines 24-30: SSL/HTTPS**

```python
# ⚠️ EDIT THIS SECTION ⚠️
# SSL certificates path
SSL_CERT_PATH = "/opt/llmui-core/ssl/llmui.crt"  # ← EDIT HERE
SSL_KEY_PATH = "/opt/llmui-core/ssl/llmui.key"   # ← EDIT HERE

# EXAMPLES:

# Custom SSL location:
# SSL_CERT_PATH = "/etc/ssl/certs/mycompany.crt"
# SSL_KEY_PATH = "/etc/ssl/private/mycompany.key"

# Let's Encrypt:
# SSL_CERT_PATH = "/etc/letsencrypt/live/yourdomain.com/fullchain.pem"
# SSL_KEY_PATH = "/etc/letsencrypt/live/yourdomain.com/privkey.pem"
```

---

### ⏱️ **Lines 32-40: Request Timeouts**

```python
# ⚠️ EDIT THIS SECTION ⚠️
CONSENSUS_TIMEOUT = 1800  # 30 min for consensus ← EDIT
SIMPLE_TIMEOUT_SMALL = 180   # 3 min for tiny models ← EDIT
SIMPLE_TIMEOUT_MEDIUM = 300  # 5 min for medium models ← EDIT
SIMPLE_TIMEOUT_LARGE = 600   # 10 min for large models ← EDIT
SIMPLE_TIMEOUT_HUGE = 1200   # 20 min for huge models ← EDIT

# EXAMPLES:

# Fast hardware (GPU):
# SIMPLE_TIMEOUT_SMALL = 60    # 1 minute
# SIMPLE_TIMEOUT_MEDIUM = 120  # 2 minutes
# SIMPLE_TIMEOUT_LARGE = 300   # 5 minutes

# Slow hardware (CPU):
# SIMPLE_TIMEOUT_SMALL = 300   # 5 minutes
# SIMPLE_TIMEOUT_MEDIUM = 600  # 10 minutes
# SIMPLE_TIMEOUT_LARGE = 1200  # 20 minutes
```

---

## 3️⃣ Memory Configuration (`src/memory.py`)

### 💾 **Lines 25-28: Memory Limits**

```python
# ⚠️ EDIT THIS SECTION ⚠️
class HybridMemorySystem:
    def __init__(
        self,
        max_recent_messages=5,      # Keep last 5 full messages ← EDIT
        max_summary_messages=10,    # Keep 10 summarized ← EDIT
        compression_threshold=10,   # Compress after 10 msgs ← EDIT
        max_context_tokens=3000     # Max context size ← EDIT
    ):
    
    # EXAMPLES:
    
    # Low memory / Many users:
    # max_recent_messages=3
    # max_summary_messages=5
    # compression_threshold=5
    # max_context_tokens=1500
    
    # Balanced (RECOMMENDED):
    # max_recent_messages=5
    # max_summary_messages=10
    # compression_threshold=10
    # max_context_tokens=3000
    
    # High memory / Few users:
    # max_recent_messages=10
    # max_summary_messages=20
    # compression_threshold=20
    # max_context_tokens=8000
```

**When to increase:**
- Few concurrent users
- Long conversations important
- Plenty of RAM available

**When to decrease:**
- Many concurrent users
- RAM constraints
- Short, transactional queries

---

## 4️⃣ Installation Paths (`scripts/install.sh`)

### 📁 **Lines 28-30: Installation Directories**

```bash
# ⚠️ EDIT THIS SECTION ⚠️
INSTALL_DIR="/opt/llmui-core"     # Application files ← EDIT
DATA_DIR="/var/lib/llmui"         # Database ← EDIT
LOG_DIR="/var/log/llmui"          # Logs ← EDIT

# EXAMPLES:

# Custom installation:
# INSTALL_DIR="/home/myuser/llmui-core"
# DATA_DIR="/home/myuser/llmui/data"
# LOG_DIR="/home/myuser/llmui/logs"

# Multi-tenant:
# INSTALL_DIR="/opt/llmui-core"
# DATA_DIR="/data/llmui/client1"
# LOG_DIR="/logs/llmui/client1"

# Docker-friendly:
# INSTALL_DIR="/app"
# DATA_DIR="/data"
# LOG_DIR="/logs"
```

---

## 5️⃣ CORS Security (`src/llmui_backend.py`)

### 🔐 **Lines 580-586: CORS Configuration**

```python
# ⚠️ PRODUCTION: RESTRICT ORIGINS ⚠️
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ← CHANGE THIS IN PRODUCTION!
    
    # EXAMPLES:
    
    # Development (current):
    # allow_origins=["*"]
    
    # Production - Single domain:
    # allow_origins=["https://llmui.yourdomain.com"]
    
    # Production - Multiple domains:
    # allow_origins=[
    #     "https://llmui.yourdomain.com",
    #     "https://ai.yourdomain.com",
    #     "https://yourdomain.com"
    # ]
    
    # Localhost + Production:
    # allow_origins=[
    #     "http://localhost:8000",
    #     "https://llmui.yourdomain.com"
    # ]
    
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🎯 Quick Start Checklist

Before deploying, verify you've edited:

```bash
# 1. Backend
[ ] Ollama URL(s) - llmui_backend.py line 65
[ ] Default models - llmui_backend.py lines 66-68
[ ] Timeouts - llmui_backend.py lines 72-75
[ ] CORS origins - llmui_backend.py line 582

# 2. Proxy
[ ] Network ports - llmui_proxy.py lines 20-22
[ ] SSL paths - llmui_proxy.py lines 24-30
[ ] Timeouts - llmui_proxy.py lines 32-40

# 3. Memory
[ ] Memory limits - memory.py lines 25-28

# 4. Installation
[ ] Install paths - scripts/install.sh lines 28-30

# 5. Test
[ ] Run health check: curl http://localhost:5000/health
[ ] Check models: curl http://localhost:8000/models
[ ] Test simple: Send a test message
```

---

## 📞 Support

**Questions about configuration?**

- **Email:** contact@llmui.org
- **Website:** https://llmui.org
- **Documentation:** See docs/ folder

---

**Author:** François Chalut  
**Version:** 2.0.0  
**Last Updated:** 2025-01-18
