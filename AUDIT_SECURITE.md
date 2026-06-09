# Rapport d'Audit de Sécurité — LLMUI Core v1.0.0

**Date :** 2026-06-09  
**Auditeur :** Claude Code (Fable 5) — Technologies Nexios TF Inc.  
**Périmètre :** Backend (FastAPI + proxy), Frontend (Vanilla JS/HTML), Scripts d'installation, Infrastructure (nginx, PostgreSQL, requirements)  
**Référentiel :** STANDARDS.md v1.7.0

---

## Résumé exécutif

L'audit révèle **7 vulnérabilités critiques** dont plusieurs rendent le déploiement en production actuellement impossible ou dangereux sans correction préalable. Les problèmes les plus urgents sont : des credentials administrateur hardcodés et affichés en clair, une incohérence de port qui rend l'application injoignable derrière nginx, l'utilisation de SQLite (interdit par les standards), une XSS critique dans le rendu des réponses LLM, et plusieurs packages npm avec CVE activement exploitées.

| Sévérité | Nombre |
|----------|--------|
| 🔴 Critique | 7 |
| 🟠 Élevé | 11 |
| 🟡 Moyen | 10 |
| 🔵 Faible | 5 |
| **Total** | **33** |

---

## 🔴 CRITIQUES — Correction immédiate requise

---

### C-01 · Credentials administrateur hardcodés créés automatiquement en base

**Fichier :** `src/llmui_backend.py:393-402`  
À la première initialisation, le backend crée automatiquement un compte admin (`francois` / `Francois2025!`) avec `is_admin=1`. Ces credentials sont publics (dans le code source du dépôt). Tout déploiement non personnalisé démarre avec un compte admin dont le mot de passe est connu.

**Recommandation :** Supprimer toute création d'utilisateur par défaut. Forcer la création du premier admin via un flux d'amorçage interactif (CLI ou `/zadmin`) imposant un mot de passe fort + enrôlement TOTP.

---

### C-02 · Credentials affichés en clair dans la bannière de démarrage

**Fichier :** `src/llmui_backend.py:1390-1392`  
La bannière interactive imprime `Username: francois / Password: Francois2025!` et `demo / demo123` sur stdout — donc dans les logs systemd/journald et l'historique du terminal.

**Recommandation :** Supprimer entièrement ces lignes. Ne jamais logger de credentials, même fictifs.

---

### C-03 · XSS critique — Réponses LLM injectées en innerHTML sans sanitisation

**Fichier :** `web/ui.js:495,524,561` + `formatContent()` à la ligne 566  
La fonction `formatContent()` effectue des remplacements regex naïfs (markdown → HTML) sans échapper les entités HTML, puis injecte le résultat dans `innerHTML`. Un modèle LLM compromis, un prompt adversarial, ou une réponse malformée peut injecter du JavaScript arbitraire (ex. `<script>`, balises avec `onerror=`, etc.) directement dans la page de l'utilisateur connecté.

```javascript
// DANGEREUX — contenu LLM non fiable injecté brut
messageContent.innerHTML = this.formatContent(data.response);
// formatContent ne fait que des .replace() regex — pas d'escaping HTML
```

**Recommandation :** Intégrer [DOMPurify](https://github.com/cure53/DOMPurify) et l'appeler sur tout contenu avant `innerHTML`. En attendant, utiliser `textContent` pour le texte brut et construire le DOM programmatiquement pour le formatage.

---

### C-04 · Hashage non conforme : bcrypt/PBKDF2 au lieu d'Argon2 + lockout potentiel

**Fichier :** `src/llmui_backend.py:280-335` ; `scripts/install.sh:200,237-239`  
Le backend fait `import bcrypt` (lignes 286-288), mais `requirements.txt` ne contient plus `bcrypt` (remplacé par `argon2-cffi` + `passlib[argon2]`). En production : `ImportError` → bascule silencieuse sur PBKDF2-HMAC-SHA256 (fallback). Les utilisateurs dont le hash a été créé par `install.sh` (qui installe bcrypt) **ne pourront plus se connecter** (lockout total). Violation directe de STANDARDS.md §6.

**Recommandation :** Réécrire les deux fonctions avec `passlib.context.CryptContext(schemes=["argon2"])`. Supprimer le fallback PBKDF2. Prévoir la migration des hash bcrypt existants (re-hash à la prochaine connexion réussie).

---

### C-05 · SQLite utilisé partout — interdit par les standards (PostgreSQL 16+ exigé)

**Fichier :** `src/llmui_backend.py:34,96,360-414,583-771` (classe complète `DatabaseManager`)  
Toute la persistance (utilisateurs, conversations, sessions, embeddings) passe par SQLite. STANDARDS.md, CLAUDE.md et `.env.example` interdisent explicitement SQLite et exigent PostgreSQL 16+ via SQLAlchemy async + Alembic (présents dans requirements mais inutilisés).

**Recommandation :** Migrer vers PostgreSQL + SQLAlchemy async. Le schéma de base existe déjà dans `postInstallScripts/create_database.sql`.

---

### C-06 · Port hardcodé sur 5000 — application injoignable derrière nginx + backend exposé

**Fichier :** `src/llmui_backend.py:1351-1352,1397-1398` (`port=5000`) ; `postInstallScripts/nginx_vhost.conf:58,69,74,84` (`APP_PORT`) ; `.env.example` (`APP_PORT=8004`)  
Le backend ignore `APP_PORT` et écoute en dur sur `0.0.0.0:5000`. Nginx route vers `127.0.0.1:APP_PORT` (8004) → en production, l'app est **injoignable via nginx**. De plus, `host="0.0.0.0"` expose le backend non protégé sur toutes les interfaces réseau, contournant le reverse proxy et le proxy d'authentification.

**Recommandation :**
```python
port = int(os.getenv("APP_PORT", "8004"))
uvicorn.run(app, host="127.0.0.1", port=port)
```

---

### C-07 · `tools/test_login.py` utilise SHA-256 pour vérifier les mots de passe

**Fichier :** `tools/test_login.py:21,43` + accès SQLite direct  
Cet outil vérifie les mots de passe avec `hashlib.sha256(password.encode()).hexdigest()` — un algorithme cassé pour ce cas d'usage. Il ne peut pas vérifier des hashs Argon2/bcrypt. L'outil est utilisé en ligne de commande avec le mot de passe en argument (visible dans `ps aux` et l'historique shell).

**Recommandation :** Réécrire avec `passlib`, utiliser PostgreSQL, et ne jamais passer de mot de passe en argument CLI.

---

## 🟠 ÉLEVÉS — Correction avant mise en production

---

### H-01 · SECRET_KEY de session aléatoire au démarrage — sessions invalidées à chaque restart

**Fichier :** `src/llmui_backend.py:107`  
`SECRET_KEY = os.getenv("SESSION_SECRET_KEY", secrets.token_hex(32))` — si `SESSION_SECRET_KEY` n'est pas défini (absent des 3 variables `.env` documentées), une clé aléatoire est générée à chaque démarrage. En multi-worker, chaque worker a une clé différente.

**Recommandation :** Exiger `SESSION_SECRET_KEY` au démarrage (échec si absent), stockée en base via `/zadmin`.

---

### H-02 · Cookie de session sans attribut `Secure` + SameSite=Lax

**Fichier :** `src/llmui_backend.py:205-212`  
`https_only=False` (cookie transmissible en HTTP clair) et `same_site="lax"` (surface CSRF). En production le trafic est HTTPS (nginx force 443), mais le cookie lui-même n'est pas protégé.

**Recommandation :** `https_only=APP_ENV == "production"` + `same_site="strict"`.

---

### H-03 · CORS avec IP publique hardcodée + credentials=True

**Fichier :** `src/llmui_backend.py:191-202`  
L'IP `167.114.65.203:8443` est en dur dans la liste des origines autorisées avec `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`. Fuite d'infrastructure + configuration trop permissive.

**Recommandation :** Externaliser la liste d'origines en configuration ; restreindre méthodes/headers au nécessaire ; retirer l'IP du code source.

---

### H-04 · Aucun rate limiting sur le login — bruteforce illimité

**Fichier :** `src/llmui_backend.py:428-518`  
Aucun rate limit, lockout, ni délai progressif sur `/api/auth/login`. Les comptes par défaut connus (C-01) rendent le bruteforce trivial.

**Recommandation :** Rate limit par IP + par compte via Redis (déjà dans la stack), avec lockout temporaire après N échecs.

---

### H-05 · TOTP absent pour les admins — violation STANDARDS.md

**Fichier :** `src/llmui_backend.py:428-518` ; `requirements.txt` (pyotp présent mais inutilisé)  
STANDARDS.md §6 impose TOTP pour tous les admins. Le flux de login ne demande aucun second facteur.

**Recommandation :** Intégrer pyotp dans le flux de login pour les comptes `is_admin=True`, avec enrôlement obligatoire.

---

### H-06 · Messages d'erreur avec `str(e)` renvoyés au client

**Fichier :** `src/llmui_backend.py:510,1072,1110,1138,1190,1199` ; `src/llmui_proxy.py:355-375`  
Les handlers d'exceptions renvoient `str(e)` dans les réponses HTTP, exposant potentiellement des chemins de fichiers, la structure de la base et l'état interne.

**Recommandation :** Messages génériques au client (`"Erreur interne, veuillez réessayer"`) avec identifiant de corrélation ; détails en log serveur uniquement.

---

### H-07 · Énumération d'utilisateurs par timing différentiel

**Fichier :** `src/llmui_backend.py:448-501`  
Quand l'utilisateur n'existe pas, `verify_password_secure` n'est pas appelé → réponse plus rapide que pour un mauvais mot de passe → l'attaquant peut distinguer les comptes valides par mesure du temps de réponse.

**Recommandation :** Exécuter un calcul de hash factice (dummy verify) quand l'utilisateur n'existe pas pour uniformiser le temps de réponse.

---

### H-08 · `/api/stats` accessible sans authentification

**Fichier :** `src/llmui_backend.py:1144-1182`  
L'endpoint divulgue le nombre total de conversations, le taux de succès et le nombre de modèles Ollama installés sans authentification.

**Recommandation :** Ajouter `user: Dict = Depends(require_auth)`.

---

### H-09 · 38 `console.log` en production dans `app.js` (STANDARDS violation)

**Fichier :** `web/app.js` (38 occurrences) ; `web/session-guard.js:140` (1 occurrence)  
STANDARDS.md interdit explicitement `console.log` en production. Ces logs exposent l'état interne, les requêtes réseau et les données de session dans la console du navigateur.

**Recommandation :** Remplacer par un logger conditionnel (`if (APP_ENV !== 'production') console.log(...)`) ou supprimer.

---

### H-10 · `target="_blank"` sans `rel="noopener noreferrer"` (attribut HTML cassé)

**Fichier :** `web/index.html:117`  
```html
<a href="index.html" target="_blank" styles="rel="noopener noreferrer"
```
L'attribut `styles=` est invalide — `rel="noopener noreferrer"` n'est PAS appliqué. Le lien est vulnérable au tab-napping (la nouvelle page peut accéder à `window.opener`).

**Recommandation :**
```html
<a href="index.html" target="_blank" rel="noopener noreferrer"
```

---

### H-11 · Packages Python avec CVE connues

**Fichier :** `requirements.txt`

| Package | Version actuelle | CVE | Gravité | Version corrigée |
|---------|-----------------|-----|---------|-----------------|
| `python-multipart` | 0.0.6 | CVE-2024-24762 (ReDoS) | Élevé | ≥ 0.0.7 |
| `aiohttp` | 3.9.1 | CVE-2024-23334 (path traversal) | Élevé | ≥ 3.9.2 |
| `cryptography` | 41.0.7 | CVE-2023-50782 + autres | Élevé | ≥ 42.0.4 |
| `starlette` | 0.27.0 | Multiples | Moyen | ≥ 0.36.3 |
| `torch` | `<2.2.0` | CVE-2024-31580 (RCE) | Critique | ≥ 2.2.0 |
| `transformers` | 4.36.0 | CVE-2024-3568 | Élevé | ≥ 4.38.0 |
| `PyPDF2` | 3.0.1 | Déprécié | N/A | Remplacer par `pypdf` |

**Recommandation :** `pip install --upgrade python-multipart aiohttp cryptography starlette torch transformers` + remplacer `PyPDF2` par `pypdf`.

---

## 🟡 MOYENS — Planifier sous 30 jours

---

### M-01 · SSRF — Noms de modèles Ollama non validés

**Fichier :** `src/llmui_backend.py:862,952,993,1271`  
Les noms de modèles fournis par le client (`req.model`, `worker_models`, `merger_model`) sont injectés directement dans les requêtes vers Ollama sans validation contre une liste blanche. Un client peut cibler des modèles arbitraires ou provoquer des comportements non désirés sur l'instance Ollama locale.

**Recommandation :** Valider chaque modèle demandé contre la liste retournée par `/api/tags` avant tout appel à `/api/generate`.

---

### M-02 · Injection de prompt — endpoint Andy `/api/support/chat`

**Fichier :** `src/llmui_backend.py:1262-1267`  
Le message utilisateur et l'historique sont insérés directement dans le template `<|user|>...<|end|>`. Un attaquant peut injecter des tokens de rôle (`<|system|>`, `<|assistant|>`, `<|end|>`) pour usurper le prompt système. Le champ `role` de l'historique n'est pas validé.

**Recommandation :** Échapper/supprimer les marqueurs de rôle dans les entrées ; valider `role ∈ {"user", "assistant"}` ; ajouter `max_length` sur `SupportMessage.content`.

---

### M-03 · `SupportMessage.content` sans limite de longueur

**Fichier :** `src/llmui_backend.py:1207-1210`  
`message` est limité à 2000 caractères mais `SupportMessage.content` (historique) n'a aucune borne. Un historique volumineux provoque un prompt géant → consommation CPU/mémoire excessive.

**Recommandation :** `content: str = Field(..., max_length=2000)`.

---

### M-04 · Timeouts jusqu'à 24h — déni de service par épuisement de ressources

**Fichier :** `src/llmui_backend.py:84-88` (86 400 000 ms) ; `src/llmui_proxy.py:57`  
Un utilisateur authentifié peut maintenir des connexions ouvertes pendant 24h. Quelques requêtes simultanées épuisent les workers uvicorn.

**Recommandation :** Plafonner à 4h maximum en mode asynchrone via tâches de fond (Celery/asyncio) plutôt que maintenir la connexion HTTP ouverte.

---

### M-05 · Doublon de contrainte UNIQUE — erreur PostgreSQL à l'exécution

**Fichier :** `postInstallScripts/create_database.sql:75,83,86`  
```sql
email VARCHAR(255) NOT NULL UNIQUE,           -- contrainte inline (ligne 75)
CONSTRAINT idx_users_email UNIQUE (email),    -- contrainte nommée (ligne 83)
CREATE INDEX IF NOT EXISTS idx_users_email    -- index même nom (ligne 86)
```
PostgreSQL lève une erreur : un index `idx_users_email` existe déjà (créé par la contrainte ligne 83). Le script échoue à la ligne 86.

**Recommandation :** Supprimer la contrainte inline ligne 75 OU la CONSTRAINT nommée ligne 83 ; renommer l'index ligne 86 en `idx_users_email_lookup`.

---

### M-06 · CSP avec `style-src 'unsafe-inline'`

**Fichier :** `postInstallScripts/nginx_vhost.conf:33`  
```
style-src 'self' 'unsafe-inline'
```
`unsafe-inline` pour les styles permet l'injection de CSS (CSS exfiltration, clickjacking via styles). Les styles inline pourraient être remplacés par un hash ou nonce.

**Recommandation :** Utiliser des hashes CSP pour les styles inline critiques et supprimer `'unsafe-inline'` progressivement.

---

### M-07 · `curl | sh` pour installer Ollama — risque supply chain

**Fichier :** `scripts/install_interactive.sh:~ligne Ollama install`  
```bash
curl -fsSL https://ollama.com/install.sh | sh
```
Le script d'installation officiel d'Ollama est exécuté sans vérification de hash/signature. Un MITM ou une compromission du domaine permettrait l'exécution de code arbitraire en root.

**Recommandation :** Vérifier le hash SHA-256 du script, ou utiliser le paquet Ollama officiel signé (.deb/.rpm).

---

### M-08 · Connexions SQLite sans `try/finally` — fuite de handles

**Fichier :** `src/llmui_backend.py:438,469` + `DatabaseManager` (multiple)  
Les connexions sont ouvertes et fermées manuellement sans context manager. Toute exception entre `connect()` et `close()` laisse le handle ouvert.

**Recommandation :** Problème éliminé lors de la migration vers PostgreSQL/SQLAlchemy (M préalable à C-05).

---

### M-09 · IP publique hardcodée dans le proxy

**Fichier :** `src/llmui_proxy.py:144,532,534`  
`167.114.65.203` est en dur dans les redirections et bannières. Couplage fort à l'infrastructure ; fuite d'information.

**Recommandation :** Construire l'URL de redirection à partir de l'en-tête `Host` de la requête (avec validation de liste blanche).

---

### M-10 · Répertoire `/tmp` pour les fichiers générés (permissions partagées)

**Fichier :** `src/llmui_proxy.py:53-54`  
```python
GENERATED_FILES_DIR = "/tmp/llmui_generated_files"
```
Les artefacts LLM sont écrits dans `/tmp` accessible à tous les utilisateurs locaux.

**Recommandation :** Utiliser `/var/lib/llmui/generated` avec permissions `0700` sous le compte de service.

---

## 🔵 FAIBLES — Bonne pratique, planifier

---

### F-01 · `@app.on_event("startup")` déprécié + double initialisation DB

**Fichier :** `src/llmui_backend.py:421`  
Utiliser le gestionnaire de lifespan moderne de FastAPI. Les deux fonctions `init_database()` et `DatabaseManager.init_database()` créent toutes deux la table `users` de façon divergente.

---

### F-02 · `@validator` Pydantic v1 déprécié (utilisé avec Pydantic v2)

**Fichier :** `src/llmui_backend.py:48,239`  
Migrer vers `@field_validator` de Pydantic v2.

---

### F-03 · Stack trace `traceback.print_exc()` dans les logs serveur

**Fichier :** `src/llmui_backend.py:412-413`  
Logger via `logging.error(..., exc_info=True)` plutôt que `traceback.print_exc()` brut.

---

### F-04 · `config_loader.py` référence un chemin SQLite

**Fichier :** `src/config_loader.py:111` (`path: str = "/var/lib/llmui/llmui.db"`)  
Cohérence à maintenir lors de la migration PostgreSQL.

---

### F-05 · `PyPDF2` déprécié — remplacer par `pypdf`

**Fichier :** `requirements.txt:56`  
`PyPDF2` n'est plus maintenu depuis 2023. Son successeur officiel est `pypdf`.

---

## Récapitulatif — Actions prioritaires

```
SEMAINE 1 (bloquant prod) :
  ✦ C-06 : Corriger le port (5000 → APP_PORT, 0.0.0.0 → 127.0.0.1)
  ✦ C-01/C-02 : Supprimer les credentials par défaut et la bannière
  ✦ C-03 : XSS — intégrer DOMPurify dans ui.js
  ✦ H-10 : Corriger l'attribut HTML cassé (styles= → rel=)
  ✦ H-11 : Mettre à jour python-multipart, aiohttp, cryptography

SEMAINE 2 :
  ✦ C-04 : Migrer vers Argon2 (passlib) + migration hash existants
  ✦ H-01 : SESSION_SECRET_KEY obligatoire
  ✦ H-02 : https_only=True en production
  ✦ H-04 : Rate limiting login (Redis)
  ✦ H-08 : Protéger /api/stats

MOIS 1 :
  ✦ C-05 : Migration SQLite → PostgreSQL (bloquant STANDARDS)
  ✦ H-05 : Intégrer TOTP pour les admins
  ✦ M-05 : Corriger le doublon UNIQUE dans create_database.sql
  ✦ H-09 : Supprimer les 38+ console.log en production
  ✦ H-11 : Mettre à jour torch, transformers
```

---

*Rapport généré par Claude Code — Technologies Nexios TF Inc. — nexiostf.com*  
*LLMUI Core v1.0.0 — Confidentiel*
