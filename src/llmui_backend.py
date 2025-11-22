# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
LLMUI Core Backend v0.5.0 - FastAPI Version
==========================================
Multi-model consensus generation system
Author: François Chalut
Website: https://llmui.org

CORRECTIONS v0.5.0:
- FIX: /api/models retourne maintenant des objets {name, size} au lieu de strings
- FIX: /api/timeout-levels retourne success: true
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
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import pytz

# ============================================================================
# AJOUT AUTHENTIFICATION - IMPORTS
# ============================================================================
import secrets  # AJOUTÉ pour génération de clés

# FastAPI imports
from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import uvicorn

# AJOUTÉ: Session middleware
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
DEFAULT_WORKER_MODELS = ["granite3.1:2b", "phi3:3.8b", "qwen2.5:3b"]
DEFAULT_MERGER_MODEL = "mistral:7b"
DEFAULT_TIMEOUT_LEVEL = TimeoutLevel.MEDIUM

# ============================================================================
# 🔐 AJOUT AUTHENTIFICATION - CONFIG SESSION
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
    version="0.5.0",
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

# ============================================================================
# 🔐 AJOUT AUTHENTIFICATION - SESSION MIDDLEWARE
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

class User(BaseModel):
    """User model"""
    username: str
    role: str = "user"

# Base de données utilisateurs (TEMPORAIRE - À remplacer par vraie DB)
# Format: username: {password_hash, role}
USERS_DB = {
    "francois": {
        "password_hash": hashlib.sha256("Francois2025!".encode()).hexdigest(),
        "role": "admin"
    },
    "demo": {
        "password_hash": hashlib.sha256("demo123".encode()).hexdigest(),
        "role": "user"
    }
}

def verify_password(username: str, password: str) -> bool:
    """Verify user password"""
    if username not in USERS_DB:
        return False
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    return USERS_DB[username]["password_hash"] == password_hash

def get_current_user(request: Request) -> Optional[Dict]:
    """Get current authenticated user from session"""
    return request.session.get("user")

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

@app.post("/api/auth/login")
async def login(request: Request, login_data: LoginRequest):
    """Login endpoint"""
    if verify_password(login_data.username, login_data.password):
        # Create session
        user_data = {
            "username": login_data.username,
            "role": USERS_DB[login_data.username]["role"],
            "login_time": datetime.now().isoformat()
        }
        request.session["user"] = user_data
        
        return {
            "success": True,
            "message": "Login successful",
            "user": {
                "username": login_data.username,
                "role": user_data["role"]
            }
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

@app.post("/api/auth/logout")
async def logout(request: Request):
    """Logout endpoint"""
    request.session.clear()
    return {"success": True, "message": "Logged out successfully"}

@app.get("/api/auth/verify")
async def verify_session(request: Request):
    """Verify if user is authenticated"""
    user = get_current_user(request)
    if user:
        return {
            "authenticated": True,
            "user": {
                "username": user["username"],
                "role": user["role"]
            }
        }
    else:
        return {"authenticated": False}

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
        
        messages = [Message(role=row[0], content=row[1], timestamp=row[2]) 
                   for row in cursor.fetchall()]
        
        conn.close()
        return list(reversed(messages))  # Return in chronological order
    
    def clear_session(self, session_id: str):
        """Clear all messages for a session"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM embeddings WHERE session_id = ?", (session_id,))
        
        conn.commit()
        conn.close()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Total requests
        cursor.execute("SELECT COUNT(*) FROM conversations")
        total_requests = cursor.fetchone()[0]
        
        # Success rate (assuming all saved conversations are successful)
        success_rate = 100.0
        
        # Average processing time
        cursor.execute("SELECT AVG(processing_time) FROM conversations WHERE processing_time > 0")
        avg_time = cursor.fetchone()[0] or 0.0
        
        conn.close()
        
        return {
            "total_requests": total_requests,
            "success_rate": success_rate,
            "average_processing_time": round(avg_time, 2)
        }

class MemoryManager:
    """Manages conversation memory and context"""
    
    def __init__(self, db: DatabaseManager):
        self.db = db
        self.context_window = 10  # Number of messages to keep in context
    
    def add_message(self, session_id: str, role: str, content: str):
        """Add message to memory"""
        self.db.save_message(session_id, role, content)
    
    def get_context(self, session_id: str) -> str:
        """Get conversation context for a session"""
        messages = self.db.get_session_messages(session_id, self.context_window)
        
        if not messages:
            return ""
        
        context_parts = []
        for msg in messages:
            context_parts.append(f"{msg.role.upper()}: {msg.content}")
        
        return "\n\n".join(context_parts)
    
    def clear_session(self, session_id: str):
        """Clear session memory"""
        self.db.clear_session(session_id)

# ============================================================================
# CORE LLMUI CLASS
# ============================================================================

class LLMUICore:
    """Core LLMUI functionality"""
    
    def __init__(self):
        self.ollama_base = OLLAMA_API_BASE
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(600.0, connect=10.0))
        self.db = DatabaseManager()
        self.memory = MemoryManager(self.db)
    
    async def get_models(self) -> List[Model]:
        """Get available Ollama models with size information"""
        try:
            response = await self.client.get(f"{self.ollama_base}/api/tags")
            response.raise_for_status()
            data = response.json()
            
            models = []
            for model_data in data.get("models", []):
                models.append(Model(
                    name=model_data.get("name", ""),
                    size=model_data.get("size", 0),
                    modified_at=model_data.get("modified_at"),
                    digest=model_data.get("digest"),
                    details=model_data.get("details")
                ))
            
            return sorted(models, key=lambda m: m.name.lower())
            
        except Exception as e:
            print(f"Error fetching models: {e}")
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
            
            print(f"🔄 Génération simple avec {model} (timeout: {timeout_seconds}s, langue: {language})")
            
            # Make request to Ollama
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
            error_msg = f"⏱️ Timeout dépassé ({timeout_level.value}) pour le modèle {model}"
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
            
            print(f"🔄 Génération consensus avec {len(worker_models)} workers (timeout: {timeout_seconds}s, langue: {language})")
            
            # Phase 1: Worker responses
            worker_responses = []
            for worker in worker_models:
                try:
                    response = await self.client.post(
                        f"{self.ollama_base}/api/generate",
                        json={
                            "model": worker,
                            "prompt": enriched_prompt,
                            "stream": False
                        },
                        timeout=timeout_seconds / len(worker_models)
                    )
                    response.raise_for_status()
                    result = response.json()
                    worker_responses.append({
                        "model": worker,
                        "response": result["response"]
                    })
                    print(f"  ✓ {worker} terminé")
                except Exception as e:
                    print(f"  ✗ {worker} échoué: {e}")
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
            
            merger_prompt += f"\nProvide a synthesized response that combines the best insights from all models. RESPOND IN {language.upper()}."
            
            response = await self.client.post(
                f"{self.ollama_base}/api/generate",
                json={
                    "model": merger_model,
                    "prompt": merger_prompt,
                    "stream": False
                },
                timeout=timeout_seconds / 2
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
                "worker_responses": worker_responses,
                "merger_model": merger_model,
                "processing_time": processing_time
            }
            
        except Exception as e:
            error_msg = f"Erreur lors du consensus: {str(e)}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "response": ""
            }

# Initialize core
core = LLMUICore()

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint (PUBLIC - no auth)"""
    return {"status": "healthy", "version": "0.5.0"}

@app.get("/api/models")
async def get_models(request: Request, user: Dict = Depends(require_auth)):
    """List available Ollama models with size info (PROTÉGÉ)"""
    try:
        models = await core.get_models()
        
        # FIX: Retourner les objets complets avec name et size
        models_data = [
            {
                "name": m.name,
                "size": m.size,
                "modified_at": m.modified_at,
                "digest": m.digest
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
        if req.session_id:
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
    try:
        user = get_current_user(request)
        user_info = user['username'] if user else 'anonymous'
    except (AssertionError, Exception):
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
# SERVICE MODE - FOR SYSTEMD
# ============================================================================

def run_service():
    """Run the backend service for systemd"""
    print("🚀 Starting LLMUI Backend Service v0.5.0...")
    
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=5000,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("🛑 Service stopped by user")
    except Exception as e:
        print(f"❌ Service error: {e}")
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
    ╔═══════════════════════════════════════════╗
    ║   LLMUI Core Backend v0.5.0 - FastAPI     ║
    ║   Author: François Chalut                 ║
    ║   Website: https://llmui.org              ║
    ╚═══════════════════════════════════════════╝
    
    ✅ FastAPI framework (modern & async)
    ✅ Authentication system enabled
    ✅ Configurable timeouts (15min - 12h)
    ✅ SQLite persistence
    ✅ Memory management
    ✅ FIX: /api/models returns full objects
    
    🌐 API Docs: http://localhost:5000/docs
    📊 Stats: http://localhost:5000/api/stats
    ❤️  Health: http://localhost:5000/health
    
    Default credentials:
    - Username: francois / Password: Francois2025!
    - Username: demo / Password: demo123
    """)
        
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=5000,
            log_level="info"
        )
