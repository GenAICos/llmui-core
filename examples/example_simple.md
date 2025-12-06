# LLMUI Core v2.0 - Environment Variables Example
# Copy this file to .env and configure your values
# Location: /opt/llmui-core/.env

# ============================================================================
# REDIS CONFIGURATION
# ============================================================================
# Enable Redis L2 cache (set to 'yes' to enable)
REDIS_ENABLED=yes

# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Redis password (leave empty if no password)
# Generate with: openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
REDIS_PASSWORD=your_redis_password_here

# ============================================================================
# SECURITY
# ============================================================================
# Secret key for sessions (CHANGE THIS!)
# Generate with: openssl rand -hex 32
SECRET_KEY=your_secret_key_here_change_this_in_production

# API Keys for authentication (comma-separated)
# Generate with: python3 -c "from src.quick_security_fixes import APIKeyAuth; print(APIKeyAuth.generate_key())"
# Leave empty to disable API key authentication
API_KEYS=

# Examples (uncomment and replace with your keys):
# API_KEYS=abc123def456,ghi789jkl012,mno345pqr678

# ============================================================================
# PATHS
# ============================================================================
LLMUI_DATA_DIR=/var/lib/llmui
LLMUI_LOG_DIR=/var/log/llmui
LLMUI_INSTALL_DIR=/opt/llmui-core

# ============================================================================
# OLLAMA
# ============================================================================
# Ollama API URLs (comma-separated for load balancing)
OLLAMA_URLS=http://localhost:11434

# Examples for multiple Ollama instances:
# OLLAMA_URLS=http://localhost:11434,http://ollama-server-2:11434

# ============================================================================
# SERVER
# ============================================================================
# Backend API port
BACKEND_PORT=5000

# Proxy server port
PROXY_PORT=8000

# SSL/HTTPS port
PROXY_SSL_PORT=8443

# ============================================================================
# LOGGING
# ============================================================================
# Log level: DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_LEVEL=INFO

# ============================================================================
# FEATURES
# ============================================================================
# Enable/disable features
ENABLE_CACHE=yes
ENABLE_MEMORY=yes
ENABLE_SECURITY_VALIDATION=yes
ENABLE_FILE_UPLOAD=yes

# ============================================================================
# PERFORMANCE
# ============================================================================
# Cache sizes (number of items)
L1_CACHE_SIZE=1000
L1_CACHE_TTL_SECONDS=3600

# Redis TTL
L2_CACHE_TTL_SECONDS=86400

# Memory system
MAX_RECENT_MESSAGES=5
MAX_SUMMARY_MESSAGES=10
MAX_CONTEXT_TOKENS=3000

# ============================================================================
# FILE UPLOAD LIMITS
# ============================================================================
MAX_FILE_SIZE_MB=10
MAX_TOTAL_FILES_SIZE_MB=20

# ============================================================================
# NOTES
# ============================================================================
# - This file should NOT be committed to version control
# - Always use strong, unique passwords
# - Change SECRET_KEY in production
# - Generate unique API keys for each user/application
# - Restart services after changing this file:
#   sudo systemctl restart llmui-backend llmui-proxy
