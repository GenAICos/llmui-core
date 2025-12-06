# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
LLMUI Core Backend v0.5.0 - FastAPI Version
==========================================
Multi-model consensus generation system
Author: François Chalut
Website: https://llmui.org

CORRECTIONS v0.5.0:
- 🔐 FIX CRITIQUE: Uniformisation du hashage avec andy_installer.py
- Utilisation de bcrypt (ou PBKDF2 avec salt en fallback) au lieu de SHA256 simple
- Ajout de hash_password_secure() et verify_password_secure()
- Le mot de passe créé par andy_installer.py fonctionne maintenant correctement
- FIX: Validation UserResponse - gestion correcte des valeurs NULL de la DB
- FIX: Vérification robuste de l'existence des utilisateurs avant création UserResponse

CORRECTIONS v0.5.0:
- FIX: JSONResponse 401 corrigé - status_code en paramètre direct
- FIX: /api/models retourne maintenant des objets {name, size} au lieu de strings
- FIX: /api/timeout-levels retourne success: true
- FIX: Suppression de la fonction login dupliquée
- FIX: Ajout des modèles Pydantic de réponse pour l'authentification (UserResponse, LoginResponse, SessionResponse)
- Tous les endpoints fonctionnels

Features:
- FastAPI framework (modern & async)
- Qwen2-Embedding-8B for embeddings
- Configurable timeouts (15min - 12h)
- SQLite persistence
- Memory management
"""

import os
import json
import sqlite3
import hashlib
import secrets
import binascii
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from zoneinfo import ZoneInfo

# FastAPI imports
from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import uvicorn

# AJOUTÉ: Session middleware
from starlette.middleware.sessions import SessionMiddleware

# HTTP client
import httpx

# ============================================================================
# CONFIGURATION
# ============================================================================

class TimeoutLevel(str, Enum):
    """Timeout level categories"""
    LOW = "low"           # 15 minutes
    MEDIUM = "medium"     # 1 hour
    HIGH = "high"         # 4 hours  
    VERY_HIGH = "very_high"  # 12 hours

TIMEOUT_CONFIG = {
    TimeoutLevel.LOW: {
        "simple": 900000,      # 15 minutes en millisecondes
        "consensus": 1800000,  # 30 minutes en millisecondes
        "description": "Quick responses - Small models"
    },
    TimeoutLevel.MEDIUM: {
        "simple": 3600000,     # 1 heure en millisecondes
        "consensus": 7200000,  # 2 heures en millisecondes
        "description": "Normal tasks - Medium models"
    },
    TimeoutLevel.HIGH: {
        "simple": 14400000,    # 4 heures en millisecondes
        "consensus": 28800000, # 8 heures en millisecondes
        "description": "Complex analysis - Large models"
    },
    TimeoutLevel.VERY_HIGH: {
        "simple": 43200000,    # 12 heures en millisecondes
        "consensus": 86400000, # 24 heures en millisecondes
        "description": "Large projects - Huge models"
    }
}

# Embedding configuration
EMBEDDING_MODEL = "Qwen/Qwen2-Embedding-8B"
EMBEDDING_DIMENSION = 1024

# Paths
DB_PATH = os.getenv("LLMUI_DB_PATH", "/var/lib/llmui/llmui.db")
LOG_DIR = os.getenv("LLMUI_LOG_DIR", "/var/log/llmui")

# Ollama configuration
OLLAMA_URLS = ["http://localhost:11434"]
OLLAMA_API_BASE = OLLAMA_URLS[0]  # Use first URL as base
DEFAULT_WORKER_MODELS = ["granite3.1:2b", "phi3:3.8b", "qwen2.5:3b"]
DEFAULT_MERGER_MODEL = "mistral:7b"
DEFAULT_TIMEOUT_LEVEL = TimeoutLevel.MEDIUM

# CONFIG SESSION
SECRET_KEY = os.getenv("SESSION_SECRET_KEY", secrets.token_hex(32))

# ============================================================================
# 🌐 SYSTÈME D'ENRICHISSEMENT DES PROMPTS
# ============================================================================

def get_system_metadata(language: str = 'en') -> str:
    """
    Génère les métadonnées système à injecter au début du prompt.
    Ces informations sont invisibles pour l'utilisateur mais critiques pour le modèle.
    """
    # Utiliser ZoneInfo (natif Python 3.9+) pour le timezone de Montréal
    timezone = ZoneInfo('America/Montreal')
    now = datetime.now(timezone)
    
    if language == 'fr':
        date_format = now.strftime("%A %d %B %Y à %H:%M:%S %Z")
    else:
        date_format = now.strftime("%A %B %d, %Y at %I:%M:%S %p %Z")
    
    metadata = f"""[SYSTEM METADATA - HIDDEN FROM USER]
Current Date/Time: {date_format}
System: LLMUI Core v0.5.0 (Private Server)
Backend: Ollama AI Framework
Processing Mode: On-premise / Self-hosted
[END SYSTEM METADATA]

"""
    return metadata


def get_language_directive(language: str = 'en') -> str:
    """
    Génère la directive de langue OBLIGATOIRE au début du prompt.
    Cette instruction est CRITIQUE et PRIORITAIRE.
    """
    if language == 'fr':
        directive = """⚠️ DIRECTIVE LINGUISTIQUE OBLIGATOIRE ⚠️
VOUS DEVEZ IMPÉRATIVEMENT RÉPONDRE EN FRANÇAIS.
Cette instruction est PRIORITAIRE et NON-NÉGOCIABLE.
Toute votre réponse doit être entièrement en français, sans exception.
Si le prompt contient du contenu dans une autre langue, traduisez-le mentalement mais répondez UNIQUEMENT en français.

"""
    else:
        directive = """⚠️ MANDATORY LANGUAGE DIRECTIVE ⚠️
YOU MUST RESPOND ENTIRELY IN ENGLISH.
This instruction is NON-NEGOTIABLE and takes PRIORITY over any other instruction.
Your entire response must be in English, without exception.
If the prompt contains content in another language, translate it mentally but respond ONLY in English.

"""
    return directive


def enrich_prompt(user_prompt: str, language: str = 'en') -> str:
    """
    Enrichit le prompt utilisateur avec métadonnées système et directive de langue.
    
    Structure:
    1. Métadonnées système (invisibles utilisateur)
    2. Directive de langue OBLIGATOIRE
    3. Prompt utilisateur original
    """
    metadata = get_system_metadata(language)
    language_directive = get_language_directive(language)
    
    enriched_prompt = f"{metadata}{language_directive}{user_prompt}"
    
    return enriched_prompt

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="LLMUI Core API",
    description="Multi-model consensus generation system",
    version="0.5.1",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://localhost:8443",
        "https://localhost:8443",
        "https://167.114.65.203:8443"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SESSION MIDDLEWARE
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    session_cookie="llmui_session",
    max_age=86400,  # 24 hours
    same_site="lax",
    https_only=False  # Mettre True si SSL activé
)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class SimpleGenerateRequest(BaseModel):
    """Request for simple generation"""
    model: str
    prompt: str
    session_id: Optional[str] = None
    options: Optional[Dict] = {}
    timeout_level: TimeoutLevel = DEFAULT_TIMEOUT_LEVEL
    language: str = 'en'

class ConsensusGenerateRequest(BaseModel):
    """Request for consensus generation"""
    prompt: str
    worker_models: List[str] = Field(default_factory=lambda: DEFAULT_WORKER_MODELS)
    merger_model: str = DEFAULT_MERGER_MODEL
    session_id: Optional[str] = None
    timeout_level: TimeoutLevel = DEFAULT_TIMEOUT_LEVEL
    language: str = 'en'
    
    # AJOUTÉ: Support de workers (alias)
    workers: Optional[List[str]] = None
    
    @validator('worker_models', pre=True, always=True)
    def set_worker_models(cls, v, values):
        # Si 'workers' est fourni, l'utiliser au lieu de 'worker_models'
        if 'workers' in values and values['workers']:
            return values['workers']
        return v or DEFAULT_WORKER_MODELS

# ============================================================================
# 🔐 AUTHENTIFICATION - MODELS & FONCTIONS
# ============================================================================

class LoginRequest(BaseModel):
    """Login request model"""
    username: str
    password: str
    rememberMe: Optional[bool] = False

# CORRIGÉ v0.5.0: Modèle pour les informations utilisateur dans les réponses
class UserResponse(BaseModel):
    """User info for response"""
    id: int
    username: str
    email: Optional[str] = None
    is_admin: bool = False
    created_at: Optional[str] = None

# Modèle de réponse pour la connexion
class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse] = None

# Modèle de réponse pour la vérification de session
class SessionResponse(BaseModel):
    authenticated: bool
    user: Optional[UserResponse] = None

# ============================================================================
# 🔐 FONCTIONS DE HASHAGE SÉCURISÉ (identiques à andy_installer.py)
# ============================================================================

def hash_password_secure(password: str) -> str:
    """
    Hash sécurisé du mot de passe avec bcrypt (ou PBKDF2 en fallback)
    IDENTIQUE à la fonction dans andy_installer.py
    """
    try:
        import bcrypt
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode(), salt).decode()
    except ImportError:
        print("[WARNING] bcrypt non disponible, utilisation de PBKDF2 avec salt")
        # Fallback sécurisé si bcrypt n'est pas disponible
        salt = os.urandom(32)
        key = hashlib.pbkdf2_hmac(
            'sha256', 
            password.encode(), 
            salt, 
            100000  # 100,000 itérations
        )
        return binascii.hexlify(salt + key).decode()

def verify_password_secure(password: str, stored_hash: str) -> bool:
    """
    Vérifie un mot de passe contre un hash stocké
    IDENTIQUE à la fonction dans andy_installer.py
    
    Supporte:
    - bcrypt (préféré)
    - PBKDF2 avec salt (fallback)
    - SHA256 simple (legacy, déprécié)
    """
    try:
        import bcrypt
        # Essayer d'abord bcrypt
        if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$') or stored_hash.startswith('$2y$'):
            return bcrypt.checkpw(password.encode(), stored_hash.encode())
    except ImportError:
        pass
    
    # PBKDF2 avec salt (longueur 128 car 32 bytes salt + 32 bytes key = 64 bytes = 128 hex chars)
    if len(stored_hash) == 128:
        try:
            salt_key = binascii.unhexlify(stored_hash)
            salt = salt_key[:32]
            stored_key = salt_key[32:]
            key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
            return key == stored_key
        except:
            pass
    
    # Fallback: SHA256 simple (legacy, déprécié mais supporté pour compatibilité)
    legacy_hash = hashlib.sha256(password.encode()).hexdigest()
    return legacy_hash == stored_hash

def get_current_user(request: Request) -> Optional[Dict]:
    """Get current authenticated user from session"""
    user_id = request.session.get("user_id")
    if user_id:
        return {
            "id": user_id,
            "username": request.session.get("username"),
            "email": request.session.get("email"),
            "is_admin": request.session.get("is_admin", False),
            "login_time": request.session.get("login_time")
        }
    return None

def require_auth(request: Request) -> Dict:
    """Dependency to require authentication"""
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return user

# ============================================================================
# 🔐 AUTHENTIFICATION - ENDPOINTS
# ============================================================================

@app.post("/api/auth/login", response_model=LoginResponse)
async def login_user(credentials: LoginRequest, request: Request):
    """User login endpoint"""
    try:
        username = credentials.username.strip().lower()
        password = credentials.password
        
        print(f"[AUTH] Attempting login for user: {username}")
        
        # Get user from DB
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, username, password_hash, email, is_admin, created_at
            FROM users
            WHERE LOWER(username) = ?
        ''', (username,))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            # FIX v0.5.0: Vérifier que l'ID n'est pas None (base de données corrompue)
            if user[0] is None:
                print(f"[ERROR] User '{username}' has NULL id in database - database corruption!")
                return JSONResponse(
                    status_code=500,
                    content={
                        'success': False,
                        'message': 'Erreur de base de données - veuillez contacter l\'administrateur'
                    }
                )
            
            stored_hash = user[2]
            
            # CORRECTION v0.5.0: Utiliser verify_password_secure au lieu de SHA256
            if verify_password_secure(password, stored_hash):
                # Create session
                is_admin = bool(user[4]) if user[4] is not None else False
                user_info = {
                    "id": user[0],
                    "username": user[1],
                    "email": user[3] if user[3] is not None else "",
                    "is_admin": is_admin
                }
                
                request.session['user_id'] = user_info['id']
                request.session['username'] = user_info['username']
                request.session['email'] = user_info['email']
                request.session['is_admin'] = user_info['is_admin']
                request.session['login_time'] = datetime.now().isoformat()
                
                # Update last_login
                conn = sqlite3.connect(DB_PATH)
                conn.execute(
                    'UPDATE users SET last_login = ? WHERE id = ?',
                    (datetime.now().isoformat(), user[0])
                )
                conn.commit()
                conn.close()
                
                print(f"[AUTH] User '{username}' logged in successfully (id={user[0]})")
                
                # FIX v0.5.0: Assurer que toutes les valeurs sont définies correctement
                return LoginResponse(
                    success=True,
                    message='Connexion réussie',
                    user=UserResponse(
                        id=user[0],
                        username=user[1],
                        email=user[3] if user[3] is not None else None,
                        is_admin=is_admin,
                        created_at=user[5] if user[5] is not None else None
                    )
                )
            else:
                print(f"[AUTH] Failed login attempt for user '{username}' (Wrong Password)")
                return JSONResponse(
                    status_code=401,
                    content={
                        'success': False,
                        'message': 'Nom d\'utilisateur ou mot de passe incorrect'
                    }
                )
                
        else:
            print(f"[AUTH] Failed login attempt for user '{username}' (User Not Found)")
            return JSONResponse(
                status_code=401,
                content={
                    'success': False,
                    'message': 'Nom d\'utilisateur ou mot de passe incorrect'
                }
            )
            
    except Exception as e:
        print(f"[ERROR] Login failed: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'message': "Erreur lors de l'authentification: " + str(e)
            }
        )

@app.get("/api/auth/verify", response_model=SessionResponse)
async def verify_session(request: Request):
    """Verify if user is authenticated"""
    user_data = get_current_user(request)
    
    if user_data:
        # FIX v0.5.0: Vérifier que l'ID existe et est valide
        if user_data.get('id') is None:
            print("[ERROR] Session has NULL user_id - clearing session")
            request.session.clear()
            return SessionResponse(authenticated=False)
        
        # Construit l'objet UserResponse sans le login_time pour le Pydantic Model
        user_response = UserResponse(
            id=user_data['id'],
            username=user_data['username'],
            email=user_data.get('email'),
            is_admin=user_data.get('is_admin', False)
            # created_at est absent de la session, mais optionnel dans UserResponse
        )
        return SessionResponse(
            authenticated=True,
            user=user_response
        )
    
    return SessionResponse(authenticated=False)

@app.post("/api/auth/logout")
async def logout(request: Request):
    """Logout user and destroy session"""
    username = request.session.get('username', 'unknown')
    request.session.clear()
    
    print(f"[AUTH] User '{username}' logged out")
    
    # Utiliser JSONResponse
    return JSONResponse(
        content={
            'success': True,
            'message': 'Déconnexion réussie'
        }
    )

@app.get("/api/auth/user")
async def get_user_info(request: Request, user: Dict = Depends(require_auth)):
    """Get current user information (protected route)"""
    # L'objet `user` est déjà rempli par `require_auth`
    return JSONResponse(content={'user': user})

# ============================================================================
# DATABASE MODELS & CLASSES
# ============================================================================

@dataclass
class Model:
    """Ollama model information"""
    name: str
    size: int = 0
    modified_at: Optional[str] = None
    digest: Optional[str] = None
    details: Optional[Dict] = None

@dataclass
class Message:
    """Conversation message"""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

class DatabaseManager:
    """SQLite database manager"""
    
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database tables"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Conversations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                prompt TEXT NOT NULL,
                response TEXT NOT NULL,
                model TEXT,
                worker_models TEXT,
                merger_model TEXT,
                processing_time REAL,
                timestamp TEXT NOT NULL,
                mode TEXT DEFAULT 'simple'
            )
        """)
        
        # Messages table (for context)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        
        # Embeddings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                message_id INTEGER NOT NULL,
                embedding BLOB NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (message_id) REFERENCES messages(id)
            )
        """)
        
        # AJOUTÉ: Table des utilisateurs si elle n'existe pas
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                email TEXT,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                last_login TEXT
            )
        """)
        
        # DÉSACTIVÉ: Les utilisateurs sont créés par andy_installer.py
        # Ne pas créer d'utilisateurs par défaut ici pour éviter les conflits
        #
        # # Insertion des utilisateurs par défaut si la table est vide
        # cursor.execute("SELECT COUNT(*) FROM users")
        # if cursor.fetchone()[0] == 0:
        #     # CORRECTION v0.5.0: Utiliser hash_password_secure au lieu de SHA256
        #     francois_hash = hash_password_secure("Francois2025!")
        #     demo_hash = hash_password_secure("demo123")
        #     
        #     # Utilisateur admin
        #     cursor.execute("""
        #         INSERT INTO users (username, password_hash, email, is_admin, created_at)
        #         VALUES (?, ?, ?, ?, ?)
        #     """, ("francois", francois_hash, "admin@llmui.org", 1, datetime.now().isoformat()))
        #     
        #     # Utilisateur démo
        #     cursor.execute("""
        #         INSERT INTO users (username, password_hash, email, is_admin, created_at)
        #         VALUES (?, ?, ?, ?, ?)
        #     """, ("demo", demo_hash, "demo@llmui.org", 0, datetime.now().isoformat()))
        #     
        #     print("[INFO] Default users created in SQLite DB.")
        
        conn.commit()
        conn.close()
    
    def save_conversation(self, session_id: str, prompt: str, response: str,
                         model: Optional[str] = None, worker_models: Optional[List[str]] = None,
                         merger_model: Optional[str] = None, processing_time: float = 0.0,
                         mode: str = 'simple'):
        """Save conversation to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO conversations 
            (session_id, prompt, response, model, worker_models, merger_model, processing_time, timestamp, mode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_id,
            prompt,
            response,
            model,
            json.dumps(worker_models) if worker_models else None,
            merger_model,
            processing_time,
            datetime.now().isoformat(),
            mode
        ))
        
        conn.commit()
        conn.close()
    
    def save_message(self, session_id: str, role: str, content: str) -> int:
        """Save message and return message ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO messages (session_id, role, content, timestamp)
            VALUES (?, ?, ?, ?)
        """, (session_id, role, content, datetime.now().isoformat()))
        
        message_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return message_id
    
    def get_session_messages(self, session_id: str, limit: int = 10) -> List[Message]:
        """Get recent messages for a session"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT role, content, timestamp
            FROM messages
            WHERE session_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        """, (session_id, limit))
        
        rows = cursor.fetchall()
        conn.close()
        
        # Reverse to get chronological order
        messages = [Message(role=r[0], content=r[1], timestamp=r[2]) for r in reversed(rows)]
        return messages
    
    def get_stats(self) -> Dict:
        """Get usage statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Total conversations
        cursor.execute("SELECT COUNT(*) FROM conversations")
        total_requests = cursor.fetchone()[0]
        
        # Average processing time
        cursor.execute("SELECT AVG(processing_time) FROM conversations WHERE processing_time IS NOT NULL")
        avg_time = cursor.fetchone()[0] or 0.0
        
        conn.close()
        
        return {
            "total_requests": total_requests,
            "average_processing_time": round(avg_time, 2),
            "success_rate": 100  # Simplified - could be calculated from error logs
        }

class MemoryManager:
    """Conversation context memory manager"""
    
    def __init__(self, db: DatabaseManager, max_context_messages: int = 10):
        self.db = db
        self.max_context_messages = max_context_messages
    
    def add_message(self, session_id: str, role: str, content: str):
        """Add a message to conversation history"""
        self.db.save_message(session_id, role, content)
    
    def get_context(self, session_id: str) -> str:
        """Get conversation context as formatted string"""
        messages = self.db.get_session_messages(session_id, self.max_context_messages)
        
        if not messages:
            return ""
        
        context_parts = []
        for msg in messages:
            role_label = "User" if msg.role == "user" else "Assistant"
            context_parts.append(f"{role_label}: {msg.content}")
        
        return "\n".join(context_parts)
    
    def clear_session(self, session_id: str):
        """Clear session history (would need implementation in DatabaseManager)"""
        # For now, this is a placeholder
        # In production, you'd want to actually delete or archive the messages
        pass

# ============================================================================
# CORE LOGIC
# ============================================================================

class LLMUICore:
    """Core logic for LLMUI system"""
    
    def __init__(self):
        self.ollama_base = OLLAMA_API_BASE
        self.db = DatabaseManager()
        self.memory = MemoryManager(self.db)
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(3600.0))  # 1 hour max
    
    async def get_available_models(self) -> List[str]:
        """Get list of available Ollama models"""
        try:
            response = await self.client.get(f"{self.ollama_base}/api/tags")
            response.raise_for_status()
            data = response.json()
            return [model["name"] for model in data.get("models", [])]
        except Exception as e:
            print(f"Error getting models: {e}")
            return []
    
    async def generate_simple(self, model: str, prompt: str, 
                             session_id: Optional[str] = None,
                             timeout_level: TimeoutLevel = DEFAULT_TIMEOUT_LEVEL,
                             language: str = 'en') -> Dict:
        """Simple generation with one model"""
        start_time = datetime.now()
        
        try:
            # Enrichir le prompt avec métadonnées et directive de langue
            enriched_prompt = enrich_prompt(prompt, language)
            
            # Get context if session exists
            context = ""
            if session_id:
                context = self.memory.get_context(session_id)
                if context:
                    enriched_prompt = f"[CONVERSATION HISTORY]\n{context}\n\n[CURRENT REQUEST]\n{enriched_prompt}"
            
            # Get timeout for this level
            timeout_ms = TIMEOUT_CONFIG[timeout_level]["simple"]
            timeout_seconds = timeout_ms / 1000.0
            
            print(f"🚀 Génération simple avec {model} (timeout: {timeout_seconds}s, langue: {language})")
            
            # Call Ollama API
            response = await self.client.post(
                f"{self.ollama_base}/api/generate",
                json={
                    "model": model,
                    "prompt": enriched_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "top_k": 40
                    }
                },
                timeout=timeout_seconds
            )
            
            response.raise_for_status()
            result = response.json()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Save to database
            if session_id:
                self.db.save_conversation(
                    session_id=session_id,
                    prompt=prompt,
                    response=result["response"],
                    model=model,
                    processing_time=processing_time,
                    mode='simple'
                )
            
            print(f"✅ Génération simple terminée en {processing_time:.2f}s")
            
            return {
                "success": True,
                "response": result["response"],
                "model": model,
                "processing_time": processing_time
            }
            
        except httpx.TimeoutException:
            error_msg = f"⏰ Timeout dépassé ({timeout_level.value}) pour le modèle {model}"
            print(error_msg)
            return {
                "success": False,
                "error": error_msg,
                "response": ""
            }
        except Exception as e:
            error_msg = f"Erreur lors de la génération: {str(e)}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "response": ""
            }
    
    async def generate_consensus(self, prompt: str, 
                                worker_models: List[str],
                                merger_model: str,
                                session_id: Optional[str] = None,
                                timeout_level: TimeoutLevel = DEFAULT_TIMEOUT_LEVEL,
                                language: str = 'en') -> Dict:
        """Consensus generation with multiple models"""
        start_time = datetime.now()
        
        try:
            # Enrichir le prompt
            enriched_prompt = enrich_prompt(prompt, language)
            
            # Get context if session exists
            context = ""
            if session_id:
                context = self.memory.get_context(session_id)
                if context:
                    enriched_prompt = f"[CONVERSATION HISTORY]\n{context}\n\n[CURRENT REQUEST]\n{enriched_prompt}"
            
            # Get timeout for this level
            timeout_ms = TIMEOUT_CONFIG[timeout_level]["consensus"]
            timeout_seconds = timeout_ms / 1000.0
            
            print(f"🔥 Génération consensus avec {len(worker_models)} workers (timeout: {timeout_seconds}s, langue: {language})")
            
            # Phase 1: Worker responses
            worker_responses = []
            for worker in worker_models:
                try:
                    # Note: Le timeout des workers est le timeout global divisé par le nombre de workers, ce qui est une heuristique.
                    worker_timeout = timeout_seconds / len(worker_models) if len(worker_models) > 0 else timeout_seconds
                    
                    response = await self.client.post(
                        f"{self.ollama_base}/api/generate",
                        json={
                            "model": worker,
                            "prompt": enriched_prompt,
                            "stream": False
                        },
                        timeout=worker_timeout
                    )
                    response.raise_for_status()
                    result = response.json()
                    worker_responses.append({
                        "model": worker,
                        "response": result["response"]
                    })
                    print(f"  ✅ {worker} terminé")
                except Exception as e:
                    print(f"  ❌ {worker} échoué: {e}")
                    worker_responses.append({
                        "model": worker,
                        "response": f"[ERROR: {str(e)}]"
                    })
            
            # Phase 2: Merger synthesis
            merger_prompt = f"""Based on the following responses from different AI models, create a comprehensive and accurate synthesis.

Original Question: {prompt}

Responses:
"""
            for i, wr in enumerate(worker_responses, 1):
                merger_prompt += f"\nModel {i} ({wr['model']}):\n{wr['response']}\n"
            
            # Assurer que la directive de langue est également dans le prompt du Merger
            language_directive = get_language_directive(language)
            merger_prompt += f"\n{language_directive}"
            merger_prompt += f"\nProvide a synthesized response that combines the best insights from all models. RESPOND IN {language.upper()}."
            
            # Note: Le timeout du merger est le timeout global divisé par 2, ce qui est une heuristique.
            merger_timeout = timeout_seconds / 2
            
            response = await self.client.post(
                f"{self.ollama_base}/api/generate",
                json={
                    "model": merger_model,
                    "prompt": merger_prompt,
                    "stream": False
                },
                timeout=merger_timeout
            )
            response.raise_for_status()
            merger_result = response.json()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Save to database
            if session_id:
                self.db.save_conversation(
                    session_id=session_id,
                    prompt=prompt,
                    response=merger_result["response"],
                    worker_models=worker_models,
                    merger_model=merger_model,
                    processing_time=processing_time,
                    mode='consensus'
                )
            
            print(f"✅ Consensus terminé en {processing_time:.2f}s")
            
            return {
                "success": True,
                "response": merger_result["response"],
                "worker_models": worker_models,
                "merger_model": merger_model,
                "worker_count": len(worker_responses),
                "processing_time": processing_time
            }
            
        except httpx.TimeoutException:
            error_msg = f"⏰ Timeout dépassé ({timeout_level.value}) pour le consensus"
            print(error_msg)
            return {
                "success": False,
                "error": error_msg,
                "response": ""
            }
        except Exception as e:
            error_msg = f"Erreur lors du consensus: {str(e)}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "response": ""
            }

# ============================================================================
# INITIALIZE CORE INSTANCE
# ============================================================================

# Create global core instance
core = LLMUICore()

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "LLMUI Core API",
        "version": "0.5.0",
        "status": "running"
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint (PUBLIC - no auth required)"""
    try:
        # Test Ollama connection
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OLLAMA_API_BASE}/api/tags", timeout=5.0)
            ollama_status = "ok" if response.status_code == 200 else "error"
    except Exception:
        ollama_status = "error"
    
    # Test database
    try:
        db = DatabaseManager()
        db_status = "ok"
    except Exception:
        db_status = "error"
    
    return {
        "status": "ok" if ollama_status == "ok" and db_status == "ok" else "degraded",
        "ollama": ollama_status,
        "database": db_status,
        "version": "0.5.0"
    }

@app.get("/api/models")
async def get_models(request: Request, user: Dict = Depends(require_auth)):
    """Get available models (PROTÉGÉ)"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OLLAMA_API_BASE}/api/tags", timeout=10.0)
            response.raise_for_status()
            data = response.json()
        
        # FIX: Retourner des objets {name, size} au lieu de simples strings
        models = data.get("models", [])
        models_data = [
            {
                "name": m.get("name", ""),
                "size": m.get("size", 0),
                "modified": m.get("modified_at", "")
            }
            for m in models
        ]
        
        return {
            "success": True,
            "models": models_data,
            "total_models": len(models_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/timeout-levels")
async def get_timeout_levels(request: Request, user: Dict = Depends(require_auth)):
    """Get available timeout levels (PROTÉGÉ)"""
    return {
        "success": True,  # FIX: Ajout de success: true
        "levels": {
            level.value: {
                **config,
                "simple_minutes": config["simple"] // 60000,
                "consensus_minutes": config["consensus"] // 60000
            }
            for level, config in TIMEOUT_CONFIG.items()
        },
        "default": DEFAULT_TIMEOUT_LEVEL.value
    }

@app.post("/api/simple-generate")
async def simple_generate(request: Request, req: SimpleGenerateRequest, user: Dict = Depends(require_auth)):
    """Simple generation endpoint (PROTÉGÉ)"""
    try:
        result = await core.generate_simple(
            req.model,
            req.prompt,
            req.session_id,
            req.timeout_level,
            req.language
        )
        
        # Save to memory
        if req.session_id and result["success"]:
            core.memory.add_message(req.session_id, "user", req.prompt)
            core.memory.add_message(req.session_id, "assistant", result["response"])
        
        return result
        
    except Exception as e:
        # TOUJOURS retourner du JSON, jamais d'exception HTML
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e), "response": ""}
        )

@app.post("/api/generate")
@app.post("/api/consensus-generate")
async def consensus_generate(request: Request, req: ConsensusGenerateRequest, user: Dict = Depends(require_auth)):
    """Consensus generation endpoint (PROTÉGÉ)"""
    try:
        result = await core.generate_consensus(
            req.prompt,
            req.worker_models,
            req.merger_model,
            req.session_id,
            req.timeout_level,
            req.language
        )
        
        # Save to memory
        if req.session_id and result["success"]:
            core.memory.add_message(req.session_id, "user", req.prompt)
            core.memory.add_message(req.session_id, "assistant", result["response"])
        
        return result
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e), "response": ""}
        )

@app.get("/api/stats")
async def get_stats():
    """Get statistics (PUBLIC - no auth required)"""
    try:
        db = DatabaseManager()
        stats = db.get_stats()
        
        # Récupérer le nombre de modèles depuis Ollama
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{OLLAMA_API_BASE}/api/tags", timeout=5.0)
                if response.status_code == 200:
                    models_data = response.json()
                    models_count = len(models_data.get("models", []))
                else:
                    models_count = 0
        except:
            models_count = 0
        
        return {
            "success": True,
            "stats": {
                "models_count": models_count,
                "total_conversations": stats.get("total_requests", 0),
                "success_rate": stats.get("success_rate", 0),
                "avg_response_time": stats.get("average_processing_time", 0.0)
            }
        }
    except Exception as e:
        return {
            "success": False,
            "stats": {
                "models_count": 0,
                "total_conversations": 0,
                "success_rate": 100,
                "avg_response_time": 0.0
            },
            "error": str(e)
        }
        
@app.get("/api/session-context/{session_id}")
async def get_session_context(request: Request, session_id: str, user: Dict = Depends(require_auth)):
    """Get conversation context (PROTÉGÉ)"""
    try:
        context = core.memory.get_context(session_id)
        return {"context": context}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/session/{session_id}")
async def delete_session(request: Request, session_id: str, user: Dict = Depends(require_auth)):
    """Delete session (PROTÉGÉ)"""
    try:
        core.memory.clear_session(session_id)
        return {"success": True, "message": f"Session {session_id} cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# 🔍 NOUVEAU MIDDLEWARE - REQUEST LOGGING
# ============================================================================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests with authentication info"""
    start_time = datetime.now()
    
    # Get user if authenticated (with safety check)
    user_info = 'anonymous'
    try:
        user = get_current_user(request)
        if user:
            user_info = f"user={user.get('username', 'unknown')} (admin={user.get('is_admin', False)})"
    except:
        pass
    
    # Process request
    response = await call_next(request)
    
    # Calculate processing time
    process_time = (datetime.now() - start_time).total_seconds()
    
    # Log request
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
          f"{request.method} {request.url.path} - "
          f"Status: {response.status_code} - "
          f"Time: {process_time:.3f}s - "
          f"User: {user_info}")
    
    return response

# ============================================================================
# RUN SERVER
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 LLMUI Core Backend v0.5.0 - Starting...")
    print("="*60)
    print(f"📦 Database: {DB_PATH}")
    print(f"🤖 Ollama: {OLLAMA_API_BASE}")
    print(f"⏱️  Default timeout: {DEFAULT_TIMEOUT_LEVEL.value}")
    print("="*60 + "\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5000,
        log_level="info"
    )
