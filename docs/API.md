# Documentation API REST - LLMUI Core v0.5.0

**Base URL**: `http://localhost:5000` (ou votre domaine)  
**Version**: 0.5.0
**Authentification**: JWT Bearer Token

---

## 📋 Table des matières

1. [Authentification](#authentification)
2. [Chat & Conversations](#chat--conversations)
3. [Fichiers](#fichiers)
4. [Utilisateurs](#utilisateurs)
5. [Système](#système)
6. [WebSocket](#websocket)
7. [Codes d'erreur](#codes-derreur)

---

## 🔐 Authentification

### Login

Obtenir un JWT token pour accéder à l'API.

**Endpoint**: `POST /api/auth/login`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "username": "admin",
  "password": "votre_mot_de_passe"
}
```

**Réponse** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

**Erreurs**:
- `401 Unauthorized`: Identifiants invalides
- `429 Too Many Requests`: Trop de tentatives

**Exemple cURL**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'
```

### Logout

Invalider le token actuel.

**Endpoint**: `POST /api/auth/logout`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Réponse** (200 OK):
```json
{
  "message": "Déconnexion réussie"
}
```

### Refresh Token

Obtenir un nouveau access_token avec le refresh_token.

**Endpoint**: `POST /api/auth/refresh`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Réponse** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Vérifier Token

Vérifier la validité d'un token.

**Endpoint**: `GET /api/auth/verify`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Réponse** (200 OK):
```json
{
  "valid": true,
  "user_id": 1,
  "expires_at": "2025-11-22T10:30:00Z"
}
```

---

## 💬 Chat & Conversations

### Nouvelle conversation

Envoyer un message et recevoir une réponse par consensus.

**Endpoint**: `POST /api/chat`

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body**:
```json
{
  "message": "Explique-moi l'intelligence artificielle",
  "conversation_id": "conv_123",  // Optionnel, créé si absent
  "user_id": "user_1",
  "options": {
    "consensus_strategy": "merger",  // majority, weighted, merger, best_of
    "temperature": 0.7,
    "max_tokens": 2000,
    "stream": false
  }
}
```

**Réponse** (200 OK):
```json
{
  "conversation_id": "conv_123",
  "message_id": "msg_456",
  "response": "L'intelligence artificielle (IA) est...",
  "metadata": {
    "models_used": ["phi3:3.8b", "gemma2:2b", "granite4:micro-h"],
    "tokens_used": 350,
    "processing_time": 4.2,
    "confidence_score": 0.92
  },
  "timestamp": "2025-11-21T18:30:00Z"
}
```

**Exemple Python**:
```python
import requests

headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

data = {
    "message": "Bonjour! Comment ça va?",
    "user_id": "user_123"
}

response = requests.post(
    "http://localhost:5000/api/chat",
    headers=headers,
    json=data
)

print(response.json()['response'])
```

### Liste des conversations

Obtenir toutes les conversations d'un utilisateur.

**Endpoint**: `GET /api/conversations`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `user_id` (required): ID de l'utilisateur
- `limit` (optional): Nombre max de résultats (défaut: 50)
- `offset` (optional): Pagination (défaut: 0)
- `sort` (optional): `asc` ou `desc` (défaut: desc)

**Réponse** (200 OK):
```json
{
  "conversations": [
    {
      "id": "conv_123",
      "title": "Discussion sur l'IA",
      "created_at": "2025-11-20T10:00:00Z",
      "updated_at": "2025-11-21T15:30:00Z",
      "message_count": 12,
      "last_message": "L'IA peut transformer..."
    },
    {
      "id": "conv_124",
      "title": "Aide programmation Python",
      "created_at": "2025-11-21T09:00:00Z",
      "updated_at": "2025-11-21T18:00:00Z",
      "message_count": 8,
      "last_message": "Voici un exemple de code..."
    }
  ],
  "total": 24,
  "limit": 50,
  "offset": 0
}
```

**Exemple cURL**:
```bash
curl -X GET "http://localhost:5000/api/conversations?user_id=user_123&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Détails d'une conversation

Obtenir tous les messages d'une conversation.

**Endpoint**: `GET /api/conversation/{conversation_id}`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Réponse** (200 OK):
```json
{
  "id": "conv_123",
  "title": "Discussion sur l'IA",
  "created_at": "2025-11-20T10:00:00Z",
  "updated_at": "2025-11-21T15:30:00Z",
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "Qu'est-ce que l'IA?",
      "timestamp": "2025-11-20T10:00:00Z"
    },
    {
      "id": "msg_002",
      "role": "assistant",
      "content": "L'intelligence artificielle...",
      "metadata": {
        "models_used": ["phi3:3.8b", "gemma2:2b"],
        "tokens": 250
      },
      "timestamp": "2025-11-20T10:00:05Z"
    }
  ],
  "metadata": {
    "total_messages": 12,
    "total_tokens": 3500
  }
}
```

### Supprimer une conversation

Supprimer une conversation et tous ses messages.

**Endpoint**: `DELETE /api/conversation/{conversation_id}`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Réponse** (200 OK):
```json
{
  "message": "Conversation supprimée avec succès",
  "conversation_id": "conv_123"
}
```

### Mettre à jour le titre

Modifier le titre d'une conversation.

**Endpoint**: `PUT /api/conversation/{conversation_id}/title`

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body**:
```json
{
  "title": "Nouveau titre"
}
```

**Réponse** (200 OK):
```json
{
  "message": "Titre mis à jour",
  "conversation_id": "conv_123",
  "new_title": "Nouveau titre"
}
```

---

## 📁 Fichiers

### Upload de fichier

Uploader un fichier pour analyse.

**Endpoint**: `POST /api/upload`

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Body** (form-data):
```
file: [binary file]
user_id: "user_123"
extract_text: true          // Optionnel
create_summary: true        // Optionnel
add_to_rag: false          // Optionnel
```

**Réponse** (200 OK):
```json
{
  "file_id": "file_789",
  "filename": "document.pdf",
  "file_type": "application/pdf",
  "file_size": 245678,
  "text_extracted": true,
  "summary": "Ce document traite de...",
  "page_count": 12,
  "metadata": {
    "author": "John Doe",
    "created": "2025-01-15"
  },
  "uploaded_at": "2025-11-21T18:30:00Z"
}
```

**Exemple Python**:
```python
import requests

headers = {"Authorization": "Bearer YOUR_TOKEN"}

files = {'file': open('document.pdf', 'rb')}
data = {
    'user_id': 'user_123',
    'create_summary': 'true'
}

response = requests.post(
    "http://localhost:5000/api/upload",
    headers=headers,
    files=files,
    data=data
)

print(response.json()['summary'])
```

**Exemple cURL**:
```bash
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  -F "user_id=user_123" \
  -F "create_summary=true"
```

### Traiter un fichier

Analyser ou poser une question sur un fichier uploadé.

**Endpoint**: `POST /api/process_file`

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body**:
```json
{
  "file_id": "file_789",
  "action": "question",  // question, summarize, translate, extract
  "query": "Quels sont les points clés de ce document?",
  "options": {
    "language": "fr",
    "max_length": 500
  }
}
```

**Réponse** (200 OK):
```json
{
  "result": "Les points clés sont: 1) ..., 2) ..., 3) ...",
  "processing_time": 3.5,
  "tokens_used": 420
}
```

### Liste des fichiers

Obtenir la liste des fichiers uploadés.

**Endpoint**: `GET /api/files`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `user_id` (required)
- `limit` (optional): 50
- `offset` (optional): 0
- `file_type` (optional): Filtrer par type

**Réponse** (200 OK):
```json
{
  "files": [
    {
      "id": "file_789",
      "filename": "document.pdf",
      "file_type": "application/pdf",
      "file_size": 245678,
      "uploaded_at": "2025-11-21T18:30:00Z",
      "summary": "Ce document traite de..."
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

### Supprimer un fichier

Supprimer un fichier uploadé.

**Endpoint**: `DELETE /api/file/{file_id}`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Réponse** (200 OK):
```json
{
  "message": "Fichier supprimé avec succès",
  "file_id": "file_789"
}
```

---

## 👤 Utilisateurs

### Profil utilisateur

Obtenir le profil de l'utilisateur connecté.

**Endpoint**: `GET /api/user/profile`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Réponse** (200 OK):
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "created_at": "2025-01-01T00:00:00Z",
  "last_login": "2025-11-21T18:00:00Z",
  "preferences": {
    "language": "fr",
    "theme": "dark",
    "notifications": true
  },
  "statistics": {
    "conversations": 24,
    "messages": 352,
    "files_uploaded": 15,
    "tokens_used": 45000
  }
}
```

### Mettre à jour le profil

Modifier les informations du profil.

**Endpoint**: `PUT /api/user/profile`

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body**:
```json
{
  "email": "new_email@example.com",
  "preferences": {
    "language": "en",
    "theme": "light"
  }
}
```

**Réponse** (200 OK):
```json
{
  "message": "Profil mis à jour",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "new_email@example.com"
  }
}
```

### Changer le mot de passe

Modifier le mot de passe.

**Endpoint**: `PUT /api/user/password`

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body**:
```json
{
  "current_password": "old_password",
  "new_password": "new_secure_password"
}
```

**Réponse** (200 OK):
```json
{
  "message": "Mot de passe modifié avec succès"
}
```

---

## ⚙️ Système

### Health Check

Vérifier l'état du système.

**Endpoint**: `GET /api/health`

**Aucune authentification requise**

**Réponse** (200 OK):
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2025-11-21T18:30:00Z",
  "services": {
    "backend": "up",
    "proxy": "up",
    "ollama": "up",
    "database": "up"
  },
  "ollama": {
    "models_loaded": ["phi3:3.8b", "gemma2:2b", "granite4:micro-h"],
    "gpu_available": false
  }
}
```

**Exemple cURL**:
```bash
curl http://localhost:5000/api/health
```

### Liste des modèles

Obtenir la liste des modèles LLM disponibles.

**Endpoint**: `GET /api/models`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Réponse** (200 OK):
```json
{
  "models": [
    {
      "name": "phi3:3.8b",
      "role": "worker",
      "size": "2.3GB",
      "family": "phi3",
      "parameter_count": "3.8B",
      "quantization": "Q4_K_M"
    },
    {
      "name": "gemma2:2b",
      "role": "worker",
      "size": "1.7GB",
      "family": "gemma2",
      "parameter_count": "2B",
      "quantization": "Q4_0"
    },
    {
      "name": "granite4:micro-h",
      "role": "merger",
      "size": "890MB",
      "family": "granite",
      "parameter_count": "1.3B",
      "quantization": "Q4_K_M"
    }
  ]
}
```

### Statistiques

Obtenir les statistiques d'utilisation du système.

**Endpoint**: `GET /api/stats`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Réponse** (200 OK):
```json
{
  "system": {
    "uptime": 864000,
    "cpu_usage": 45.2,
    "memory_usage": 62.8,
    "disk_usage": 34.5
  },
  "api": {
    "requests_total": 15234,
    "requests_per_minute": 12.5,
    "avg_response_time": 3.2,
    "cache_hit_rate": 0.45
  },
  "llm": {
    "generations_total": 1523,
    "avg_generation_time": 4.8,
    "tokens_generated": 245000,
    "consensus_accuracy": 0.92
  },
  "storage": {
    "conversations": 342,
    "messages": 5678,
    "files": 89,
    "database_size": "145MB"
  }
}
```

### Configuration

Obtenir la configuration système (admin seulement).

**Endpoint**: `GET /api/config`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Réponse** (200 OK):
```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 5000,
    "ssl_enabled": true
  },
  "ollama": {
    "base_url": "http://localhost:11434",
    "timeout": 300,
    "models": {...}
  },
  "security": {
    "jwt_expiration": 3600,
    "max_login_attempts": 5,
    "session_timeout": 7200
  },
  "memory": {
    "enabled": true,
    "type": "hybrid",
    "max_tokens": 4096
  }
}
```

---

## 🔌 WebSocket

### Connexion WebSocket

Pour le streaming en temps réel des réponses LLM.

**Endpoint**: `ws://localhost:5000/ws/chat`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Message client → serveur**:
```json
{
  "type": "message",
  "conversation_id": "conv_123",
  "message": "Explique-moi l'IA",
  "options": {
    "stream": true
  }
}
```

**Messages serveur → client**:

**Token progressif**:
```json
{
  "type": "token",
  "conversation_id": "conv_123",
  "token": "L'intelligence",
  "position": 0
}
```

**Fin de génération**:
```json
{
  "type": "done",
  "conversation_id": "conv_123",
  "message_id": "msg_456",
  "full_response": "L'intelligence artificielle...",
  "metadata": {
    "tokens_used": 350,
    "processing_time": 4.2
  }
}
```

**Erreur**:
```json
{
  "type": "error",
  "error": "Internal server error",
  "code": 500
}
```

**Exemple JavaScript**:
```javascript
const ws = new WebSocket('ws://localhost:5000/ws/chat');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'message',
    conversation_id: 'conv_123',
    message: 'Bonjour!',
    options: { stream: true }
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'token') {
    console.log(data.token);  // Afficher progressivement
  } else if (data.type === 'done') {
    console.log('Terminé:', data.full_response);
  }
};
```

---

## ⚠️ Codes d'erreur

### Codes HTTP standards

| Code | Signification | Description |
|------|---------------|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée |
| 400 | Bad Request | Requête invalide |
| 401 | Unauthorized | Authentification requise |
| 403 | Forbidden | Accès refusé |
| 404 | Not Found | Ressource non trouvée |
| 429 | Too Many Requests | Rate limit dépassé |
| 500 | Internal Server Error | Erreur serveur |
| 503 | Service Unavailable | Service temporairement indisponible |

### Format d'erreur

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Le token JWT est invalide ou expiré",
    "details": "Token signature verification failed",
    "timestamp": "2025-11-21T18:30:00Z"
  }
}
```

### Codes d'erreur spécifiques

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Identifiants incorrects |
| `INVALID_TOKEN` | Token JWT invalide |
| `TOKEN_EXPIRED` | Token expiré |
| `RATE_LIMIT_EXCEEDED` | Trop de requêtes |
| `FILE_TOO_LARGE` | Fichier trop volumineux |
| `UNSUPPORTED_FILE_TYPE` | Type de fichier non supporté |
| `CONVERSATION_NOT_FOUND` | Conversation inexistante |
| `OLLAMA_UNAVAILABLE` | Ollama ne répond pas |
| `MODEL_NOT_FOUND` | Modèle LLM non trouvé |
| `INSUFFICIENT_PERMISSIONS` | Permissions insuffisantes |

---

## 📝 Notes importantes

### Rate Limiting

- **Limite**: 100 requêtes par minute par IP
- **Header de réponse**: `X-RateLimit-Remaining`
- **Dépassement**: Code 429 avec délai de retry

### Pagination

Tous les endpoints listant des ressources supportent:
- `limit`: Nombre max de résultats (1-100)
- `offset`: Position de départ
- `sort`: Ordre (`asc` ou `desc`)

### Formats de date

Toutes les dates sont en **ISO 8601** (UTC):
```
2025-11-21T18:30:00Z
```

### Tailles limites

- **Body JSON**: 10MB maximum
- **Upload fichier**: 50MB maximum
- **Message texte**: 50,000 caractères

---

## 🔗 Exemples clients

### Python avec requests

```python
import requests

class LLMUIClient:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.token = token
        
    def login(self, username, password):
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"username": username, "password": password}
        )
        self.token = response.json()['access_token']
        return self.token
    
    def chat(self, message, conversation_id=None):
        headers = {"Authorization": f"Bearer {self.token}"}
        data = {"message": message}
        if conversation_id:
            data['conversation_id'] = conversation_id
            
        response = requests.post(
            f"{self.base_url}/api/chat",
            headers=headers,
            json=data
        )
        return response.json()

# Utilisation
client = LLMUIClient("http://localhost:5000")
client.login("admin", "password")
response = client.chat("Bonjour!")
print(response['response'])
```

### JavaScript/TypeScript

```typescript
class LLMUIClient {
  constructor(baseURL: string, token?: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async login(username: string, password: string) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    this.token = data.access_token;
    return this.token;
  }

  async chat(message: string, conversationId?: string) {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId
      })
    });
    return await response.json();
  }
}

// Utilisation
const client = new LLMUIClient('http://localhost:5000');
await client.login('admin', 'password');
const response = await client.chat('Bonjour!');
console.log(response.response);
```

---

**Francois Chalut**  
*API REST pour la souveraineté numérique* 🇨🇦

**Version**: 0.5.0  
**Dernière mise à jour**: 2025-11-21
