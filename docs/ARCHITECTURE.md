# Architecture Technique - LLMUI Core v0.5

**Francois Chalut**

---

## 🎯 Vue d'ensemble

LLMUI Core est une plateforme de consensus multi-modèles basée sur une architecture microservices avec orchestration de LLM locaux via Ollama.

### Principe fondamental

Au lieu d'utiliser un seul modèle LLM, LLMUI Core utilise **plusieurs modèles en parallèle** (workers) qui analysent le prompt, puis un **modèle merger** qui synthétise leurs réponses pour obtenir un consensus de qualité supérieure.

```
Prompt → Workers (phi3, gemma2) → Analyses → Merger (granite4) → Consensus → Réponse
```

---

## 🏗️ Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                         UTILISATEUR                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX (Port 80/443)                           │
│  • Reverse proxy                                                 │
│  • SSL/TLS termination                                           │
│  • Serveur de fichiers statiques (web/)                         │
│  • Headers de sécurité                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LLMUI PROXY (Port 8080)                         │
│  • Authentification JWT                                          │
│  • Gestion des sessions                                          │
│  • Rate limiting                                                 │
│  • Validation des requêtes                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 LLMUI BACKEND (Port 5000)                        │
│  • API REST FastAPI                                              │
│  • Orchestration LLM                                             │
│  • Système de consensus                                          │
│  • Gestion mémoire (court/long terme, RAG)                      │
│  • Traitement de fichiers                                        │
│  • Base de données SQLite                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OLLAMA (Port 11434)                            │
│  • Serveur LLM local                                             │
│  • Workers: phi3:3.8b, gemma2:2b                                │
│  • Merger: granite4:micro-h                                     │
│  • Gestion GPU/CPU                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Composants détaillés

### 1. Frontend (web/)

**Technologie**: HTML5, CSS3, JavaScript vanilla

**Structure**:
```
web/
├── index.html              # Page principale (chat)
├── login.html             # Authentification
├── installer.html         # Interface installation (optionnel)
├── *.css                  # Styles modulaires
└── *.js                   # Modules JavaScript
```

**Modules JavaScript**:
- `app.js` - Application principale
- `auth.js` - Gestion authentification
- `ui.js` - Interface utilisateur
- `utils.js` - Utilitaires
- `message_editor.js` - Édition messages
- `dialog-system.js` - Dialogues modaux
- `session-guard.js` - Protection session
- `i18n.js` - Internationalisation
- `fallback.js` - Gestion erreurs

**Fonctionnalités**:
- Chat en temps réel
- Upload de fichiers (drag & drop)
- Édition de messages
- Historique conversations
- Mode sombre/clair
- Responsive (mobile/desktop)

### 2. Proxy (llmui_proxy.py)

**Technologie**: Python 3.8+, aiohttp

**Rôle**: Couche de sécurité et gestion des sessions

**Fonctionnalités**:
```python
# Authentification
- Génération JWT tokens
- Validation tokens
- Refresh tokens
- Logout/session cleanup

# Sécurité
- Rate limiting (SlowAPI)
- Validation inputs
- Protection CSRF
- Headers de sécurité

# Sessions
- Stockage session (SQLite)
- Timeout automatique
- Multi-sessions par utilisateur
```

**Endpoints**:
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/verify` - Vérification token

**Base de données**:
```sql
sessions
├── session_id (PK)
├── user_id
├── token
├── created_at
├── expires_at
└── last_activity
```

### 3. Backend (llmui_backend.py)

**Technologie**: FastAPI, Uvicorn, aiosqlite

**Architecture interne**:
```python
llmui_backend.py
├── FastAPI app
├── Ollama client
├── ConsensusEngine
├── MemoryManager
├── FileProcessor
├── DatabaseManager
└── CachingSystem
```

#### 3.1 API REST

**Endpoints principaux**:

```python
# Health & Info
GET  /api/health          # Statut système
GET  /api/models          # Liste modèles Ollama
GET  /api/stats           # Statistiques utilisation

# Chat
POST /api/chat            # Nouvelle conversation
GET  /api/conversations   # Historique
GET  /api/conversation/{id} # Détails conversation
DELETE /api/conversation/{id} # Supprimer

# Fichiers
POST /api/upload          # Upload fichier
POST /api/process_file    # Traiter fichier
GET  /api/files           # Liste fichiers

# Utilisateurs
GET  /api/user/profile    # Profil utilisateur
PUT  /api/user/profile    # Mise à jour profil
GET  /api/user/settings   # Paramètres

# Configuration
GET  /api/config          # Configuration système
PUT  /api/config          # Mise à jour config
```

#### 3.2 Système de consensus

**Algorithme**:

```python
def consensus_chat(prompt: str) -> str:
    # 1. Phase Workers - Analyse parallèle
    worker_responses = []
    for model in ['phi3:3.8b', 'gemma2:2b']:
        response = ollama.generate(
            model=model,
            prompt=f"Analysez: {prompt}"
        )
        worker_responses.append(response)
    
    # 2. Phase Merger - Synthèse
    merger_prompt = f"""
    Voici différentes analyses d'un prompt:
    
    Analyse 1 (phi3): {worker_responses[0]}
    Analyse 2 (gemma2): {worker_responses[1]}
    
    Synthétisez la meilleure réponse en tenant compte de toutes les analyses.
    """
    
    consensus = ollama.generate(
        model='granite4:micro-h',
        prompt=merger_prompt
    )
    
    return consensus
```

**Stratégies de consensus**:
- `majority` - Vote majoritaire simple
- `weighted` - Vote pondéré par confiance
- `merger` - Synthèse par modèle dédié (défaut)
- `best_of` - Meilleure réponse selon scoring

#### 3.3 Système de mémoire

**Types de mémoire**:

```python
class MemoryManager:
    def __init__(self):
        self.short_term = {}      # Contexte conversation
        self.long_term = SQLite   # Historique persistant
        self.rag = VectorDB       # Base vectorielle
        self.cache = LRUCache     # Cache réponses
```

**Mémoire court terme**:
```python
{
    "conversation_id": "conv_123",
    "messages": [
        {"role": "user", "content": "..."},
        {"role": "assistant", "content": "..."}
    ],
    "context": {
        "user_preferences": {...},
        "conversation_metadata": {...}
    }
}
```

**Mémoire long terme (SQLite)**:
```sql
conversations
├── id (PK)
├── user_id (FK)
├── title
├── created_at
├── updated_at
└── metadata (JSON)

messages
├── id (PK)
├── conversation_id (FK)
├── role (user/assistant/system)
├── content (TEXT)
├── tokens_used
└── created_at

embeddings (RAG)
├── id (PK)
├── content_id
├── embedding (BLOB)
└── metadata (JSON)
```

**RAG (Retrieval-Augmented Generation)**:
```python
# 1. Indexation documents
def index_document(doc: str):
    chunks = split_into_chunks(doc)
    for chunk in chunks:
        embedding = generate_embedding(chunk)
        store_embedding(chunk, embedding)

# 2. Recherche sémantique
def semantic_search(query: str, top_k=5):
    query_embedding = generate_embedding(query)
    similar_chunks = find_similar(query_embedding, top_k)
    return similar_chunks

# 3. Augmentation du prompt
def augmented_prompt(user_query: str):
    relevant_context = semantic_search(user_query)
    return f"""
    Contexte pertinent:
    {relevant_context}
    
    Question: {user_query}
    """
```

#### 3.4 Traitement de fichiers

**Formats supportés**:
- **Documents**: PDF, DOCX, TXT, MD, RTF
- **Images**: PNG, JPG, JPEG, WEBP, GIF
- **Données**: CSV, JSON, YAML, XML
- **Code**: Python, JavaScript, etc.

**Pipeline de traitement**:
```python
def process_file(file: UploadFile):
    # 1. Validation
    validate_file_type(file)
    validate_file_size(file)
    
    # 2. Extraction contenu
    if file.type == 'pdf':
        content = extract_pdf(file)
    elif file.type == 'docx':
        content = extract_docx(file)
    elif file.type == 'image':
        content = ocr_image(file)
    
    # 3. Indexation (optionnel)
    if should_index(file):
        index_document(content)
    
    # 4. Analyse
    summary = llm_summarize(content)
    
    return {
        "content": content,
        "summary": summary,
        "metadata": extract_metadata(file)
    }
```

#### 3.5 Cache système

**Stratégie de cache**:
```python
class CachingSystem:
    def __init__(self):
        self.response_cache = LRUCache(maxsize=1000)
        self.embedding_cache = LRUCache(maxsize=5000)
        
    def cache_key(self, prompt: str, params: dict) -> str:
        return hashlib.sha256(
            f"{prompt}:{json.dumps(params)}"
        ).hexdigest()
    
    def get_cached_response(self, prompt: str, params: dict):
        key = self.cache_key(prompt, params)
        return self.response_cache.get(key)
    
    def cache_response(self, prompt: str, params: dict, response: str):
        key = self.cache_key(prompt, params)
        self.response_cache[key] = response
```

### 4. Ollama

**Configuration**:
```yaml
ollama:
  base_url: "http://localhost:11434"
  timeout: 300
  
  models:
    workers:
      - name: "phi3:3.8b"
        role: "worker"
        temperature: 0.7
        
      - name: "gemma2:2b"
        role: "worker"
        temperature: 0.8
        
    merger:
      name: "granite4:micro-h"
      role: "merger"
      temperature: 0.5
```

**Gestion des modèles**:
```python
class OllamaManager:
    def list_models(self):
        """Liste modèles disponibles"""
        
    def pull_model(self, model: str):
        """Télécharge un modèle"""
        
    def remove_model(self, model: str):
        """Supprime un modèle"""
        
    def model_info(self, model: str):
        """Infos sur un modèle"""
```

---

## 🔄 Flux de données détaillés

### Flux 1: Conversation simple

```
1. User envoie message
   ↓
2. Frontend → POST /api/chat
   ↓
3. Nginx → route vers Proxy:8080
   ↓
4. Proxy vérifie JWT token
   ↓
5. Proxy → forward vers Backend:5000
   ↓
6. Backend récupère contexte (mémoire)
   ↓
7. Backend → Ollama workers (parallèle)
   ├─→ phi3:3.8b analyse
   └─→ gemma2:2b analyse
   ↓
8. Backend reçoit analyses workers
   ↓
9. Backend → Ollama merger (granite4)
   ↓
10. Backend reçoit consensus
    ↓
11. Backend stocke dans DB
    ↓
12. Backend → retourne réponse
    ↓
13. Proxy → forward réponse
    ↓
14. Nginx → retourne au Frontend
    ↓
15. Frontend affiche réponse
```

### Flux 2: Upload et analyse de fichier

```
1. User upload fichier
   ↓
2. Frontend → POST /api/upload (multipart)
   ↓
3. Nginx → Proxy → Backend
   ↓
4. Backend valide fichier
   ↓
5. Backend extrait contenu
   ├─→ PDF: PyPDF2
   ├─→ DOCX: python-docx
   ├─→ Image: OCR (tesseract)
   └─→ Texte: direct
   ↓
6. Backend indexe (RAG optionnel)
   ↓
7. Backend → Ollama pour résumé
   ↓
8. Backend stocke métadonnées
   ↓
9. Backend retourne résumé + ID
   ↓
10. User peut poser questions sur fichier
```

### Flux 3: WebSocket (streaming)

```
1. Frontend ouvre WebSocket
   ↓
2. ws://localhost/ws/chat
   ↓
3. Nginx upgrade to WebSocket
   ↓
4. Backend accepte connexion
   ↓
5. User envoie message
   ↓
6. Backend → Ollama (streaming mode)
   ↓
7. Backend reçoit tokens progressifs
   ↓
8. Backend → envoie chaque token via WS
   ↓
9. Frontend affiche en temps réel
   ↓
10. Fin de génération → fermeture ou maintien
```

---

## 🗄️ Schéma de base de données

### Tables principales

```sql
-- Utilisateurs
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    preferences JSON
);

-- Conversations
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Messages
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_used INTEGER,
    model_used TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Sessions
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Fichiers uploadés
CREATE TABLE uploaded_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    storage_path TEXT,
    summary TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Cache réponses
CREATE TABLE response_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_hash TEXT UNIQUE NOT NULL,
    prompt TEXT,
    response TEXT,
    model_used TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hits INTEGER DEFAULT 0
);

-- Embeddings pour RAG
CREATE TABLE embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id TEXT,
    content TEXT,
    embedding BLOB,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔐 Sécurité

### Couches de sécurité

1. **Réseau**
   - Pare-feu (UFW/firewalld)
   - Ports fermés sauf 22, 80, 443
   - Fail2ban pour brute-force SSH

2. **Transport**
   - HTTPS/TLS (Let's Encrypt)
   - Headers de sécurité Nginx
   - HSTS activé

3. **Authentification**
   - JWT tokens avec expiration
   - Bcrypt pour passwords (12 rounds)
   - Refresh tokens
   - Session timeout

4. **Application**
   - Validation inputs (Pydantic)
   - Rate limiting (100 req/min)
   - CORS configuré
   - Protection CSRF

5. **Système**
   - Services systemd isolés
   - Permissions strictes (700 data/)
   - Utilisateur dédié (llmui)
   - Pas de root access

### Headers de sécurité Nginx

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

---

## ⚡ Performance

### Optimisations

1. **Cache multi-niveaux**
   - Réponses LLM (1000 entrées)
   - Embeddings (5000 entrées)
   - Sessions (mémoire)

2. **Traitement asynchrone**
   - AsyncIO pour I/O
   - Workers Ollama en parallèle
   - WebSocket pour streaming

3. **Base de données**
   - Index sur colonnes fréquentes
   - Nettoyage automatique vieux messages
   - Vacuum périodique SQLite

4. **Réseau**
   - Compression gzip Nginx
   - CDN pour assets statiques (optionnel)
   - Keep-alive connexions

### Métriques typiques

- Temps réponse API: < 100ms (sans LLM)
- Génération LLM: 2-10 secondes
- Consensus complet: 5-15 secondes
- Mémoire utilisée: 500MB-2GB
- CPU: 2-4 cœurs recommandés

---

## 📊 Monitoring

### Logs

```bash
# Application
/opt/llmui-core/logs/llmui.log

# Services
journalctl -u llmui-backend
journalctl -u llmui-proxy

# Nginx
/var/log/nginx/llmui-access.log
/var/log/nginx/llmui-error.log

# Ollama
journalctl -u ollama
```

### Métriques exposées

```python
GET /api/stats
{
    "requests_total": 1523,
    "requests_per_minute": 12.5,
    "avg_response_time": 3.2,
    "cache_hit_rate": 0.45,
    "active_conversations": 8,
    "models_loaded": ["phi3:3.8b", "gemma2:2b", "granite4:micro-h"]
}
```

---

## 🔧 Configuration

Voir `config.yaml.example` et `docs/CONFIGURATION.md` pour détails.

---


**Francois Chalut**  
*Architecture pour la souveraineté numérique* 🇨🇦
