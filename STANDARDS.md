# 📐 STANDARDS.md — Technologies Nexios TF Inc.
> Standards et conventions de développement — obligatoires pour tous les projets
> Copyright © Technologies Nexios TF Inc. — nexiostf.com
> Incorporée le 19 février 2025 — La Tuque, Québec, Canada

---

> ⚠️ **Ce fichier fait autorité.** Tout projet sous l'égide de Technologies Nexios TF Inc.
> doit respecter ces standards sans exception. En cas de doute : demander avant de dévier.

---

## 📋 Table des matières

1. [Infrastructure & Déploiement](#1-infrastructure--déploiement)
2. [Base de données & Configuration](#2-base-de-données--configuration)
3. [Backend](#3-backend)
4. [Frontend](#4-frontend)
5. [Panneau /zadmin](#5-panneau-zadmin)
6. [Sécurité & TOTP](#6-sécurité--totp)
7. [Service de support Andy](#7-service-de-support-andy)
8. [Auto-installateur & postInstallScripts](#8-auto-installateur)
9. [Multilingue](#9-multilingue)
10. [Code & Conventions](#10-code--conventions)
11. [Tests](#11-tests)
12. [Documentation](#12-documentation)
13. [Versioning & Git](#13-versioning--git)
14. [Structure de projet](#14-structure-de-projet)
15. [Ce qui est INTERDIT](#15-ce-qui-est-interdit)

---

## 1. Infrastructure & Déploiement

### Philosophie fondamentale
**Souveraineté numérique totale.** Zéro dépendance cloud externe. Tout tourne on-premise sur l'infrastructure Nexios TF ou chez le client.

### Serveur
- **OS** : Debian 13 (Trixie), Ubuntu 24.04 LTS — rien d'autre
- **Mises à jour** : `unattended-upgrades` activé obligatoirement
- **Process manager** : `systemd` — chaque service = une unit systemd
- **Reverse proxy** : `Nginx` — toujours devant les applications
- **TLS** : Let's Encrypt (`certbot`) — HTTPS obligatoire, HTTP redirige vers HTTPS

### Firewall
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 443/tcp
ufw allow 80/tcp
ufw enable
```

### fail2ban
- Obligatoire sur tous les serveurs exposés
- Configurer pour SSH, Nginx et les endpoints d'auth

### ❌ Ce qui est INTERDIT côté infrastructure
- **Docker / Docker Compose / Podman** — absolument jamais
- Services cloud externes (AWS, GCP, Azure, Vercel, Heroku, etc.)
- Stocker des données clients sur des serveurs tiers
- Exposer des ports PostgreSQL ou Redis sur le réseau

---

## 2. Base de données & Configuration

### PostgreSQL — standard obligatoire
| Contexte | Technologie |
|---|---|
| **Développement** | PostgreSQL 16+ |
| **Production** | PostgreSQL 16+ obligatoire |
| **SQLite** | ❌ Interdit — même en développement |
| **ORM** | SQLAlchemy (async) |
| **Migrations** | Alembic — toujours, sans exception |

### Philosophie de configuration — "PostgreSQL first"
> **Le fichier `.env` doit être réduit au strict minimum absolu.**
> Seules les informations nécessaires au **démarrage initial** de l'application y figurent.
> **Toute autre configuration appartient à PostgreSQL**, gérée via `/zadmin`.

#### Ce qui va dans `.env` (liste exhaustive et limitative)
```env
# Connexion initiale à PostgreSQL — point de départ uniquement
DATABASE_URL=postgresql+asyncpg://app_user:CHANGEME@localhost:5432/app_db

# Port de l'application (si non standard)
APP_PORT=8000

# Environnement (development | production)
APP_ENV=production
```

> Tout le reste (SMTP, clés API, limites, feature flags, langues, TURN, etc.)
> est stocké dans la table `system_config` de PostgreSQL et éditable via `/zadmin`.

### Table `system_config` obligatoire
```sql
CREATE TABLE system_config (
    id           SERIAL PRIMARY KEY,
    section      VARCHAR(100) NOT NULL,
    key          VARCHAR(100) NOT NULL,
    value        TEXT,
    value_type   VARCHAR(20) DEFAULT 'string', -- string | int | bool | json | secret
    label        VARCHAR(200),
    description  TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,        -- Chiffré AES-256 en DB
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_by   INTEGER REFERENCES users(id),
    UNIQUE(section, key)
);
```

### Valeurs sensibles en base
- Les valeurs `is_sensitive = TRUE` sont chiffrées AES-256 avant stockage
- Jamais affichées en clair dans les logs ni dans les réponses API

### Règles PostgreSQL
- Un utilisateur dédié par application (jamais `postgres` directement)
- Permissions minimales : `GRANT` uniquement sur les tables nécessaires
- `pg_hba.conf` : `scram-sha-256`, accès local uniquement
- Backups chiffrés obligatoires :
```bash
pg_dump dbname | gpg -c --cipher-algo AES256 > backup_$(date +%Y%m%d_%H%M).sql.gpg
```

### Conventions de nommage SQL
```sql
-- Tables : snake_case, pluriel
CREATE TABLE user_accounts (...);
-- Colonnes : snake_case
created_at, updated_at, is_active, user_id
-- Index : idx_table_colonne
CREATE INDEX idx_user_accounts_email ON user_accounts(email);
```

### Alembic
- Chaque changement de schéma = une migration Alembic
- Message descriptif obligatoire
- Fichiers de migration versionnés dans Git
- Jamais de `DROP` sans migration de rollback

---

## 3. Backend

### Technologie principale
- **FastAPI** (Python 3.11+) — standard pour toutes les APIs REST
- **Flask** — toléré pour les projets simples sans besoin d'API async
- **Uvicorn** — serveur ASGI
- **Pydantic v2** — validation des données

### Authentification & Sécurité
| Élément | Standard | Interdit |
|---|---|---|
| Hash mots de passe | **Argon2** (`argon2-cffi`) | MD5, SHA-256, bcrypt |
| Tokens | **JWT** access=15min, refresh=7j | Sessions non chiffrées |
| 2FA | **TOTP** (`pyotp`) | SMS 2FA |
| Secrets | PostgreSQL (`system_config`) | Hardcodé / `.env` |

### Structure obligatoire
```
backend/
├── main.py
├── config.py              ← Charge UNIQUEMENT le .env minimal
├── database.py
├── models/
├── schemas/
├── routers/
│   ├── auth.py
│   ├── admin.py           ← Routes /zadmin
│   └── support.py         ← Routes Andy support
├── services/
│   ├── config_service.py  ← Lecture/écriture system_config PostgreSQL
│   ├── totp_service.py
│   └── andy_service.py
├── middleware/
├── alembic/
├── installer/
└── tests/
```

### Rate Limiting
- Obligatoire sur toutes les routes d'auth
- Maximum 5 tentatives / 15 minutes par IP (configurable dans `/zadmin`)

---

## 4. Frontend

### Choix du framework selon la complexité
| Complexité | Technologie |
|---|---|
| Simple | **Vanilla JavaScript** + HTML5 |
| Complexe (SPA) | **React 18+** avec Vite |
| Templates légers | **Flask** + Jinja2 |

### CSS
- **CSS custom uniquement** — variables CSS pour la cohérence
- ❌ Tailwind CSS interdit (même CDN)
- ❌ Bootstrap interdit
- ❌ Tout framework CSS tiers interdit
- Fichier `variables.css` obligatoire dans chaque projet

### Build
- **Vite** pour React — jamais Create React App
- Assets servis par **Nginx**
- ❌ jQuery interdit

---

## 5. Panneau /zadmin

### Principe général
**Chaque projet Nexios TF doit inclure un panneau d'administration complet à `/zadmin`.**
C'est le centre de contrôle unique — configuration, utilisateurs, monitoring, support.

### Accès & première connexion
1. L'auto-installateur crée le compte admin avec le courriel fourni
2. **Première connexion** sur `/zadmin/login` :
   - Seul le **courriel** est demandé
   - Si valide → redirection vers création de mot de passe (min 12 chars, majuscule, chiffre, spécial)
   - Activation **TOTP obligatoire** avant accès au dashboard
3. Connexions suivantes : courriel + mot de passe + TOTP

### Structure des sections /zadmin

#### 🏠 Dashboard principal
- Métriques temps réel : utilisateurs actifs, sessions, erreurs
- État des services (PostgreSQL, Redis, Andy, TOTP)
- Alertes et notifications système
- Graphiques d'utilisation (24h, 7j, 30j)
- Résumé de l'audit log

#### 👥 Utilisateurs
- Liste paginée et filtrable
- Créer / modifier / désactiver / supprimer
- Voir et forcer la déconnexion des sessions actives
- Réinitialiser le mot de passe (lien email)
- Activer / désactiver le TOTP
- Historique de connexions (IP, date, succès/échec)
- Voir les permissions effectives

#### 🔐 Rôles & Groupes
- **Rôles** : CRUD complet avec permissions associées
- **Groupes** : CRUD complet, assignation de rôles multiples
- **Permissions granulaires** : structure `ressource:action`
  ```
  users:read         users:write        users:delete
  config:read        config:write
  admin:access       admin:full
  support:read       support:write
  reports:read       reports:export
  billing:read       billing:write
  ```
- Matrice visuelle permissions × rôles (tableau interactif)
- Héritage : groupe → rôle → utilisateur
- Rôles système non-modifiables : `super_admin`, `admin`, `user`, `guest`

#### ⚙️ Configuration système
> Toutes les valeurs de `system_config` sont éditables ici.

**Section : Général**
- Nom de l'application, logo, favicon, URL publique
- Mode de déploiement (enterprise / saas / education)
- Langue par défaut, timezone

**Section : Sécurité**
- Tentatives de login maximum
- Durée de blocage après échec
- TTL access token / refresh token
- TOTP obligatoire (admins / tous les utilisateurs)
- Durée session inactive avant déconnexion
- IPs whitélistées pour /zadmin

**Section : Base de données**
- Statistiques PostgreSQL
- Planification des backups (fréquence, rétention)
- Lancer un backup manuel / télécharger le dernier backup

**Section : Email / SMTP**
- Hôte, port, SSL/TLS, credentials
- Adresse et nom d'expédition
- Bouton de test de connexion
- Templates d'emails (reset password, invitation, notification)

**Section : Andy (Support IA)**
- Activer / désactiver
- Modèle Ollama (`qwen3.5:0.8b` par défaut) — liste des modèles disponibles sur l'instance Ollama locale
- URL instance Ollama (locale uniquement — jamais une API externe)
- Prompt système personnalisable
- Historique des conversations
- Statistiques d'utilisation

**Section : Multilingue**
- Langues actives (toggle par langue)
- Langue par défaut
- Édition inline des fichiers de traduction
- Import / export JSON

**Section : Maintenance**
- Mode maintenance (toggle + message personnalisable)
- Vider le cache Redis
- Recharger la configuration sans redémarrage
- Logs système en temps réel (WebSocket stream)
- Redémarrer le service (via systemd)

#### 📊 Rapports & Statistiques
- Rapports d'utilisation par période
- Export CSV / JSON

#### 🔍 Audit Log
- Historique complet de toutes les actions admin
- Filtres : utilisateur, action, date, IP
- Export CSV
- Rétention configurable (défaut : 90 jours)
- **Immutable** : jamais modifiable ou supprimable via l'UI

#### 💬 Support Andy
- Voir toutes les conversations en cours
- Intervenir (escalade humaine)
- Statistiques des demandes
- Éditer la base de connaissance

---

## 6. Sécurité & TOTP

### Règles absolues — tolérance zéro
```
❌ JAMAIS stocker un mot de passe en clair
❌ JAMAIS logger un token JWT ou un mot de passe
❌ JAMAIS utiliser SHA-256/MD5 pour hasher des mots de passe
❌ JAMAIS exposer PostgreSQL/Redis sur le réseau
❌ JAMAIS désactiver la vérification SSL
❌ JAMAIS mettre des credentials dans le code source
❌ JAMAIS utiliser SELECT * en production
❌ JAMAIS hardcoder une IP ou un secret
❌ JAMAIS laisser des credentials par défaut
❌ JAMAIS ouvrir CORS à toutes les origines (*)
❌ JAMAIS laisser /zadmin sans TOTP en production
```

### TOTP — standard Nexios TF

#### Architecture
- Serveur TOTP maison basé sur `pyotp` (RFC 6238)
- Secret TOTP unique par utilisateur, chiffré AES-256 en PostgreSQL
- QR code généré server-side uniquement
- 10 codes de récupération à usage unique, chiffrés en DB

#### Niveaux TOTP
| Niveau | Utilisateurs réguliers | Administrateurs |
|---|---|---|
| TOTP | Optionnel (encouragé) | **Obligatoire** |
| Codes de récupération | ✅ 10 codes | ✅ 10 codes |
| Re-validation | Actions sensibles | Toutes les sessions |

#### Flux d'activation
```
1. POST /api/auth/totp/setup
2. Backend génère secret → chiffré en PostgreSQL
3. Retourne QR code (SVG) + clé manuelle
4. Utilisateur scanne avec son app (Aegis, Google Auth, etc.)
5. POST /api/auth/totp/verify → code valide
6. Activation effective + codes de récupération affichés UNE SEULE FOIS
```

#### Flux de connexion
```
1. POST /api/auth/login → courriel + mot de passe
2. Si valide + TOTP actif → token temporaire (TTL: 5 min)
3. POST /api/auth/totp/validate → token temporaire + code TOTP
4. Si valide → access token JWT + refresh token
```

#### Table `user_totp`
```sql
CREATE TABLE user_totp (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
    secret_encrypted TEXT NOT NULL,
    is_active        BOOLEAN DEFAULT FALSE,
    activated_at     TIMESTAMPTZ,
    recovery_codes   JSONB,
    last_used_at     TIMESTAMPTZ,
    UNIQUE(user_id)
);
```

### Headers Nginx obligatoires
```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self';" always;
```

### Checklist avant mise en production
- [ ] `.env` contient uniquement DATABASE_URL, APP_ENV, APP_PORT
- [ ] Tous les secrets dans PostgreSQL (`system_config`)
- [ ] Argon2 pour tous les mots de passe
- [ ] TOTP obligatoire pour tous les admins
- [ ] CORS whitelist configurée
- [ ] Rate limiting actif
- [ ] fail2ban configuré
- [ ] ufw actif
- [ ] HTTPS fonctionnel
- [ ] Headers Nginx en place
- [ ] Ports DB/Redis fermés
- [ ] Backup chiffré configuré et testé
- [ ] Audit log fonctionnel

---

## 7. Service de support Andy

### Principe
Chaque projet Nexios TF intègre un **agent de support Andy** accessible aux utilisateurs. Andy connaît le projet en détail et guide l'utilisateur pas à pas.

### Modèle
- **Runtime LLM** : **Ollama uniquement** — aucune API LLM externe autorisée
- **Modèle Ollama** : `qwen3.5:0.8b` (par défaut — configurable dans `/zadmin`)
- Instance Ollama locale sur LLMUI01 ou dédiée par projet
- ❌ OpenAI API, Anthropic API, Mistral API, Cohere, Hugging Face Inference, etc. — **absolument interdit**

### Architecture
```
Utilisateur → Widget chat frontend
                    ↓
             POST /api/support/chat
                    ↓
             Andy Service (FastAPI)
                    ↓
             Ollama API (qwen3.5:0.8b)
             + Prompt système projet
             + Historique conversation (PostgreSQL)
             + Base de connaissance (PostgreSQL)
```

### Base de connaissance Andy
Andy doit être alimenté avec **toute la connaissance nécessaire** pour guider un utilisateur :
- Chaque fonctionnalité décrite pas à pas
- Chaque écran et ses actions possibles
- FAQ courantes
- Procédures de résolution des problèmes courants
- Procédure d'escalade vers support humain

Stockée dans PostgreSQL (table `andy_knowledge`), éditable dans `/zadmin` → Support Andy, versionnée.

### Table `support_conversations`
```sql
CREATE TABLE support_conversations (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    session_id  UUID NOT NULL,
    started_at  TIMESTAMPTZ DEFAULT NOW(),
    ended_at    TIMESTAMPTZ,
    status      VARCHAR(20) DEFAULT 'active', -- active | resolved | escalated
    messages    JSONB NOT NULL DEFAULT '[]'   -- [{role, content, timestamp}]
);
```

### Comportement Andy
- Répond **uniquement** dans la langue de l'utilisateur
- Étapes **numérotées et précises** — jamais de réponses vagues
- Si Andy ne sait pas → le dit clairement et propose l'escalade humaine
- Jamais de données sensibles dans les réponses

### Widget frontend
- Bouton flottant sur toutes les pages
- Historique conservé en session
- Indicateur "Andy réfléchit..." pendant la génération
- Option "Parler à un humain" visible à tout moment

---

## 8. Auto-installateur

### Principe
**Chaque projet Nexios TF livre un script d'installation autonome** qui configure entièrement un serveur propre Debian/Ubuntu/Zorin sans intervention manuelle après le lancement.

### Fichiers
```
installer/
├── install.sh             ← Script principal bash
├── seed_config.py         ← Peuple system_config initial en PostgreSQL
├── templates/
│   ├── nginx.conf.j2
│   ├── service.j2
│   └── pg_hba.j2
└── README_INSTALL.md
```

### Dossier `postInstallScripts/` — obligatoire dans tous les projets

> **Que l'application soit entièrement locale ou qu'elle utilise des services externes
> (PostgreSQL distant, Nginx centralisé, etc.), chaque projet doit inclure
> un dossier `postInstallScripts/` à la racine du projet.**

Ce dossier contient les scripts prêts à l'emploi pour les opérations post-installation
qui se font **en dehors** du serveur applicatif (ex: sur un serveur Nginx centralisé,
sur un serveur PostgreSQL partagé, ou lors d'une configuration manuelle).

#### Contenu obligatoire

```
postInstallScripts/
├── nginx_vhost.conf          ← Vhost Nginx prêt à copier dans sites-available/
├── create_database.sql       ← Création complète de la DB (user, DB, permissions)
└── README.md                 ← Instructions d'utilisation des deux scripts
```

#### `nginx_vhost.conf` — standard

Le fichier doit être **complet et fonctionnel** — copié tel quel dans
`/etc/nginx/sites-available/nom-projet`, puis lié dans `sites-enabled/`.

```nginx
# postInstallScripts/nginx_vhost.conf
# Copyright © Technologies Nexios TF Inc. — nexiostf.com
# Remplacer : NOM_PROJET, DOMAIN, APP_PORT

server {
    listen 80;
    server_name DOMAIN;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Headers de sécurité obligatoires
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self';" always;

    location / {
        proxy_pass         http://127.0.0.1:APP_PORT;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /static/ {
        alias /opt/NOM_PROJET/app/frontend/dist/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### `create_database.sql` — standard

Le script doit être **idempotent** (peut être relancé sans erreur si la DB existe déjà)
et créer **tout** ce qui est nécessaire : utilisateur, base de données, permissions.

```sql
-- postInstallScripts/create_database.sql
-- Copyright © Technologies Nexios TF Inc. — nexiostf.com
-- Remplacer : NOM_PROJET, DB_USER, DB_PASSWORD, DB_NAME
-- Usage : psql -U postgres -f create_database.sql

-- Création de l'utilisateur applicatif (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'DB_USER') THEN
        CREATE ROLE DB_USER WITH LOGIN PASSWORD 'DB_PASSWORD';
    END IF;
END
$$;

-- Création de la base de données (idempotent)
SELECT 'CREATE DATABASE DB_NAME OWNER DB_USER ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'DB_NAME')\gexec

-- Connexion à la DB pour les permissions
\c DB_NAME

-- Révoquer les permissions publiques par défaut
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Permissions minimales pour l'utilisateur applicatif
GRANT CONNECT ON DATABASE DB_NAME TO DB_USER;
GRANT USAGE ON SCHEMA public TO DB_USER;
GRANT CREATE ON SCHEMA public TO DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO DB_USER;

-- Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Confirmation
\echo '✅ Base de données DB_NAME créée avec succès — utilisateur : DB_USER'
```

#### `postInstallScripts/README.md` — contenu minimum

```markdown
# postInstallScripts — NOM_PROJET

Scripts à exécuter manuellement sur les serveurs d'infrastructure,
**séparément** de l'installateur principal.

## 1. Vhost Nginx

Copier `nginx_vhost.conf` sur le serveur Nginx :

```bash
# Remplacer les variables puis :
cp nginx_vhost.conf /etc/nginx/sites-available/NOM_PROJET
ln -s /etc/nginx/sites-available/NOM_PROJET /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 2. Création de la base de données

Exécuter `create_database.sql` sur le serveur PostgreSQL :

```bash
# Modifier DB_USER, DB_PASSWORD, DB_NAME dans le fichier, puis :
psql -U postgres -f create_database.sql
```

> Ces scripts sont conçus pour être exécutés **une seule fois**
> mais sont idempotents — ils peuvent être relancés sans danger.
```



### Flux complet
```
╔══════════════════════════════════════════════════════╗
║       AUTO-INSTALLATEUR — [NOM DU PROJET]            ║
║       Technologies Nexios TF Inc.                    ║
╚══════════════════════════════════════════════════════╝

[1/12] Vérification des prérequis
[2/12] Questions de configuration (collecte unique)
[3/12] Mise à jour du système d'exploitation
[4/12] Installation des packages
[5/12] Configuration PostgreSQL + création DB
[6/12] Génération des secrets et tokens
[7/12] Initialisation DB (migrations + seed config)
[8/12] Configuration Nginx + TLS (Let's Encrypt)
[9/12] Création et activation service systemd
[10/12] Configuration ufw
[11/12] Configuration fail2ban
[12/12] Validation des services + résumé
```

### Règle fondamentale — détection intelligente des packages
> **Avant d'installer quoi que ce soit, toujours vérifier l'état actuel.**
> L'installateur ne doit jamais écraser aveuglément une installation existante.

```bash
# Fonction universelle de gestion des packages
install_or_update_package() {
    local package="$1"
    local check_cmd="$2"       # Commande pour vérifier si installé (ex: "nginx -v")
    local config_paths="$3"    # Chemins de config à sauvegarder (séparés par :)

    if command -v ${check_cmd} &>/dev/null; then
        log_info "${package} déjà installé — vérification de la version..."

        local current_ver=$(get_installed_version "${package}")
        local latest_ver=$(get_latest_version "${package}")

        if [ "${current_ver}" != "${latest_ver}" ]; then
            log_warning "${package} ${current_ver} → mise à jour vers ${latest_ver}"

            # Sauvegarde des configs AVANT la mise à jour
            backup_configs "${package}" "${config_paths}"

            # Mise à jour
            apt-get install --only-upgrade -y "${package}"

            # Restauration / ajustement des configs
            restore_and_merge_configs "${package}"

            log_success "${package} mis à jour — configs préservées"
        else
            log_success "${package} ${current_ver} — déjà à jour, skip"
        fi
    else
        log_info "${package} non trouvé — installation..."
        apt-get install -y "${package}"
        log_success "${package} installé"
    fi
}

# Sauvegarde des fichiers de config avant mise à jour
backup_configs() {
    local package="$1"
    local paths="$2"
    local backup_dir="/var/backups/nexios-install/${package}_$(date +%Y%m%d_%H%M%S)"

    mkdir -p "${backup_dir}"
    IFS=':' read -ra config_list <<< "${paths}"
    for config_path in "${config_list[@]}"; do
        if [ -e "${config_path}" ]; then
            cp -r "${config_path}" "${backup_dir}/"
            log_info "Config sauvegardée : ${config_path} → ${backup_dir}"
        fi
    done
}
```

### Matrice de vérification par service
| Service | Commande de détection | Configs à sauvegarder |
|---|---|---|
| **Nginx** | `nginx -v` | `/etc/nginx/nginx.conf:/etc/nginx/sites-enabled/` |
| **PostgreSQL** | `pg_isready` | `/etc/postgresql/` |
| **Redis** | `redis-cli ping` | `/etc/redis/redis.conf` |
| **Ollama** | `ollama --version` | `~/.ollama/` — ⚠️ voir règle de port ci-dessous |
| **Python 3.11+** | `python3 --version` | — |
| **certbot** | `certbot --version` | `/etc/letsencrypt/` |
| **fail2ban** | `fail2ban-client --version` | `/etc/fail2ban/jail.local` |
| **ufw** | `ufw --version` | `/etc/ufw/user.rules` |

### Règle — Port application dynamique (APP_PORT)
> Le port de l'application FastAPI doit être dans la plage **8000–8999**.
> Avant d'utiliser le port par défaut, vérifier qu'il est disponible.
> Si occupé, assigner automatiquement le suivant libre dans la plage.

```bash
assign_app_port() {
    local default_port=8004   # Ne pas utiliser 8000 — trop souvent pris
    local port=${default_port}

    while ss -tlnp | grep -q ":${port} "; do
        port=$((port + 1))
        if [[ ${port} -gt 8999 ]]; then
            log_error "Aucun port disponible dans la plage 8000-8999"
            exit 1
        fi
    done

    if [[ ${port} -ne ${default_port} ]]; then
        log_warning "Port ${default_port} déjà utilisé — APP_PORT assigné → ${port}"
    fi

    APP_PORT=${port}
    export APP_PORT
}
```

> ⚠️ Ne jamais utiliser le port 8000 comme valeur par défaut — il est
> fréquemment occupé (Django dev server, autres apps). Démarrer à 8004.

### Règle — Libération du port avant démarrage du service
> Avec `--workers N`, les sous-processus uvicorn peuvent rester en vie
> après un crash du service principal (processus zombies).
> **Toujours libérer APP_PORT avant `systemctl start`.**

```bash
# Dans step_setup_systemd — obligatoire avant chaque (re)démarrage
systemctl stop gitnexiostf 2>/dev/null || true
sleep 1
pkill -f "uvicorn main:app" 2>/dev/null || true
fuser -k "${APP_PORT}/tcp" 2>/dev/null || true
sleep 1
systemctl start gitnexiostf
```

### Règle spéciale — Port Ollama dynamique
> Si Ollama est déjà en cours d'exécution sur le serveur, **ne jamais utiliser le port par défaut (11434) aveuglément.**
> Détecter les ports actifs et assigner le suivant disponible automatiquement.

```bash
assign_ollama_port() {
    local default_port=11434

    # Récupérer tous les ports Ollama déjà utilisés sur le serveur
    local used_ports=($(ss -tlnp | grep 'ollama' | awk '{print $4}' | grep -oE '[0-9]+$' | sort -n))

    if [ ${#used_ports[@]} -eq 0 ]; then
        # Aucune instance Ollama active → port par défaut
        OLLAMA_PORT=${default_port}
        log_info "Ollama : aucune instance active → port ${OLLAMA_PORT}"
    else
        # Trouver le port le plus élevé actuellement utilisé par Ollama
        local highest_port=${used_ports[-1]}
        OLLAMA_PORT=$((highest_port + 1))

        # Vérifier que le port suivant n'est pas déjà pris par autre chose
        while ss -tlnp | grep -q ":${OLLAMA_PORT} "; do
            OLLAMA_PORT=$((OLLAMA_PORT + 1))
        done

        log_warning "Ollama déjà actif sur : ${used_ports[*]}"
        log_info "Ollama : port assigné → ${OLLAMA_PORT}"
    fi

    # Sauvegarder le port dans PostgreSQL (system_config)
    # sera fait par seed_config.py
    export OLLAMA_PORT
}
```

> Le port Ollama assigné est ensuite stocké dans `system_config`
> (`section=andy`, `key=ollama_port`) et configurable dans `/zadmin` → Andy.

### Comportement selon les cas Ollama
```
┌─────────────────────────────────────────────────────────────┐
│  PACKAGE DÉTECTÉ ?                                          │
│                                                             │
│  NON ──────────────────→ Installer                         │
│                                                             │
│  OUI → Version à jour ? ─ OUI ──→ Skip (log "déjà à jour") │
│                │                                            │
│                └─ NON ──→ 1. Sauvegarder configs           │
│                           2. Mettre à jour                  │
│                           3. Restaurer/ajuster configs      │
│                           4. Vérifier le service            │
└─────────────────────────────────────────────────────────────┘
```

### [STEP 1] Vérification des prérequis
```bash
- OS supporté ? (Debian 12 / Ubuntu 24.04 / Zorin OS 18 Core)
- Root ou sudo disponible ?
- Connexion internet disponible ?
- Ports 80 et 443 libres ?
- Python 3.11+ disponible ?
- Espace disque suffisant ? (minimum 2GB)
→ Arrêt immédiat avec message clair si prérequis non satisfait
```

### [STEP 2] Questions interactives (collecte unique — avant tout)
```
═══════════════════════════════════════════════
 CONFIGURATION INITIALE
═══════════════════════════════════════════════

 Courriel de l'administrateur principal :
 > admin@example.com

 Domaine de l'application (ex: monapp.com) :
 > monapp.com

 Répertoire d'installation [/opt/nom-projet] :
 > /opt/nom-projet

═══════════════════════════════════════════════
 Récapitulatif :
   Admin    : admin@example.com
   Domaine  : monapp.com
   Chemin   : /opt/nom-projet

 Confirmer et lancer l'installation ? [o/N] : o
═══════════════════════════════════════════════
```

> ⚠️ **Toutes les questions posées au début — zéro interruption pendant l'installation.**

### [STEP 6] Génération automatique de tous les secrets
```bash
# Générés automatiquement — jamais saisis par l'utilisateur
DB_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 64)
TOTP_MASTER_KEY=$(openssl rand -hex 32)
CONFIG_ENCRYPTION_KEY=$(openssl rand -hex 32)
ADMIN_TEMP_TOKEN=$(openssl rand -base64 16)

# Stockés DIRECTEMENT dans PostgreSQL via seed_config.py
# Le .env ne reçoit que DATABASE_URL, APP_ENV, APP_PORT
```

### [STEP 8] Configuration Nginx + TLS
```bash
# Vérification OBLIGATOIRE avant de lancer certbot
# Let's Encrypt utilise le port 80 (HTTP-01 challenge) — même pour un cert HTTPS
check_port_80_reachable() {
    log_info "Vérification accessibilité port 80 depuis l'extérieur..."
    if ! curl -s --max-time 10 "http://${DOMAIN}/.well-known/acme-challenge/test" &>/dev/null; then
        log_error "Port 80 inaccessible depuis l'extérieur!"
        log_error "─────────────────────────────────────────────────────"
        log_error "  Vérifiez le port forwarding sur votre routeur :"
        log_error "  Port 80 (HTTP) → ${SERVER_IP}"
        log_error "  Port 443 (HTTPS) → ${SERVER_IP}"
        log_error "─────────────────────────────────────────────────────"
        log_error "  Le port 80 peut être refermé APRÈS l'obtention"
        log_error "  du certificat. Il est requis uniquement pour le"
        log_error "  challenge initial de Let's Encrypt (HTTP-01)."
        log_error "─────────────────────────────────────────────────────"
        exit 1
    fi
    log_success "Port 80 accessible — lancement de certbot..."
}

check_port_80_reachable
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${ADMIN_EMAIL}
systemctl enable certbot.timer
```

> ⚠️ **Note importante** : Le port 80 est requis **uniquement** pour l'obtention
> et le renouvellement du certificat. Nginx le gère automatiquement pour les
> redirections HTTP → HTTPS une fois le cert en place.
```ini
[Unit]
Description=[NOM_PROJET] — Technologies Nexios TF Inc.
After=network.target postgresql.service redis.service

[Service]
User=[APP_USER]
WorkingDirectory=[INSTALL_PATH]
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 127.0.0.1 --port [APP_PORT]
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Règle — Fichier .env obligatoire dans backend/
> `pydantic-settings` résout `env_file = ".env"` **en chemin relatif au CWD**.
> Alembic s'exécute depuis `backend/`, donc il cherche `backend/.env`.
> L'installateur doit écrire le `.env` dans **les deux emplacements**.

```bash
# Écriture obligatoire dans app/ ET app/backend/
local env_content
env_content="DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
APP_PORT=${APP_PORT}
APP_ENV=production"

printf '%s\n' "${env_content}" > "${INSTALL_PATH}/app/.env"
printf '%s\n' "${env_content}" > "${INSTALL_PATH}/app/backend/.env"
```

> Cela s'applique à tout projet utilisant pydantic-settings avec Alembic.
> Le `.env` de `backend/` est listé dans `.gitignore` — il n'est jamais
> versionné. Il est recréé à chaque installation.

### Règle — Détection de la copie circulaire (réinstallation)
> Si l'installateur est relancé depuis `INSTALL_PATH` (cas fréquent lors
> d'un dépannage), la commande `cp -r source INSTALL_PATH/app/` essaie
> de copier un répertoire dans lui-même → erreur fatale.
> **Toujours résoudre le chemin source en absolu et détecter ce cas.**

```bash
local script_dir source_dir
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_dir="$(cd "${script_dir}/.." && pwd)"

mkdir -p "${INSTALL_PATH}/app"
if [[ "$(realpath "${source_dir}")" == "$(realpath "${INSTALL_PATH}")" ]]; then
    # Installateur lancé depuis INSTALL_PATH lui-même
    if [[ -f "${INSTALL_PATH}/app/backend/main.py" ]]; then
        log_info "Code source déjà présent dans ${INSTALL_PATH}/app — copie ignorée"
    else
        log_error "Installateur lancé depuis ${INSTALL_PATH} mais code absent"
        log_error "→ Lancez l'installateur depuis le répertoire source cloné"
        return 1
    fi
else
    cp -r "${source_dir}/." "${INSTALL_PATH}/app/" || {
        log_error "Impossible de copier le code source"
        return 1
    }
fi
```

### Gestion des erreurs
```bash
set -euo pipefail

LOG_FILE="/var/log/nexios-install.log"

log_info()    { echo "[$(date '+%H:%M:%S')] [INFO]  $*" | tee -a "${LOG_FILE}"; }
log_success() { echo "[$(date '+%H:%M:%S')] [  OK]  $*" | tee -a "${LOG_FILE}"; }
log_warning() { echo "[$(date '+%H:%M:%S')] [WARN]  $*" | tee -a "${LOG_FILE}"; }
log_error()   { echo "[$(date '+%H:%M:%S')] [FAIL]  $*" | tee -a "${LOG_FILE}"; }

run_step() {
    local step_name="$1"
    local step_fn="$2"
    log_info "Début : ${step_name}"
    if ${step_fn}; then
        log_success "${step_name}"
    else
        log_error "${step_name} — voir ${LOG_FILE} pour les détails"
        exit 1
    fi
}
# Retry automatique : 3 tentatives avant abandon
# Rollback si possible
```

### Résumé final
```
╔══════════════════════════════════════════════════════════════╗
║  ✅ INSTALLATION TERMINÉE AVEC SUCCÈS                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Application  : https://monapp.com                          ║
║  Admin panel  : https://monapp.com/zadmin                   ║
║                                                              ║
║  Première connexion /zadmin :                                ║
║    → Entrez votre courriel : admin@example.com              ║
║    → Vous serez invité à créer votre mot de passe           ║
║    → Activation TOTP obligatoire avant accès                ║
║                                                              ║
║  Log d'installation : /var/log/nexios-install.log           ║
║                                                              ║
║  ⚠️  Le token temporaire sera invalidé à la               ║
║      première connexion.                                     ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 9. Multilingue

### Langues supportées
| Code | Langue | Priorité | RTL |
|---|---|---|---|
| `fr` | Français 🇫🇷🇨🇦 | **Primaire** | Non |
| `en` | Anglais 🇨🇦🇺🇸 | **Primaire** | Non |
| `es` | Espagnol 🇪🇸🇲🇽 | Secondaire | Non |
| `de` | Allemand 🇩🇪 | Secondaire | Non |
| `pt` | Portugais 🇧🇷🇵🇹 | Secondaire | Non |
| `ar` | Arabe 🇸🇦 | Secondaire | **Oui** |

### Implémentation
- Fichiers JSON par langue dans `locales/`
- **Jamais** de texte hardcodé dans l'UI
- Support **RTL** obligatoire pour l'arabe (`dir="rtl"`)
- Langue détectée via `Accept-Language` header, surchargeble par l'utilisateur
- Préférence de langue stockée en PostgreSQL
- Langues actives configurables dans `/zadmin` → Multilingue

---

## 10. Code & Conventions

### Python
- **Version** : 3.11+ obligatoire
- **Style** : PEP 8 strict (`ruff`)
- **Type hints** : obligatoires sur toutes les fonctions publiques
- **Docstrings** : obligatoires sur toutes les classes et fonctions publiques

```python
def create_user(email: str, password: str, lang: str = "fr") -> UserSchema:
    """
    Crée un nouvel utilisateur dans la base de données.

    Args:
        email: Adresse email unique de l'utilisateur.
        password: Mot de passe en clair (sera hashé avec Argon2).
        lang: Code de langue préféré (défaut: 'fr').

    Returns:
        UserSchema: L'utilisateur créé avec son ID.

    Raises:
        HTTPException 409: Si l'email est déjà utilisé.
        HTTPException 422: Si les données sont invalides.
    """
```

### JavaScript / React
- **ESLint + Prettier** dans chaque projet
- **camelCase** pour variables et fonctions, **PascalCase** pour composants
- JSDoc sur les fonctions importantes
- ❌ `console.log()` interdit en production

### Header de copyright obligatoire (chaque fichier source)
```python
# Copyright © Technologies Nexios TF Inc. — nexiostf.com
# Tous droits réservés
```

### Logging
```python
import logging
logger = logging.getLogger(__name__)
# Jamais print() en production
```

---

## 11. Tests

### Standard minimum
- **pytest** pour tous les projets Python
- Couverture minimale : **70%** sur les services et routers
- Tests obligatoires : auth, TOTP, CRUD critiques, permissions `/zadmin`

### Structure
```
tests/
├── conftest.py
├── test_auth.py
├── test_totp.py
├── test_admin.py
├── test_permissions.py
└── utils/
    └── factories.py
```

### Base de données de test
- DB PostgreSQL dédiée (`_test` suffix)
- Rollback automatique après chaque test

---

## 12. Documentation

### Fichiers obligatoires dans chaque projet
| Fichier | Contenu |
|---|---|
| `README.md` | Description, installation rapide |
| `CLAUDE.md` | Contexte complet pour Claude Code |
| `STANDARDS.md` | Ce fichier |
| `.env.example` | Template minimal (DATABASE_URL, APP_ENV, APP_PORT uniquement) |
| `docs/ARCHITECTURE.md` | Diagramme et architecture |
| `docs/API.md` | Documentation endpoints |
| `installer/README_INSTALL.md` | Guide d'utilisation de l'installateur |
| `postInstallScripts/nginx_vhost.conf` | Vhost Nginx prêt à déployer |
| `postInstallScripts/create_database.sql` | Script de création DB complet et idempotent |
| `postInstallScripts/README.md` | Instructions d'utilisation des scripts post-install |

---

## 13. Versioning & Git

### Conventional Commits — obligatoires
```
feat(scope):     nouvelle fonctionnalité
fix(scope):      correction de bug
refactor(scope): refactoring
docs(scope):     documentation
test(scope):     tests
chore(scope):    maintenance
security(scope): correction de faille
i18n(scope):     traductions
install(scope):  modifications installateur
admin(scope):    modifications /zadmin
```

### Branches
```
main       ← Production — protégée
develop    ← Intégration
feature/   ← Fonctionnalités
fix/       ← Bugs
hotfix/    ← Urgences production
```

### .gitignore minimum obligatoire
```
.env
*.pyc
__pycache__/
.pytest_cache/
htmlcov/
dist/
node_modules/
*.egg-info/
.DS_Store
```

---

## 14. Structure de projet

### Template standard — tout projet Nexios TF
```
nom-du-projet/
├── CLAUDE.md
├── STANDARDS.md
├── README.md
├── .env.example              ← DATABASE_URL, APP_ENV, APP_PORT UNIQUEMENT
├── .gitignore
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   │   ├── user.py
│   │   ├── role.py
│   │   ├── permission.py
│   │   ├── system_config.py
│   │   ├── audit_log.py
│   │   └── support_conversation.py
│   ├── schemas/
│   ├── routers/
│   │   ├── auth.py
│   │   ├── admin.py           ← /zadmin API
│   │   └── support.py         ← Andy support
│   ├── services/
│   │   ├── config_service.py
│   │   ├── totp_service.py
│   │   ├── andy_service.py
│   │   ├── audit_service.py
│   │   └── permission_service.py
│   ├── middleware/
│   ├── locales/
│   │   ├── fr.json
│   │   ├── en.json
│   │   ├── es.json
│   │   ├── de.json
│   │   ├── pt.json
│   │   └── ar.json
│   ├── alembic/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Admin/         ← Composants /zadmin
│   │   │   └── Support/       ← Widget Andy
│   │   ├── locales/
│   │   └── styles/
│   │       └── variables.css
│   └── index.html
├── installer/
│   ├── install.sh
│   ├── seed_config.py
│   ├── templates/
│   └── README_INSTALL.md
├── postInstallScripts/            ← OBLIGATOIRE — tous les projets
│   ├── nginx_vhost.conf           ← Vhost Nginx prêt à déployer
│   ├── create_database.sql        ← Création complète DB + user + permissions
│   └── README.md                  ← Instructions d'utilisation
├── nginx/
│   └── projet.conf
├── scripts/
│   ├── backup_db.sh
│   └── renew_ssl.sh
└── docs/
    ├── ARCHITECTURE.md
    └── API.md
```

---

## 15. Ce qui est INTERDIT

### Infrastructure
- ❌ Docker / Docker Compose / Podman / Kubernetes
- ❌ Services cloud : AWS, GCP, Azure, Vercel, Netlify, Heroku
- ❌ Bases de données cloud : PlanetScale, Supabase, MongoDB Atlas
- ❌ SQLite (même en développement)
- ❌ **APIs LLM externes** : OpenAI, Anthropic API, Mistral, Cohere, Hugging Face Inference, Together AI, Groq, etc. — **Ollama on-premise uniquement**

### Configuration
- ❌ Mettre autre chose que `DATABASE_URL`, `APP_ENV`, `APP_PORT` dans `.env`
- ❌ Hardcoder des valeurs de configuration dans le code
- ❌ Configurer l'application autrement que via `/zadmin`

### Sécurité
- ❌ Mots de passe hashés avec SHA-256, MD5, SHA-1, bcrypt
- ❌ Credentials hardcodés dans le code source
- ❌ CORS ouvert à toutes les origines (`*`)
- ❌ Credentials par défaut en production
- ❌ HTTP sans redirection HTTPS
- ❌ /zadmin sans TOTP en production

### Frontend
- ❌ Tailwind CSS (même CDN)
- ❌ Bootstrap et tout framework CSS tiers
- ❌ Create React App (utiliser Vite)
- ❌ jQuery

### Code
- ❌ `print()` en production
- ❌ `console.log()` en production
- ❌ `SELECT *` dans les requêtes SQL
- ❌ Fonctions publiques sans type hints (Python)
- ❌ Fonctions publiques sans docstrings
- ❌ Texte hardcodé dans l'UI

### Git
- ❌ Committer directement sur `main`
- ❌ Committer un `.env` ou des secrets
- ❌ Messages de commit sans format Conventional Commits

---

## 📝 Historique des révisions

| Version | Date | Auteur | Changements |
|---|---|---|---|
| 1.0.0 | Mars 2026 | François Chalut | Version initiale |
| 1.1.0 | Mars 2026 | François Chalut | PostgreSQL-first, /zadmin complet, auto-installateur, Andy support, TOTP complet, multilingue 6 langues |
| 1.2.0 | Mars 2026 | François Chalut | Installateur : détection intelligente des packages, sauvegarde configs avant mise à jour, matrice de vérification par service |
| 1.3.0 | Mars 2026 | François Chalut | Installateur : détection dynamique du port Ollama, assignation automatique du prochain port disponible |
| 1.4.0 | Mars 2026 | François Chalut | Installateur : vérification accessibilité port 80 avant certbot avec message d'erreur explicite |
| 1.5.0 | Mars 2026 | François Chalut | OS supportés : ajout de Zorin OS 18 Core (Debian 12, Ubuntu 24.04, Zorin OS 18 Core) |
| 1.6.0 | Mars 2026 | François Chalut | Installateur : port APP dynamique (plage 8000-8999, défaut 8004), libération port avant démarrage, .env obligatoire dans backend/, détection copie circulaire lors de réinstallation |
| 1.7.0 | Avril 2026 | François Chalut | LLM : Ollama on-premise obligatoire (toute API LLM externe interdite) ; postInstallScripts/ obligatoire dans tous les projets (nginx_vhost.conf + create_database.sql idempotent + README.md) |

---

*Technologies Nexios TF Inc. — nexiostf.com*
*La Tuque, Québec, Canada*
