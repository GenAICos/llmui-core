# 🔧 LLMUI Core — Guide de configuration

> Copyright © Technologies Nexios TF Inc. — nexiostf.com
> Référence : STANDARDS.md §2 (PostgreSQL-first) et §5 (/zadmin)

---

## Principe fondamental — « PostgreSQL first »

LLMUI Core suit le standard Nexios TF : **le fichier `.env` est réduit au strict
minimum de démarrage**, et **toute autre configuration vit dans PostgreSQL**
(table `system_config`), éditable via le panneau **`/zadmin`**.

> ❌ On ne configure **jamais** l'application en éditant le code source ou un
> fichier `config.yaml`. Ces mécanismes ont été retirés (STANDARDS.md §15).

| Niveau | Où | Quoi |
|--------|----|------|
| Démarrage | `.env` | 3 variables uniquement |
| Exécution | `system_config` (via `/zadmin`) | secrets, sécurité, Andy, général… |
| Avancé | constantes dans `src/` | défauts de modèles / timeouts |

---

## 1️⃣ Fichier `.env` (démarrage initial)

Liste **exhaustive et limitative** — ne jamais ajouter d'autres variables
(voir `.env.example`) :

```env
# Connexion PostgreSQL — point de départ uniquement
DATABASE_URL=postgresql+asyncpg://llmui_user:CHANGEME@localhost:5432/llmui_core

# Port de l'application FastAPI (plage 8000-8999, défaut 8004)
APP_PORT=8004

# Environnement (development | production)
APP_ENV=production
```

L'installateur (`scripts/install_interactive.sh`) génère automatiquement le mot
de passe PostgreSQL et écrit ce `.env` dans `/opt/llmui-core/.env`.

---

## 2️⃣ Configuration d'exécution — `/zadmin` → `system_config`

Toutes les valeurs ci-dessous sont stockées en base et éditables dans
`/zadmin`. Les valeurs initiales sont insérées par
`postInstallScripts/create_database.sql`.

| Section | Clé | Défaut | Description |
|---------|-----|--------|-------------|
| `general` | `app_name` | `LLMUI Core` | Nom affiché |
| `general` | `default_lang` | `fr` | Langue par défaut |
| `general` | `timezone` | `America/Montreal` | Fuseau horaire |
| `andy` | `enabled` | `true` | Activer le widget Andy |
| `andy` | `model` | `qwen3.5:0.8b` | Modèle Ollama d'Andy |
| `andy` | `ollama_url` | `http://localhost:11434` | Instance Ollama **locale** |
| `security` | `totp_required_admin` | `true` | TOTP obligatoire pour les admins |
| `security` | `max_login_attempts` | `5` | Blocage après N échecs |
| `security` | `lockout_minutes` | `15` | Durée de blocage |
| `security` | `cors_allowed_origins` | `[]` | Origines CORS autorisées (JSON ; **jamais `*`**) |

### Secrets — générés automatiquement

`session_secret_key` et `totp_encryption_key` (section `security`,
`is_sensitive = TRUE`) sont **générés au premier démarrage** du backend et
chiffrés en base. Ne jamais les éditer à la main.

> 🔐 CORS : laissez `cors_allowed_origins` vide pour n'autoriser que la même
> origine. Ouvrir à `*` est **interdit** (STANDARDS.md §6/§15).

---

## 3️⃣ Réglages avancés (défauts dans le code)

Quelques défauts d'inférence sont définis comme constantes. Ils n'ont
généralement pas besoin d'être modifiés.

### `src/llmui_backend.py`

```python
OLLAMA_API_BASE       = "http://localhost:11434"      # Instance Ollama locale
DEFAULT_WORKER_MODELS = ["granite3.1:2b", "phi3:3.8b", "qwen2.5:3b"]
DEFAULT_MERGER_MODEL  = "mistral:7b"
TIMEOUT_CONFIG        = { ... }   # plafonné à 4 h (M-04)
```

> Modèles **Ollama uniquement** — aucune API LLM externe (STANDARDS.md §7/§15).

### `src/llmui_proxy.py`

```python
HTTP_PORT  = 8000          # Interface web (HTTP)
HTTPS_PORT = 8443          # Interface web (HTTPS, si certificats présents)
APP_PORT   = os.getenv("APP_PORT", "8004")   # Backend interne (127.0.0.1)
```

---

## 4️⃣ TLS / HTTPS

- **Production** : Let's Encrypt + Nginx en reverse proxy (STANDARDS.md §1).
  Voir `postInstallScripts/nginx_vhost.conf` (headers de sécurité inclus).
- **Développement** : certificat auto-signé via `sudo ./scripts/generate_ssl.sh`
  (écrit dans `/opt/llmui-core/ssl/`). Le proxy bascule alors en HTTPS (8443).

---

## ✅ Checklist de déploiement

- [ ] `.env` ne contient que `DATABASE_URL`, `APP_PORT`, `APP_ENV`
- [ ] Base PostgreSQL créée (`postInstallScripts/create_database.sql`)
- [ ] Premier admin créé (`python3 scripts/create_admin.py`)
- [ ] `cors_allowed_origins` renseigné dans `/zadmin` (jamais `*`)
- [ ] TOTP activé pour les comptes admin
- [ ] Nginx + TLS en place (HTTP → HTTPS)
- [ ] `curl http://localhost:$APP_PORT/health` répond `healthy`

---

*Technologies Nexios TF Inc. — nexiostf.com — La Tuque, Québec, Canada*
