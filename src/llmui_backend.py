# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
LLMUI Core Backend v0.5 - FastAPI Version
==========================================
Multi-model consensus generation system
Author: François Chalut
Website: https://llmui.org

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
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import pytz

# ============================================================================
# AJOUT AUTHENTIFICATION - IMPORTS
# ============================================================================
import secrets

# FastAPI imports
from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import uvicorn

# AJOUTÃ‰: Session middleware
from starlette.middleware.sessions import SessionMiddleware
# ============================================================================

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
DEFAULT_WORKER_MODELS = ["granite4-micro-h", "phi3:3.8b", "qwen2.5:3b"]
DEFAULT_MERGER_MODEL = "mistral:7b"
DEFAULT_TIMEOUT_LEVEL = TimeoutLevel.MEDIUM

# ============================================================================
# ðŸ” AJOUT AUTHENTIFICATION - CONFIG SESSION
# ============================================================================
SECRET_KEY = os.getenv("SESSION_SECRET_KEY", secrets.token_hex(32))
# ============================================================================

# ============================================================================
# 🌍 SYSTÈME D'ENRICHISSEMENT DES PROMPTS
# ============================================================================

def get_system_metadata(language: str = 'en') -> str:
    """
    Génère les métadonnées système à injecter au début du prompt.
    Ces informations sont invisibles pour l'utilisateur mais critiques pour le modèle.
    """
    # Utiliser pytz pour le timezone de Montréal
    timezone = pytz.timezone('America/Montreal')
    now = datetime.now(timezone)
    
    if language == 'fr':
        date_format = now.strftime("%A %d %B %Y à %H:%M:%S %Z")
    else:
        date_format = now.strftime("%A %B %d, %Y at %I:%M:%S %p %Z")
    
    metadata = f"""[SYSTEM METADATA - HIDDEN FROM USER]
Current Date/Time: {date_format}
System: LLMUI Core v2.0.1 (Private Server)
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
This instruction is PRIORITY and NON-NEGOTIABLE.
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

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="LLMUI Core API",
    description="Multi-model consensus generation system",
    version="0.5",
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
        "https://10.8.0.2:8443"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# AJOUT AUTHENTIFICATION - SESSION MIDDLEWARE
# ============================================================================
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    session_cookie="llmui_session",
    max_age=86400,  # 24 hours
    same_site="lax",
    https_only=False  # Mettre True si SSL activé
)
# ============================================================================

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

class ModelInfo(BaseModel):
    """Model information"""
    name: str
    size: Optional[str] = None
    modified: Optional[str] = None

# ============================================================================
# AJOUT AUTHENTIFICATION - MODÃˆLES PYDANTIC
# ============================================================================
class LoginRequest(BaseModel):
    """Request for user login"""
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1)
    rememberMe: bool = False

class LoginResponse(BaseModel):
    """Response for login attempt"""
    success: bool
    message: str
    user: Optional[Dict[str, Any]] = None

class SessionResponse(BaseModel):
    """Response for session verification"""
    authenticated: bool
    username: Optional[str] = None
    is_admin: Optional[bool] = None
# ============================================================================

# ============================================================================
# AJOUT AUTHENTIFICATION - HELPER FUNCTIONS
# ============================================================================
def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """Get current user from session"""
    if 'user_id' in request.session:
        return {
            'user_id': request.session.get('user_id'),
            'username': request.session.get('username'),
            'email': request.session.get('email'),
            'is_admin': request.session.get('is_admin', False),
            'login_time': request.session.get('login_time')
        }
    return None

def require_auth(request: Request) -> Dict[str, Any]:
    """Dependency to require authentication"""
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user

def require_admin(request: Request) -> Dict[str, Any]:
    """Dependency to require admin privileges"""
    user = require_auth(request)
    if not user.get('is_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return user
# ============================================================================

# ============================================================================
# DATABASE MANAGER
# ============================================================================

class DatabaseManager:
    """SQLite database manager"""
    
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._ensure_db_exists()
    
    def _ensure_db_exists(self):
        """Create database and tables if needed"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # ====================================================================
        # AJOUT AUTHENTIFICATION - TABLE USERS
        # ====================================================================
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT,
                is_admin INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')
        # ====================================================================
        
        # Stats table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                mode TEXT NOT NULL,
                processing_time REAL NOT NULL,
                success BOOLEAN NOT NULL,
                error TEXT,
                timeout_level TEXT
            )
        ''')
        
        # Sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM sessions WHERE id = ?
        ''', (session_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "id": row[0],
                "user_id": row[1],
                "created_at": row[2],
                "last_activity": row[3]
            }
        return None
    
    def create_session(self, session_id: str, user_id: str):
        """Create new session"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO sessions (id, user_id, last_activity)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        ''', (session_id, user_id))
        conn.commit()
        conn.close()
    
    def update_session_activity(self, session_id: str):
        """Update last activity"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE sessions SET last_activity = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (session_id,))
        conn.commit()
        conn.close()
    
    def delete_session(self, session_id: str):
        """Delete session"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            DELETE FROM sessions WHERE id = ?
        ''', (session_id,))
        conn.commit()
        conn.close()
    
    def log_stats(self, mode: str, processing_time: float, success: bool, error: Optional[str] = None, timeout_level: Optional[str] = None):
        """Log statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO stats (timestamp, mode, processing_time, success, error, timeout_level)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (datetime.now().isoformat(), mode, processing_time, success, error, timeout_level))
        conn.commit()
        conn.close()
    
    def get_stats(self) -> Dict:
        """Get aggregated statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Total requests
        cursor.execute('SELECT COUNT(*) FROM stats')
        total_requests = cursor.fetchone()[0]
        
        # Success rate
        cursor.execute('SELECT COUNT(*) FROM stats WHERE success = 1')
        successful_requests = cursor.fetchone()[0]
        success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 0
        
        # Average processing time
        cursor.execute('SELECT AVG(processing_time) FROM stats')
        avg_time = cursor.fetchone()[0] or 0
        
        # By mode
        cursor.execute('''
            SELECT mode, COUNT(*) as count, AVG(processing_time) as avg_time
            FROM stats
            GROUP BY mode
        ''')
        mode_stats = {row[0]: {"count": row[1], "avg_time": row[2]} for row in cursor.fetchall()}
        
        conn.close()
        
        return {
            "total_requests": total_requests,
            "success_rate": success_rate,
            "average_processing_time": avg_time,
            "mode_stats": mode_stats
        }

# ============================================================================
# LLMUI CORE - Main orchestrator class
# ============================================================================

class LLMUICore:
    """
    Main orchestrator for LLMUI Core system.
    Manages models, generation, memory, and database.
    """
    
    def __init__(self):
        """Initialize the core system"""
        self.db = DatabaseManager()
        
        # Import memory system
        try:
            from memory import HybridMemorySystem
            self.memory = HybridMemorySystem()
        except ImportError:
            print("âš ï¸  Warning: Memory system not available")
            self.memory = None
        
        self.available_models = []
        print("âœ… LLMUI Core initialized")
    
    async def get_models(self) -> List[Dict]:
        """Get available Ollama models"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{OLLAMA_API_BASE}/api/tags",
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.available_models = data.get("models", [])
                    return self.available_models
                else:
                    return []
        except Exception as e:
            print(f"Error fetching models: {e}")
            return []
    
    async def generate_simple(
        self,
        model: str,
        prompt: str,
        session_id: Optional[str] = None,
        timeout_level: TimeoutLevel = DEFAULT_TIMEOUT_LEVEL,
        language: str = 'en'
    ) -> Dict:
        """
        Simple generation with one model.
        
        Args:
            model: Model name to use
            prompt: User prompt
            session_id: Optional session ID for memory
            timeout_level: Timeout configuration level
            language: Response language (en/fr)
            
        Returns:
            Dict with success, response, and metadata
        """
        start_time = datetime.now()
        
        try:
            # Get timeout config
            timeout_config = TIMEOUT_CONFIG[timeout_level]
            timeout_millis = timeout_config["simple"]
            timeout_seconds = timeout_millis / 1000  # Conversion en secondes
            
            # Get memory context if available
            context = ""
            if session_id and self.memory:
                context = self.memory.get_context(session_id)
            
            # ✅ BUILD PROMPT IN CORRECT ORDER
            # 1. Metadata (système)
            # 2. Directive (langue)
            # 3. Context (mémoire) - si présent
            # 4. User prompt
            metadata = get_system_metadata(language)
            directive = get_language_directive(language)
            
            if context:
                full_prompt = f"{metadata}{directive}{context}\n\n{prompt}"
            else:
                full_prompt = f"{metadata}{directive}{prompt}"
            
            # Call Ollama API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{OLLAMA_API_BASE}/api/generate",
                    json={
                        "model": model,
                        "prompt": full_prompt,
                        "stream": False
                    },
                    timeout=timeout_seconds  # Utiliser timeout_seconds
                )
                
                if response.status_code == 200:
                    data = response.json()
                    generated_text = data.get("response", "")
                    
                    # Log stats
                    processing_time = (datetime.now() - start_time).total_seconds()
                    self.db.log_stats("simple", processing_time, True, None, timeout_level.value)
                    
                    return {
                        "success": True,
                        "response": generated_text,
                        "model": model,
                        "processing_time": processing_time
                    }
                else:
                    raise Exception(f"Ollama returned status {response.status_code}")
                    
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            self.db.log_stats("simple", processing_time, False, str(e), timeout_level.value)
            
            return {
                "success": False,
                "response": "",
                "error": str(e),
                "processing_time": processing_time
            }
    
    async def generate_consensus(
        self,
        prompt: str,
        worker_models: List[str],
        merger_model: str,
        session_id: Optional[str] = None,
        timeout_level: TimeoutLevel = DEFAULT_TIMEOUT_LEVEL,
        language: str = 'en'
    ) -> Dict:
        """
        Consensus generation with multiple models.
        
        Args:
            prompt: User prompt
            worker_models: List of models to generate responses
            merger_model: Model to merge responses
            session_id: Optional session ID for memory
            timeout_level: Timeout configuration level
            language: Response language (en/fr)
            
        Returns:
            Dict with success, response, and metadata
        """
        start_time = datetime.now()
        
        try:
            # Get timeout config - CORRECTION: Conversion millisecondes -> secondes
            timeout_config = TIMEOUT_CONFIG[timeout_level]
            timeout_millis = timeout_config["consensus"]
            timeout_seconds = timeout_millis / 1000  # Conversion en secondes
            
            # Get memory context if available
            context = ""
            if session_id and self.memory:
                context = self.memory.get_context(session_id)
            
            # ✅ BUILD PROMPT IN CORRECT ORDER
            # 1. Metadata (système)
            # 2. Directive (langue)
            # 3. Context (mémoire) - si présent
            # 4. User prompt
            metadata = get_system_metadata(language)
            directive = get_language_directive(language)
            
            if context:
                full_prompt = f"{metadata}{directive}{context}\n\n{prompt}"
            else:
                full_prompt = f"{metadata}{directive}{prompt}"
            
            # Step 1: Generate responses from worker models
            worker_responses = []
            worker_system = """You are a worker AI in a multi-model consensus system. Your role:
- Analyze the question carefully and provide your best answer
- Be thorough, accurate, and specific
- Your response will be combined with other AI models' responses
- Focus on being helpful and comprehensive
- Don't mention that you're part of a consensus system in your answer"""
            
            # Timeout pour chaque worker: moitié du timeout total
            worker_timeout = timeout_seconds / 2
            
            async with httpx.AsyncClient() as client:
                for model in worker_models:
                    try:
                        response = await client.post(
                            f"{OLLAMA_API_BASE}/api/generate",
                            json={
                                "model": model,
                                "prompt": full_prompt,
                                "system": worker_system,
                                "stream": False
                            },
                            timeout=worker_timeout
                        )
                        
                        if response.status_code == 200:
                            data = response.json()
                            worker_responses.append({
                                "model": model,
                                "response": data.get("response", "")
                            })
                    except Exception as e:
                        print(f"âš ï¸  Worker {model} failed: {e}")
                        continue
            
            if not worker_responses:
                raise Exception("All worker models failed")
            
            # Step 2: Merge responses with clear role definition
            system_instruction = """You are the MERGER in a multi-model consensus AI system.

YOUR ROLE:
You receive responses from {count} different AI models (the "workers"). Your job is to synthesize them into ONE superior answer.

YOUR PROCESS:
1. Read all worker responses carefully
2. Identify what they agree on (high confidence information)
3. Note where they disagree or offer unique insights
4. Extract the best ideas, facts, and explanations from each
5. Resolve contradictions using logic and accuracy

YOUR OUTPUT RULES:
- Write as if YOU are answering the original question directly
- Never say "Based on the responses" or "The models suggest" - just answer
- Be authoritative but accurate
- If workers disagree significantly, briefly mention multiple perspectives
- Be comprehensive but concise
- Use clear, natural language

Remember: The user doesn't know about the consensus system - they just want the best answer.""".format(count=len(worker_responses))

            merge_prompt = f"""ORIGINAL USER QUESTION:
{prompt}

WORKER RESPONSES (from {len(worker_responses)} different AI models):
"""
            for i, wr in enumerate(worker_responses, 1):
                merge_prompt += f"\n=== Worker {i} ({wr['model']}) ===\n{wr['response']}\n"
            
            merge_prompt += f"\n{'='*50}\nYour task: Synthesize these {len(worker_responses)} responses into ONE comprehensive answer to the user's question above.\n\nYour synthesized answer:"
            
            # Timeout pour le merger: moitié du timeout total
            merger_timeout = timeout_seconds / 2
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{OLLAMA_API_BASE}/api/generate",
                    json={
                        "model": merger_model,
                        "prompt": merge_prompt,
                        "system": system_instruction,
                        "stream": False
                    },
                    timeout=merger_timeout
                )
                
                if response.status_code == 200:
                    data = response.json()
                    final_response = data.get("response", "")
                    
                    # Log stats
                    processing_time = (datetime.now() - start_time).total_seconds()
                    self.db.log_stats("consensus", processing_time, True, None, timeout_level.value)
                    
                    return {
                        "success": True,
                        "response": final_response,
                        "worker_models": worker_models,
                        "merger_model": merger_model,
                        "worker_count": len(worker_responses),
                        "processing_time": processing_time
                    }
                else:
                    raise Exception(f"Merger model returned status {response.status_code}")
                    
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            self.db.log_stats("consensus", processing_time, False, str(e), timeout_level.value)
            
            return {
                "success": False,
                "response": "",
                "error": str(e),
                "processing_time": processing_time
            }

# ============================================================================
# INITIALIZE CORE INSTANCE
# ============================================================================

# Create global core instance
core = LLMUICore()

# ============================================================================
# ðŸ” AJOUT AUTHENTIFICATION - ENDPOINTS
# ============================================================================

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest, request: Request):
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
        
        if user:
            stored_hash = user[2]
            
            # Simple hash verification (replace with proper hashing like bcrypt in production)
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            if password_hash == stored_hash:
                # Create session
                request.session['user_id'] = user[0]
                request.session['username'] = user[1]
                request.session['email'] = user[2]
                request.session['is_admin'] = bool(user[3])
                request.session['login_time'] = datetime.now().isoformat()
                
                # Set session duration
                if credentials.rememberMe:
                    request.session['max_age'] = 2592000  # 30 days
                else:
                    request.session['max_age'] = 86400  # 24 hours
                
                # Update last_login
                conn = sqlite3.connect(DB_PATH)
                conn.execute(
                    'UPDATE users SET last_login = ? WHERE id = ?',
                    (datetime.now().isoformat(), user[0])
                )
                conn.commit()
                conn.close()
                
                print(f"[AUTH] User '{username}' logged in successfully")
                
                return LoginResponse(
                    success=True,
                    message='Connexion réussie',
                    user={
                        'id': user[0],
                        'username': user[1],
                        'email': user[2],
                        'is_admin': bool(user[3]),
                        'created_at': user[4]
                    }
                )
            else:
                print(f"[AUTH] Failed login attempt for user '{username}'")
                return LoginResponse(
                    success=False,
                    message='Nom d\'utilisateur ou mot de passe incorrect'
                )
                
        else:
            print(f"[AUTH] Failed login attempt for user '{username}'")
            return LoginResponse(
                success=False,
                message='Nom d\'utilisateur ou mot de passe incorrect'
            )
            
    except Exception as e:
        print(f"[ERROR] Login failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de l'authentification"
        )

@app.get("/api/auth/verify", response_model=SessionResponse)
async def verify_session(request: Request):
    """Verify if user is authenticated"""
    user = get_current_user(request)
    
    if user:
        return SessionResponse(
            authenticated=True,
            username=user['username'],
            is_admin=user['is_admin']
        )
    
    return SessionResponse(authenticated=False)

@app.post("/api/auth/logout")
async def logout(request: Request):
    """Logout user and destroy session"""
    username = request.session.get('username', 'unknown')
    request.session.clear()
    
    print(f"[AUTH] User '{username}' logged out")
    
    return JSONResponse(
        content={
            'success': True,
            'message': 'Déconnexion réussie'
        }
    )

@app.get("/api/auth/user")
async def get_user_info(request: Request, user: Dict = Depends(require_auth)):
    """Get current user information (protected route)"""
    return JSONResponse(content={'user': user})

# ============================================================================
# API ENDPOINTS (CODE ORIGINAL + require_auth AJOUTÃ‰)
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint (PUBLIC - pas d'auth requise)"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "embedding_model": EMBEDDING_MODEL,
        "database": DB_PATH
    }

@app.get("/api/models")
async def list_models(request: Request, user: Dict = Depends(require_auth)):  # MODIFIÃ‰: ajouté require_auth
    """List available Ollama models (PROTÃ‰GÃ‰)"""
    try:
        models = await core.get_models()
        return {
            "success": True,
            "models": [m.name for m in models],  # Retourner noms
            "total_models": len(models)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/timeout-levels")
async def get_timeout_levels(request: Request, user: Dict = Depends(require_auth)):  # MODIFIÃ‰: ajouté require_auth
    """Get available timeout levels (PROTÃ‰GÃ‰)"""
    return {
        "levels": {
            level.value: {
                **config,
                "simple_minutes": config["simple"] // 60000,  # Conversion en minutes
                "consensus_minutes": config["consensus"] // 60000  # Conversion en minutes
            }
            for level, config in TIMEOUT_CONFIG.items()
        },
        "default": DEFAULT_TIMEOUT_LEVEL.value
    }

@app.post("/api/simple-generate")
async def simple_generate(request: Request, req: SimpleGenerateRequest, user: Dict = Depends(require_auth)):  # MODIFIÃ‰: ajouté request et require_auth, renommé request en req
    """Simple generation endpoint (PROTÃ‰GÃ‰)"""
    try:
        result = await core.generate_simple(
            req.model,
            req.prompt,
            req.session_id,
            req.timeout_level,
            req.language
        )
        
        # Save to memory
        if req.session_id:
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
@app.post("/api/consensus-generate")  # Alias pour compatibilite frontend
async def consensus_generate(request: Request, req: ConsensusGenerateRequest, user: Dict = Depends(require_auth)):  # MODIFIÃ‰: ajouté request et require_auth, renommé request en req
    """Consensus generation endpoint (PROTÃ‰GÃ‰)"""
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
        if req.session_id:
            core.memory.add_message(req.session_id, "user", req.prompt)
            core.memory.add_message(req.session_id, "assistant", result["response"])
        
        return result
        
    except Exception as e:
        # TOUJOURS retourner du JSON, jamais d'exception HTML
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e), "response": ""}
        )

@app.get("/api/stats")
async def get_stats():
    """Get statistics (PUBLIC - no auth required)"""
    try:
        # Créer une instance temporaire de DatabaseManager pour récupérer les stats
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
async def get_session_context(request: Request, session_id: str, user: Dict = Depends(require_auth)):  # MODIFIÃ‰: ajouté request et require_auth
    """Get conversation context (PROTÃ‰GÃ‰)"""
    try:
        context = core.memory.get_context(session_id)
        return {"context": context}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/session/{session_id}")
async def delete_session(request: Request, session_id: str, user: Dict = Depends(require_auth)):  # MODIFIÃ‰: ajouté request et require_auth
    """Delete session (PROTÃ‰GÃ‰)"""
    try:
        core.memory.clear_session(session_id)
        return {"success": True, "message": f"Session {session_id} cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ðŸ” NOUVEAU MIDDLEWARE - REQUEST LOGGING
# ============================================================================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests with authentication info"""
    start_time = datetime.now()
    
    # Get user if authenticated (with safety check)
    try:
        user = get_current_user(request)
        user_info = user['username'] if user else 'anonymous'
    except (AssertionError, Exception):
        # Session not available yet or error
        user_info = 'anonymous'
    
    # Process request
    response = await call_next(request)
    
    # Log
    duration = (datetime.now() - start_time).total_seconds()
    
    # Skip logging for static files and health checks
    if not request.url.path.startswith('/static') and request.url.path != '/health':
        print(f"[{datetime.now().isoformat()}] {request.method} {request.url.path} "
              f"- User: {user_info} - Status: {response.status_code} - Duration: {duration:.3f}s")
    
    return response

# ============================================================================
# MAIN (CODE ORIGINAL - PAS MODIFIÃ‰)
# ============================================================================

# ============================================================================
# SERVICE MODE - FOR SYSTEMD
# ============================================================================

def run_service():
    """Run the backend service for systemd"""
    print("Starting LLMUI Backend Service...")
    
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=5000,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("Service stopped by user")
    except Exception as e:
        print(f"Service error: {e}")
        raise

if __name__ == "__main__":
    # Check if running in service mode (no TTY)
    import sys
    if not sys.stdout.isatty():
        # Service mode - run indefinitely
        run_service()
    else:
        # Interactive mode - show banner and run
        print("""
    â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
    â•‘   LLMUI Core Backend v0.5 - FastAPI      â•‘
    â•‘   Author: François Chalut                â•‘
    â•‘   Website: https://llmui.org             â•‘
    â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    
    âœ… FastAPI framework (modern & async)
    âœ… Qwen2-Embedding-8B ready
    âœ… Configurable timeouts (15min - 12h)
    âœ… SQLite persistence
    âœ… Memory management
    
    ðŸŒ API Docs: http://localhost:5000/docs
    ðŸ“Š Stats: http://localhost:5000/api/stats
    â¤ï¸  Health: http://localhost:5000/health
    """)
        
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=5000,
            log_level="info"
        )
