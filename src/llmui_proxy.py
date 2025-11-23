#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LLMUI Core - Proxy Server with HTTPS Support
Version: 0.5.0

Author: François Chalut
Website: https://llmui.org
Email: contact@llmui.org

CORRECTIONS:
- Bug periodic_cleanup() corrigé (ligne 159)
- Indentation cohérente (4 espaces)
- Validation path traversal améliorée
- Code optimisé
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
import sys
import re
import ssl
from urllib.error import URLError, HTTPError
import socket
from datetime import datetime
import uuid
import threading
import time
import atexit
import signal

# ============================================================================
# CONFIGURATION
# ============================================================================

# Ports configuration
HTTP_PORT = 8000
HTTPS_PORT = 8443

# Backend configuration
LLMUI_BACKEND_BASE = "http://localhost:5000"
OLLAMA_BASE = "http://localhost:11434"

# SSL Configuration
SSL_CERT = "/opt/llmui-core/ssl/llmui.crt"
SSL_KEY = "/opt/llmui-core/ssl/llmui.key"

# Directory for generated files
GENERATED_FILES_DIR = "/tmp/llmui_generated_files"
os.makedirs(GENERATED_FILES_DIR, exist_ok=True)

# Timeouts (nettoyés - gardé seulement ceux utilisés)
CONSENSUS_TIMEOUT = 86400
HEALTH_TIMEOUT = 10
MODELS_TIMEOUT = 10

# Path to LLMUI web files
LLMUI_WEB_DIR = "/opt/llmui-core/web/"

# Thread-safe storage for generated file metadata
generated_files_metadata = {}
metadata_lock = threading.Lock()

# Cleanup settings
CLEANUP_INTERVAL = 3600
MAX_FILE_AGE = 86400
last_cleanup = time.time()

# Global server reference for shutdown
httpd = None

# ============================================================================
# CLEANUP HELPER FUNCTIONS
# ============================================================================

def cleanup_old_files():
    """Cleanup old generated files"""
    global last_cleanup
    try:
        files_to_remove = []
        current_time = time.time()
        with metadata_lock:
            for file_id, metadata in generated_files_metadata.items():
                file_age = current_time - metadata.get('created_at', current_time)
                if file_age > MAX_FILE_AGE:
                    files_to_remove.append(file_id)
                    try:
                        if os.path.exists(metadata['filepath']):
                            os.remove(metadata['filepath'])
                    except Exception as e:
                        print(f"[CLEANUP ERROR] {e}")
            
            for file_id in files_to_remove:
                del generated_files_metadata[file_id]
            
            if files_to_remove:
                print(f"[CLEANUP] Removed {len(files_to_remove)} old files")
        
        last_cleanup = current_time
    except Exception as e:
        print(f"[CLEANUP ERROR] {e}")

# ============================================================================
# PROXY HANDLER
# ============================================================================

class LLMUIProxyHandler(http.server.SimpleHTTPRequestHandler):
    """LLMUI Proxy Handler with authentication redirect"""
    
    def __init__(self, *args, **kwargs):
        if os.path.exists(LLMUI_WEB_DIR):
            super().__init__(*args, directory=LLMUI_WEB_DIR, **kwargs)
        else:
            super().__init__(*args, **kwargs)
    
    def is_authenticated(self):
        """Check if user is authenticated via session cookie"""
        try:
            cookie_header = self.headers.get('Cookie', '')
            
            if not cookie_header:
                return False
            
            req = urllib.request.Request(
                f"{LLMUI_BACKEND_BASE}/api/auth/verify",
                headers={'Cookie': cookie_header}
            )
            
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                return data.get('authenticated', False)
        except Exception as e:
            print(f"[AUTH CHECK] Error: {e}")
            return False
    
    def redirect_to_login(self):
        """Redirect to login page"""
        protocol = "https" if hasattr(self.server.socket, 'context') else "http"
        port = HTTPS_PORT if protocol == "https" else HTTP_PORT
        redirect_url = f"{protocol}://167.114.65.203:{port}/login.html"
        
        self.send_response(302)
        self.send_header('Location', redirect_url)
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.end_headers()
        print(f"[REDIRECT] Unauthorized access -> {redirect_url}")
    
    def do_GET(self):
        """Handle GET requests"""
        # ✅ CORRIGÉ: periodic_cleanup() supprimé - géré par thread dédié (ligne 607-614)
        
        # Pages publiques (pas besoin d'authentification)
        public_paths = ['/login', '/login.html', '/health', '/api/auth/login', '/api/auth/verify']
        
        # Vérifier si c'est une ressource statique pour la page de login
        is_login_resource = (
            self.path.startswith('/login') or
            (self.path.endswith('.css') and 'login' not in self.path) or
            (self.path.endswith('.js') and 'login' not in self.path) or
            self.path.endswith('.png') or
            self.path.endswith('.ico')
        )
        
        # Si c'est la page d'accueil ou index, vérifier l'authentification
        if self.path == "/" or self.path == "/index.html":
            if not self.is_authenticated():
                self.redirect_to_login()
                return
            self.serve_index()
        
        # Page de login - toujours accessible
        elif self.path in ['/login', '/login.html']:
            self.serve_login()
        
        # Ressources statiques pour login - toujours accessibles
        elif is_login_resource:
            super().do_GET()
        
        # Téléchargement de fichiers - nécessite authentification
        elif self.path.startswith("/download/"):
            if not self.is_authenticated():
                self.send_error(401, "Authentication required")
                return
            self.serve_generated_file()
        
        # Health check - public
        elif self.path == "/health":
            self.proxy_to_backend(timeout=HEALTH_TIMEOUT)
        
        # API models - nécessite authentification
        elif self.path == "/api/models":
            if not self.is_authenticated():
                self.send_error(401, "Authentication required")
                return
            self.get_ollama_models()
        
        # Autres endpoints API - vérifier si public ou protégé
        elif self.path.startswith("/api/"):
            if any(self.path.startswith(p) for p in public_paths):
                self.proxy_to_backend()
            else:
                if not self.is_authenticated():
                    self.send_error(401, "Authentication required")
                    return
                self.proxy_to_backend()
        
        # Autres ressources - vérifier authentification
        else:
            if not self.is_authenticated():
                self.redirect_to_login()
                return
            super().do_GET()
    
    def do_POST(self):
        """Handle POST requests"""
        if not self.is_authenticated() and not self.path.startswith('/api/auth/'):
            self.send_error(401, "Authentication required")
            return
        self.proxy_to_backend()
    
    def serve_index(self):
        """Serve index.html"""
        try:
            index_path = os.path.join(LLMUI_WEB_DIR, "index.html")
            if os.path.exists(index_path):
                with open(index_path, 'rb') as f:
                    content = f.read()
                
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, "Index file not found")
        except Exception as e:
            print(f"[ERROR] Serving index: {e}")
            self.send_error(500, str(e))
    
    def serve_login(self):
        """Serve login.html"""
        try:
            login_path = os.path.join(LLMUI_WEB_DIR, "login.html")
            if os.path.exists(login_path):
                with open(login_path, 'rb') as f:
                    content = f.read()
                
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, "Login file not found")
        except Exception as e:
            print(f"[ERROR] Serving login: {e}")
            self.send_error(500, str(e))
    
    def serve_generated_file(self):
        """Serve a generated file with path traversal protection"""
        try:
            # Extract file_id from path
            file_id = self.path.split('/download/')[-1]
            
            # ✅ SÉCURITÉ: Validation UUID
            try:
                uuid_part = file_id.split('_')[0] if '_' in file_id else file_id
                uuid.UUID(uuid_part)
            except (ValueError, IndexError):
                print(f"[SECURITY] Invalid file ID format: {file_id}")
                self.send_error(400, "Invalid file ID format")
                return
            
            # Get metadata
            with metadata_lock:
                if file_id not in generated_files_metadata:
                    self.send_error(404, "File not found")
                    return
                metadata = generated_files_metadata[file_id].copy()
            
            filepath = metadata['filepath']
            
            # ✅ SÉCURITÉ: Protection path traversal (anti ../)
            real_path = os.path.realpath(filepath)
            allowed_dir = os.path.realpath(GENERATED_FILES_DIR)
            
            if not real_path.startswith(allowed_dir):
                print(f"[SECURITY] Path traversal attempt blocked: {filepath}")
                self.send_error(403, "Access denied - invalid path")
                return
            
            # Verify file exists
            if not os.path.exists(real_path):
                self.send_error(404, "Physical file not found")
                return
            
            # Read and serve file
            with open(real_path, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', metadata.get('mime_type', 'application/octet-stream'))
            self.send_header('Content-Disposition', f'attachment; filename="{metadata["filename"]}"')
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(content)
            
            print(f"[DOWNLOAD] Served: {metadata['filename']} ({len(content)} bytes)")
            
        except Exception as e:
            print(f"[ERROR] Serve file: {e}")
            self.send_error(500, "Error serving file")
    
    def proxy_to_backend(self, timeout=None):
        """Proxy request to backend with timeout"""
        if timeout is None:
            timeout = CONSENSUS_TIMEOUT
        
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length) if content_length > 0 else None
            
            url = f"{LLMUI_BACKEND_BASE}{self.path}"
            
            headers = {
                'Content-Type': self.headers.get('Content-Type', 'application/json'),
                'Cookie': self.headers.get('Cookie', '')
            }
            
            req = urllib.request.Request(
                url,
                data=post_data,
                headers=headers,
                method=self.command
            )
            
            with urllib.request.urlopen(req, timeout=timeout) as response:
                response_data = response.read()
                
                self.send_response(response.status)
                for header, value in response.headers.items():
                    if header.lower() not in ['transfer-encoding', 'connection']:
                        self.send_header(header, value)
                self.end_headers()
                
                self.wfile.write(response_data)
                
        except HTTPError as e:
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = json.dumps({
                'success': False,
                'error': str(e),
                'code': e.code
            })
            self.wfile.write(error_response.encode('utf-8'))
            
        except Exception as e:
            print(f"[PROXY ERROR] {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = json.dumps({
                'success': False,
                'error': str(e)
            })
            self.wfile.write(error_response.encode('utf-8'))
    
    def extract_and_serve_artifacts(self, text):
        """Extract artifacts from response and create downloadable files"""
        modified_text = text
        files = []
        
        artifact_patterns = [
            (r'```(\w+)\s*\n(.*?)```', lambda m: (m.group(2), f"code.{m.group(1)}", "text/plain")),
            (r'<artifact[^>]*>(.*?)</artifact>', lambda m: (m.group(1), "artifact.txt", "text/plain")),
        ]
        
        for pattern, extractor in artifact_patterns:
            for match in re.finditer(pattern, text, re.DOTALL):
                try:
                    content, filename, mime_type = extractor(match)
                    
                    if not content or not content.strip():
                        continue
                    
                    safe_filename = re.sub(r'[^\w\-_\.]', '_', filename)
                    file_id = str(uuid.uuid4())
                    filepath = os.path.join(GENERATED_FILES_DIR, f"{file_id}_{safe_filename}")
                    
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    with metadata_lock:
                        generated_files_metadata[file_id] = {
                            'filename': safe_filename,
                            'filepath': filepath,
                            'mime_type': mime_type,
                            'size': len(content),
                            'created_at': time.time()
                        }
                    
                    download_url = f"/download/{file_id}"
                    files.append({
                        'id': file_id,
                        'filename': safe_filename,
                        'url': download_url,
                        'size': len(content)
                    })
                    
                    replacement = f"\n\n📎 **Fichier généré:** [{safe_filename}]({download_url})\n\n"
                    modified_text = modified_text.replace(match.group(0), replacement)
                    
                    print(f"[FILE] Generated: {safe_filename} ({len(content)} bytes)")
                    
                except Exception as e:
                    print(f"[ERROR] File generation: {e}")
        
        return modified_text, files
    
    def get_ollama_models(self):
        """Get models from Ollama"""
        try:
            req = urllib.request.Request(f"{OLLAMA_BASE}/api/tags")
            
            with urllib.request.urlopen(req, timeout=MODELS_TIMEOUT) as response:
                data = json.loads(response.read().decode('utf-8'))
                models = [m["name"] for m in data.get("models", [])]
                
                response_json = json.dumps({
                    'success': True,
                    'models': models,
                    'count': len(models),
                    'source': 'ollama'
                })
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(response_json)))
                self.end_headers()
                self.wfile.write(response_json.encode('utf-8'))
                
        except Exception as e:
            print(f"[ERROR] Models: {e}")
            response_json = json.dumps({
                'models': [], 
                'count': 0, 
                'source': 'error',
                'error': str(e)
            })
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(response_json)))
            self.end_headers()
            self.wfile.write(response_json.encode('utf-8'))
    
    def log_message(self, format, *args):
        """Override to reduce verbose logging"""
        if not any(x in format % args for x in ['/health', '/stats']):
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            print(f"[{timestamp}] {format % args}")

# ============================================================================
# CLEANUP FUNCTIONS
# ============================================================================

def cleanup_on_exit():
    """Cleanup resources on exit"""
    print("\n[SHUTDOWN] Cleaning up resources...")
    try:
        current_time = time.time()
        files_to_remove = []
        
        with metadata_lock:
            for file_id, metadata in generated_files_metadata.items():
                file_age = current_time - metadata.get('created_at', current_time)
                if file_age > MAX_FILE_AGE:
                    files_to_remove.append(file_id)
                    try:
                        if os.path.exists(metadata['filepath']):
                            os.remove(metadata['filepath'])
                    except Exception as e:
                        print(f"[SHUTDOWN CLEANUP ERROR] {e}")
            
            for file_id in files_to_remove:
                del generated_files_metadata[file_id]
        
        print(f"[SHUTDOWN] {len(files_to_remove)} files cleaned")
        
    except Exception as e:
        print(f"[SHUTDOWN ERROR] {e}")

atexit.register(cleanup_on_exit)

# ============================================================================
# SERVER LAUNCHER
# ============================================================================

def shutdown_server(signum, frame):
    """Handler for signals"""
    print(f"\n[SHUTDOWN] Received signal {signum}. Shutting down...")
    if httpd:
        httpd.shutdown()
        httpd.server_close()
    sys.exit(0)

def start_server(port, use_https=False):
    """Start server with graceful shutdown"""
    global httpd
    try:
        httpd = socketserver.TCPServer(("", port), LLMUIProxyHandler)
        httpd.allow_reuse_address = True
        httpd.timeout = 1
        
        httpd.socket.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
        
        if use_https:
            if not os.path.exists(SSL_CERT) or not os.path.exists(SSL_KEY):
                print(f"❌ SSL certificates not found. HTTPS not started.")
                return
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain(SSL_CERT, SSL_KEY)
            httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
            print(f"✅ HTTPS server active on https://167.114.65.203:{port}")
        else:
            print(f"✅ HTTP server active on http://167.114.65.203:{port}")
        
        server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        server_thread.start()
        
        def cleanup_loop():
            while True:
                time.sleep(CLEANUP_INTERVAL)
                if httpd:
                    cleanup_old_files()
        
        cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
        cleanup_thread.start()
        
        server_thread.join()
        
    except Exception as e:
        print(f"❌ Server failed: {e}")

def main():
    """Main entry point"""
    print("=" * 70)
    print("  🚀 LLMUI Core Proxy Server v2.2.2 - Fixed & Secured")
    print("=" * 70)
    print()
    print(f"📡 Backend: {LLMUI_BACKEND_BASE}")
    print(f"🤖 Ollama: {OLLAMA_BASE}")
    print(f"📂 Web files: {LLMUI_WEB_DIR}")
    print(f"💾 Generated files: {GENERATED_FILES_DIR}")
    print()
    print("🔒 Authentication: Enabled")
    print("   - Unauthenticated users redirected to /login.html")
    print("   - Session verified via backend API")
    print()
    print("✅ Security fixes:")
    print("   - Bug periodic_cleanup() fixed")
    print("   - Path traversal protection enabled")
    print("   - UUID validation added")
    print()
    
    if not os.path.exists(LLMUI_WEB_DIR):
        print(f"⚠️  WARNING: Web directory not found: {LLMUI_WEB_DIR}")
    else:
        print(f"✅ Web directory found")
        web_files = os.listdir(LLMUI_WEB_DIR)
        print(f"   Files: {', '.join(web_files[:5])}")
        if len(web_files) > 5:
            print(f"   ... and {len(web_files) - 5} more")
    
    print()
    print(f"Author: François Chalut")
    print(f"Website: https://llmui.org")
    print("=" * 70)
    print()
    
    signal.signal(signal.SIGINT, shutdown_server)
    signal.signal(signal.SIGTERM, shutdown_server)
    
    if len(sys.argv) > 1:
        mode = sys.argv[1].lower()
        if mode == 'http':
            start_server(HTTP_PORT, use_https=False)
        elif mode == 'https':
            start_server(HTTPS_PORT, use_https=True)
        else:
            print(f"Usage: {sys.argv[0]} [http|https]")
            sys.exit(1)
    else:
        if os.path.exists(SSL_CERT) and os.path.exists(SSL_KEY):
            print("🔒 SSL certificates found - starting HTTPS server")
            start_server(HTTPS_PORT, use_https=True)
        else:
            print("🌐 SSL certificates not found - starting HTTP server")
            start_server(HTTP_PORT, use_https=False)
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown_server(signal.SIGINT, None)

if __name__ == "__main__":
    main()
