#!/usr/bin/env python3
# -*- coding: utf-8 -*-
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
DEFAULT_WORKER_MODELS = ["granite4-micro-h", "phi3:3.8b", "qwen2.5:3b"]
DEFAULT_MERGER_MODEL = "mistral:7b"
DEFAULT_TIMEOUT_LEVEL = TimeoutLevel.MEDIUM

# ============================================================================
# 🔐 AJOUT AUTHENTIFICATION - CONFIG SESSION
# ============================================================================
SECRET_KEY = os.getenv("SESSION_SECRET_KEY", secrets.token_hex(32))
# ============================================================================

# ============================================================================
# DATABASE INITIALIZATION
# ============================================================================

def init_db():
    """Initialize SQLite database with required tables"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')
    
    # Conversations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    # Messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            model TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
        )
    ''')
    
    # Stats table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model TEXT NOT NULL,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            duration_ms INTEGER DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            success BOOLEAN DEFAULT 1
        )
    ''')
    
    # Sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()
    
    print(f"✅ Database initialized at {DB_PATH}")

# ============================================================================
# MODELS
# ============================================================================

class GenerationMode(str, Enum):
    """Generation mode types"""
    SIMPLE = "simple"
    CONSENSUS = "consensus"

class UserCreate(BaseModel):
    """User creation model"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    """User login model"""
    username: str
    password: str

class ConversationCreate(BaseModel):
    """Conversation creation model"""
    title: str = Field(..., min_length=1, max_length=200)

class MessageCreate(BaseModel):
    """Message creation model"""
    content: str = Field(..., min_length=1)
    role: str = Field(default="user")

class GenerateRequest(BaseModel):
    """Generation request model"""
    prompt: str = Field(..., min_length=1, max_length=50000)
    mode: GenerationMode = Field(default=GenerationMode.SIMPLE)
    worker_models: Optional[List[str]] = None
    merger_model: Optional[str]] = None
    timeout_level: TimeoutLevel = Field(default=DEFAULT_TIMEOUT_LEVEL)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=32000)
    conversation_id: Optional[int] = None
    
    @validator('prompt')
    def validate_prompt(cls, v):
        if not v or not v.strip():
            raise ValueError('Prompt cannot be empty')
        return v.strip()

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="LLMUI Core Backend",
    description="Multi-model consensus generation system",
    version="0.5.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Session middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    max_age=3600 * 24  # 24 hours
)

# ============================================================================
# STARTUP EVENT
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    print("\n" + "="*60)
    print("🚀 LLMUI Core Backend v0.5 - Starting...")
    print("="*60)
    
    # Initialize database
    init_db()
    
    # Check Ollama connectivity
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_API_BASE}/api/tags")
            if response.status_code == 200:
                models = response.json().get('models', [])
                print(f"✅ Ollama connected - {len(models)} models available")
                for model in models:
                    print(f"   • {model['name']}")
            else:
                print(f"⚠️  Ollama connection issue - status code: {response.status_code}")
    except Exception as e:
        print(f"⚠️  Ollama not reachable: {e}")
    
    print("="*60)
    print("✅ Backend ready and listening on http://0.0.0.0:5000")
    print("="*60 + "\n")

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return hash_password(password) == password_hash

async def get_current_user(request: Request) -> Optional[Dict]:
    """Get current user from session"""
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {"id": row["id"], "username": row["username"]}
    return None

async def require_auth(request: Request) -> Dict:
    """Dependency to require authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return user

async def call_ollama_generate(
    model: str,
    prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    timeout_ms: int = 900000
) -> Dict[str, Any]:
    """Call Ollama API to generate text"""
    
    url = f"{OLLAMA_API_BASE}/api/generate"
    
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens
        }
    }
    
    timeout_seconds = timeout_ms / 1000
    
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            
            return {
                'response': result.get('response', ''),
                'model': model,
                'done': result.get('done', False),
                'eval_count': result.get('eval_count', 0),
                'prompt_eval_count': result.get('prompt_eval_count', 0)
            }
            
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Ollama request timed out after {timeout_seconds}s"
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Ollama API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calling Ollama: {str(e)}"
        )

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "0.5.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/models")
async def get_models():
    """Get available Ollama models"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{OLLAMA_API_BASE}/api/tags")
            response.raise_for_status()
            data = response.json()
            
            models = []
            for model in data.get('models', []):
                models.append({
                    'name': model['name'],
                    'size': model.get('size', 0),
                    'modified_at': model.get('modified_at', '')
                })
            
            return {"models": models}
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching models: {str(e)}"
        )

@app.post("/api/auth/register")
async def register(user: UserCreate):
    """Register a new user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if username already exists
        cursor.execute("SELECT id FROM users WHERE username = ?", (user.username,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        
        # Create new user
        password_hash = hash_password(user.password)
        cursor.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (user.username, password_hash)
        )
        conn.commit()
        user_id = cursor.lastrowid
        
        return {"id": user_id, "username": user.username}
        
    finally:
        conn.close()

@app.post("/api/auth/login")
async def login(user: UserLogin, request: Request):
    """Login user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT id, username, password_hash FROM users WHERE username = ?",
            (user.username,)
        )
        row = cursor.fetchone()
        
        if not row or not verify_password(user.password, row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Update last login
        cursor.execute(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
            (row["id"],)
        )
        conn.commit()
        
        # Set session
        request.session["user_id"] = row["id"]
        
        return {"id": row["id"], "username": row["username"]}
        
    finally:
        conn.close()

@app.post("/api/auth/logout")
async def logout(request: Request):
    """Logout user"""
    request.session.clear()
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
async def get_me(user: Dict = Depends(require_auth)):
    """Get current user info"""
    return user

@app.post("/api/generate")
async def generate(
    request: GenerateRequest,
    user: Dict = Depends(require_auth)
):
    """Generate text using Ollama"""
    
    # Get timeout configuration
    timeout_config = TIMEOUT_CONFIG[request.timeout_level]
    timeout_ms = (
        timeout_config["consensus"] if request.mode == GenerationMode.CONSENSUS
        else timeout_config["simple"]
    )
    
    if request.mode == GenerationMode.SIMPLE:
        # Simple generation with single model
        model = request.worker_models[0] if request.worker_models else DEFAULT_WORKER_MODELS[0]
        
        result = await call_ollama_generate(
            model=model,
            prompt=request.prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            timeout_ms=timeout_ms
        )
        
        # Save to conversation if specified
        if request.conversation_id:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Save user message
            cursor.execute(
                "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
                (request.conversation_id, "user", request.prompt)
            )
            
            # Save assistant response
            cursor.execute(
                "INSERT INTO messages (conversation_id, role, content, model) VALUES (?, ?, ?, ?)",
                (request.conversation_id, "assistant", result['response'], model)
            )
            
            # Update conversation timestamp
            cursor.execute(
                "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (request.conversation_id,)
            )
            
            conn.commit()
            conn.close()
        
        # Save stats
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO stats 
               (model, prompt_tokens, completion_tokens, total_tokens, success) 
               VALUES (?, ?, ?, ?, 1)""",
            (
                model,
                result.get('prompt_eval_count', 0),
                result.get('eval_count', 0),
                result.get('prompt_eval_count', 0) + result.get('eval_count', 0)
            )
        )
        conn.commit()
        conn.close()
        
        return {
            "mode": "simple",
            "model": model,
            "response": result['response'],
            "timeout_level": request.timeout_level
        }
    
    else:
        # Consensus mode - multiple models
        worker_models = request.worker_models or DEFAULT_WORKER_MODELS
        merger_model = request.merger_model or DEFAULT_MERGER_MODEL
        
        # Generate with worker models
        worker_responses = []
        for model in worker_models:
            result = await call_ollama_generate(
                model=model,
                prompt=request.prompt,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                timeout_ms=timeout_ms
            )
            worker_responses.append({
                'model': model,
                'response': result['response']
            })
        
        # Merge responses
        merge_prompt = f"""You are a merge AI. Synthesize the following responses into a single, coherent answer.

Original question: {request.prompt}

Responses to merge:
"""
        for i, resp in enumerate(worker_responses, 1):
            merge_prompt += f"\n{i}. From {resp['model']}:\n{resp['response']}\n"
        
        merge_prompt += "\nProvide a single, comprehensive answer that combines the best insights:"
        
        merged_result = await call_ollama_generate(
            model=merger_model,
            prompt=merge_prompt,
            temperature=0.3,  # Lower temperature for merging
            max_tokens=request.max_tokens,
            timeout_ms=timeout_ms
        )
        
        # Save to conversation if specified
        if request.conversation_id:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Save user message
            cursor.execute(
                "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
                (request.conversation_id, "user", request.prompt)
            )
            
            # Save consensus response
            cursor.execute(
                "INSERT INTO messages (conversation_id, role, content, model) VALUES (?, ?, ?, ?)",
                (request.conversation_id, "assistant", merged_result['response'], f"consensus({merger_model})")
            )
            
            # Update conversation timestamp
            cursor.execute(
                "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (request.conversation_id,)
            )
            
            conn.commit()
            conn.close()
        
        return {
            "mode": "consensus",
            "worker_models": [r['model'] for r in worker_responses],
            "merger_model": merger_model,
            "worker_responses": worker_responses,
            "merged_response": merged_result['response'],
            "timeout_level": request.timeout_level
        }

@app.get("/api/conversations")
async def get_conversations(user: Dict = Depends(require_auth)):
    """Get user's conversations"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        """SELECT id, title, created_at, updated_at 
           FROM conversations 
           WHERE user_id = ? 
           ORDER BY updated_at DESC""",
        (user['id'],)
    )
    
    conversations = []
    for row in cursor.fetchall():
        conversations.append({
            'id': row['id'],
            'title': row['title'],
            'created_at': row['created_at'],
            'updated_at': row['updated_at']
        })
    
    conn.close()
    return {"conversations": conversations}

@app.post("/api/conversations")
async def create_conversation(
    conversation: ConversationCreate,
    user: Dict = Depends(require_auth)
):
    """Create a new conversation"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO conversations (user_id, title) VALUES (?, ?)",
        (user['id'], conversation.title)
    )
    conn.commit()
    conversation_id = cursor.lastrowid
    conn.close()
    
    return {
        "id": conversation_id,
        "title": conversation.title,
        "created_at": datetime.now().isoformat()
    }

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: int,
    user: Dict = Depends(require_auth)
):
    """Get conversation details with messages"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify ownership
    cursor.execute(
        "SELECT id, title, created_at FROM conversations WHERE id = ? AND user_id = ?",
        (conversation_id, user['id'])
    )
    conv_row = cursor.fetchone()
    
    if not conv_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Get messages
    cursor.execute(
        """SELECT id, role, content, model, timestamp 
           FROM messages 
           WHERE conversation_id = ? 
           ORDER BY timestamp ASC""",
        (conversation_id,)
    )
    
    messages = []
    for row in cursor.fetchall():
        messages.append({
            'id': row['id'],
            'role': row['role'],
            'content': row['content'],
            'model': row['model'],
            'timestamp': row['timestamp']
        })
    
    conn.close()
    
    return {
        'id': conv_row['id'],
        'title': conv_row['title'],
        'created_at': conv_row['created_at'],
        'messages': messages
    }

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    user: Dict = Depends(require_auth)
):
    """Delete a conversation"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify ownership and delete
    cursor.execute(
        "DELETE FROM conversations WHERE id = ? AND user_id = ?",
        (conversation_id, user['id'])
    )
    
    if cursor.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    conn.commit()
    conn.close()
    
    return {"message": "Conversation deleted successfully"}

@app.get("/api/stats")
async def get_stats(user: Dict = Depends(require_auth)):
    """Get usage statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Total tokens
    cursor.execute("SELECT SUM(total_tokens) as total FROM stats")
    total_tokens = cursor.fetchone()['total'] or 0
    
    # Model usage
    cursor.execute("""
        SELECT model, COUNT(*) as count, SUM(total_tokens) as tokens
        FROM stats
        GROUP BY model
        ORDER BY count DESC
    """)
    
    model_stats = []
    for row in cursor.fetchall():
        model_stats.append({
            'model': row['model'],
            'count': row['count'],
            'tokens': row['tokens']
        })
    
    conn.close()
    
    return {
        'total_tokens': total_tokens,
        'model_stats': model_stats
    }

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5000,
        log_level="info"
    )
