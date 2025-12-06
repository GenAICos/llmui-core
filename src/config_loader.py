#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
config_loader.py - Configuration Loader for LLMUI Core
Secure configuration management with validation

Author: François Chalut
Website: https://llmui.org
Version: 2.0.0
"""

import os
import yaml
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
import logging

# ============================================================================
# CONFIGURATION DATA CLASSES
# ============================================================================

@dataclass
class BackendConfig:
    """Backend server configuration"""
    host: str = "127.0.0.1"
    port: int = 5000
    workers: int = 4
    reload: bool = False
    log_level: str = "info"

@dataclass
class ProxyConfig:
    """Proxy server configuration"""
    host: str = "0.0.0.0"
    port: int = 8000
    port_ssl: int = 8443
    enable_ssl: bool = False

@dataclass
class TimeoutsConfig:
    """Timeout settings"""
    consensus: int = 1800
    simple_small: int = 180
    simple_medium: int = 300
    simple_large: int = 600
    simple_huge: int = 1200
    health_check: int = 20
    models_fetch: int = 20

@dataclass
class ServerConfig:
    """Server configuration"""
    backend: BackendConfig = field(default_factory=BackendConfig)
    proxy: ProxyConfig = field(default_factory=ProxyConfig)
    timeouts: TimeoutsConfig = field(default_factory=TimeoutsConfig)

@dataclass
class AuthConfig:
    """Authentication configuration"""
    enabled: bool = False
    method: str = "jwt"
    secret_key: str = "CHANGE_THIS_SECRET_KEY"
    token_expiry_hours: int = 24

@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    enabled: bool = False
    requests_per_minute: int = 10
    requests_per_hour: int = 100
    requests_per_day: int = 1000

@dataclass
class FileUploadConfig:
    """File upload security configuration"""
    max_file_size_mb: int = 10
    max_total_size_mb: int = 20
    allowed_extensions: list = field(default_factory=lambda: [".txt", ".md", ".py", ".js", ".json", ".csv"])
    blocked_extensions: list = field(default_factory=lambda: [".exe", ".sh", ".bat", ".dll"])

@dataclass
class SessionConfig:
    """Session management configuration"""
    timeout_hours: int = 24
    secure_cookie: bool = True
    http_only: bool = True
    same_site: str = "lax"

@dataclass
class CORSConfig:
    """CORS configuration"""
    enabled: bool = True
    allowed_origins: list = field(default_factory=lambda: ["http://localhost:8000", "http://localhost:8443"])
    allow_credentials: bool = True
    allow_methods: list = field(default_factory=lambda: ["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    allow_headers: list = field(default_factory=lambda: ["Content-Type", "Authorization"])

@dataclass
class SecurityConfig:
    """Security configuration"""
    auth: AuthConfig = field(default_factory=AuthConfig)
    rate_limit: RateLimitConfig = field(default_factory=RateLimitConfig)
    file_upload: FileUploadConfig = field(default_factory=FileUploadConfig)
    session: SessionConfig = field(default_factory=SessionConfig)
    cors: CORSConfig = field(default_factory=CORSConfig)

@dataclass
class DatabaseConfig:
    """Database configuration"""
    path: str = "/var/lib/llmui/llmui.db"
    backup_enabled: bool = True
    backup_interval_hours: int = 24
    backup_path: str = "/var/lib/llmui/backups"
    max_backups: int = 7
    timeout: int = 30
    check_same_thread: bool = False

@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = "INFO"
    directory: str = "/var/log/llmui"
    backend_log: str = "backend.log"
    backend_error: str = "backend-error.log"
    proxy_log: str = "proxy.log"
    proxy_error: str = "proxy-error.log"
    security_log: str = "security.log"
    max_size_mb: int = 100
    backup_count: int = 10
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    date_format: str = "%Y-%m-%d %H:%M:%S"

@dataclass
class OllamaDefaultsConfig:
    """Ollama default models"""
    worker_models: list = field(default_factory=lambda: ["gemma2:2b", "qwen2.5:4b", "phi3:3.8b"])
    merger_model: str = "qwen2.5:8b"
    simple_model: str = "qwen2.5:8b"

@dataclass
class OllamaRecommendedConfig:
    """Ollama recommended models"""
    workers: list = field(default_factory=lambda: ["phi3:3.8b", "gemma2:2b", "qwen2.5:4b"])
    mergers: list = field(default_factory=lambda: ["qwen2.5:8b", "qwen2.5:14b", "phi3:14b"])
    simple: list = field(default_factory=lambda: ["qwen2.5:8b", "phi3:14b", "mistral:7b"])

@dataclass
class OllamaConfig:
    """Ollama configuration"""
    urls: list = field(default_factory=lambda: ["http://localhost:11434"])
    defaults: OllamaDefaultsConfig = field(default_factory=OllamaDefaultsConfig)
    recommended: OllamaRecommendedConfig = field(default_factory=OllamaRecommendedConfig)
    no_file_support: list = field(default_factory=lambda: ["gemma2:2b", "gemma2:270m", "gemma:2b"])
    timeout: int = 900
    retry_attempts: int = 3
    retry_delay: int = 1

@dataclass
class MemoryConfig:
    """Memory system configuration"""
    max_recent_messages: int = 5
    max_summary_messages: int = 10
    compression_threshold: int = 10
    max_context_tokens: int = 3000
    cleanup_enabled: bool = True
    cleanup_interval_hours: int = 24
    session_expiry_hours: int = 168

@dataclass
class ConsensusConfig:
    """Consensus mode configuration"""
    enabled: bool = True
    enable_double_pass: bool = True
    consensus_threshold: float = 0.50
    show_detailed_process: bool = True
    max_workers: int = 5
    min_workers: int = 2

@dataclass
class TempFilesConfig:
    """Temporary files configuration"""
    directory: str = "/tmp/llmui_generated_files"
    cleanup_enabled: bool = True
    cleanup_interval_hours: int = 1
    max_age_hours: int = 24
    max_storage_mb: int = 500
    allowed_mime_types: list = field(default_factory=lambda: ["text/plain", "text/x-python"])

@dataclass
class SSLConfig:
    """SSL/TLS configuration"""
    enabled: bool = False
    cert_file: str = "/opt/llmui-core/ssl/llmui.crt"
    key_file: str = "/opt/llmui-core/ssl/llmui.key"
    verify_mode: str = "CERT_NONE"
    ssl_version: str = "TLSv1_2"

@dataclass
class Config:
    """Main configuration object"""
    server: ServerConfig = field(default_factory=ServerConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    ollama: OllamaConfig = field(default_factory=OllamaConfig)
    memory: MemoryConfig = field(default_factory=MemoryConfig)
    consensus: ConsensusConfig = field(default_factory=ConsensusConfig)
    temp_files: TempFilesConfig = field(default_factory=TempFilesConfig)
    ssl: SSLConfig = field(default_factory=SSLConfig)

# ============================================================================
# CONFIGURATION LOADER
# ============================================================================

class ConfigLoader:
    """Configuration loader with validation and defaults"""
    
    DEFAULT_CONFIG_PATHS = [
        "/opt/llmui-core/config.yaml",
        "/etc/llmui/config.yaml",
        "./config.yaml",
        "../config.yaml"
    ]
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or self._find_config()
        self.config_data = self._load_yaml()
        self.config = self._parse_config()
        self._validate_config()
        
    def _find_config(self) -> Optional[str]:
        """Find configuration file in default paths"""
        for path in self.DEFAULT_CONFIG_PATHS:
            if os.path.exists(path):
                return path
        
        logging.warning("No config file found, using defaults")
        return None
    
    def _load_yaml(self) -> Dict[str, Any]:
        """Load YAML configuration file"""
        if not self.config_path:
            return {}
        
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
                logging.info(f"Configuration loaded from: {self.config_path}")
                return data or {}
        except Exception as e:
            logging.error(f"Error loading config: {e}")
            return {}
    
    def _parse_config(self) -> Config:
        """Parse configuration data into Config object"""
        config = Config()
        
        # Server
        if 'server' in self.config_data:
            server_data = self.config_data['server']
            if 'backend' in server_data:
                config.server.backend = BackendConfig(**server_data['backend'])
            if 'proxy' in server_data:
                config.server.proxy = ProxyConfig(**server_data['proxy'])
            if 'timeouts' in server_data:
                config.server.timeouts = TimeoutsConfig(**server_data['timeouts'])
        
        # Security
        if 'security' in self.config_data:
            sec_data = self.config_data['security']
            if 'auth' in sec_data:
                config.security.auth = AuthConfig(**sec_data['auth'])
            if 'rate_limit' in sec_data:
                config.security.rate_limit = RateLimitConfig(**sec_data['rate_limit'])
            if 'file_upload' in sec_data:
                config.security.file_upload = FileUploadConfig(**sec_data['file_upload'])
            if 'session' in sec_data:
                config.security.session = SessionConfig(**sec_data['session'])
            if 'cors' in sec_data:
                config.security.cors = CORSConfig(**sec_data['cors'])
        
        # Database
        if 'database' in self.config_data:
            config.database = DatabaseConfig(**self.config_data['database'])
        
        # Logging
        if 'logging' in self.config_data:
            config.logging = LoggingConfig(**self.config_data['logging'])
        
        # Ollama
        if 'ollama' in self.config_data:
            ollama_data = self.config_data['ollama']
            config.ollama.urls = ollama_data.get('urls', config.ollama.urls)
            if 'defaults' in ollama_data:
                config.ollama.defaults = OllamaDefaultsConfig(**ollama_data['defaults'])
            if 'recommended' in ollama_data:
                config.ollama.recommended = OllamaRecommendedConfig(**ollama_data['recommended'])
            config.ollama.no_file_support = ollama_data.get('no_file_support', config.ollama.no_file_support)
            config.ollama.timeout = ollama_data.get('timeout', config.ollama.timeout)
            config.ollama.retry_attempts = ollama_data.get('retry_attempts', config.ollama.retry_attempts)
        
        # Memory
        if 'memory' in self.config_data:
            config.memory = MemoryConfig(**self.config_data['memory'])
        
        # Consensus
        if 'consensus' in self.config_data:
            config.consensus = ConsensusConfig(**self.config_data['consensus'])
        
        # Temp Files
        if 'temp_files' in self.config_data:
            config.temp_files = TempFilesConfig(**self.config_data['temp_files'])
        
        # SSL
        if 'ssl' in self.config_data:
            config.ssl = SSLConfig(**self.config_data['ssl'])
        
        return config
    
    def _validate_config(self):
        """Validate configuration"""
        # Check secret key in production
        if self.config.security.auth.secret_key == "CHANGE_THIS_SECRET_KEY":
            logging.warning("⚠️  Default secret key detected! Change it in production!")
        
        # Check SSL configuration
        if self.config.server.proxy.enable_ssl:
            if not os.path.exists(self.config.ssl.cert_file):
                logging.error(f"❌ SSL cert file not found: {self.config.ssl.cert_file}")
            if not os.path.exists(self.config.ssl.key_file):
                logging.error(f"❌ SSL key file not found: {self.config.ssl.key_file}")
        
        # Check database path
        db_dir = os.path.dirname(self.config.database.path)
        if not os.path.exists(db_dir):
            logging.warning(f"⚠️  Database directory not found: {db_dir}")
        
        # Check log directory
        if not os.path.exists(self.config.logging.directory):
            logging.warning(f"⚠️  Log directory not found: {self.config.logging.directory}")
        
        logging.info("✅ Configuration validated")
    
    def get(self) -> Config:
        """Get configuration object"""
        return self.config

# ============================================================================
# GLOBAL CONFIGURATION
# ============================================================================

_global_config: Optional[Config] = None

def get_config(config_path: Optional[str] = None) -> Config:
    """Get global configuration object (singleton)"""
    global _global_config
    
    if _global_config is None:
        loader = ConfigLoader(config_path)
        _global_config = loader.get()
    
    return _global_config

def reload_config(config_path: Optional[str] = None):
    """Reload configuration from file"""
    global _global_config
    loader = ConfigLoader(config_path)
    _global_config = loader.get()
    logging.info("Configuration reloaded")

# ============================================================================
# USAGE EXAMPLE
# ============================================================================

if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Load configuration
    print("Loading configuration...")
    config = get_config()
    
    # Display configuration
    print("\n" + "="*60)
    print("LLMUI Core Configuration")
    print("="*60)
    
    print(f"\n📡 Server:")
    print(f"   Backend: {config.server.backend.host}:{config.server.backend.port}")
    print(f"   Proxy: {config.server.proxy.host}:{config.server.proxy.port}")
    print(f"   SSL: {'Enabled' if config.server.proxy.enable_ssl else 'Disabled'}")
    
    print(f"\n🔒 Security:")
    print(f"   Auth: {'Enabled' if config.security.auth.enabled else 'Disabled'}")
    print(f"   Rate Limit: {'Enabled' if config.security.rate_limit.enabled else 'Disabled'}")
    print(f"   Max File Size: {config.security.file_upload.max_file_size_mb}MB")
    
    print(f"\n💾 Database:")
    print(f"   Path: {config.database.path}")
    print(f"   Backup: {'Enabled' if config.database.backup_enabled else 'Disabled'}")
    
    print(f"\n📊 Logging:")
    print(f"   Level: {config.logging.level}")
    print(f"   Directory: {config.logging.directory}")
    
    print(f"\n🤖 Ollama:")
    print(f"   URLs: {', '.join(config.ollama.urls)}")
    print(f"   Default Workers: {', '.join(config.ollama.defaults.worker_models)}")
    print(f"   Default Merger: {config.ollama.defaults.merger_model}")
    
    print("\n" + "="*60)
    print("✅ Configuration loaded successfully!")
    print("="*60)
