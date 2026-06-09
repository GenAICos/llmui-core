-- postInstallScripts/create_database.sql
-- Copyright © Technologies Nexios TF Inc. — nexiostf.com
-- Création complète de la base de données LLMUI Core
--
-- Remplacer : llmui_user, DB_PASSWORD, llmui_core
-- Usage : psql -U postgres -f create_database.sql
--
-- Ce script est IDEMPOTENT — peut être relancé sans danger.

-- ============================================================================
-- CRÉATION DE L'UTILISATEUR APPLICATIF (idempotent)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'llmui_user') THEN
        CREATE ROLE llmui_user WITH LOGIN PASSWORD 'DB_PASSWORD';
        RAISE NOTICE 'Utilisateur llmui_user créé.';
    ELSE
        RAISE NOTICE 'Utilisateur llmui_user existe déjà — ignoré.';
    END IF;
END
$$;

-- ============================================================================
-- CRÉATION DE LA BASE DE DONNÉES (idempotent)
-- ============================================================================
SELECT 'CREATE DATABASE llmui_core OWNER llmui_user ENCODING ''UTF8'' LC_COLLATE ''fr_CA.UTF-8'' LC_CTYPE ''fr_CA.UTF-8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'llmui_core')\gexec

-- ============================================================================
-- CONNEXION À LA BASE POUR LES PERMISSIONS
-- ============================================================================
\c llmui_core

-- Révoquer les permissions publiques par défaut
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Permissions minimales pour l'utilisateur applicatif
GRANT CONNECT ON DATABASE llmui_core TO llmui_user;
GRANT USAGE ON SCHEMA public TO llmui_user;
GRANT CREATE ON SCHEMA public TO llmui_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO llmui_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO llmui_user;

-- Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLES FONDAMENTALES (créées ici pour référence — Alembic gère les migrations)
-- ============================================================================

-- Table system_config (STANDARDS.md §2)
CREATE TABLE IF NOT EXISTS system_config (
    id           SERIAL PRIMARY KEY,
    section      VARCHAR(100) NOT NULL,
    key          VARCHAR(100) NOT NULL,
    value        TEXT,
    value_type   VARCHAR(20) DEFAULT 'string',
    label        VARCHAR(200),
    description  TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_by   INTEGER,
    UNIQUE(section, key)
);

-- Table users
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(200),
    lang            VARCHAR(10) DEFAULT 'fr',
    is_active       BOOLEAN DEFAULT TRUE,
    is_admin        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,
    CONSTRAINT idx_users_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Table user_totp (STANDARDS.md §6)
CREATE TABLE IF NOT EXISTS user_totp (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
    secret_encrypted TEXT NOT NULL,
    is_active        BOOLEAN DEFAULT FALSE,
    activated_at     TIMESTAMPTZ,
    recovery_codes   JSONB,
    last_used_at     TIMESTAMPTZ,
    UNIQUE(user_id)
);

-- Table audit_log (STANDARDS.md §5 — immutable)
CREATE TABLE IF NOT EXISTS audit_log (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    action      VARCHAR(200) NOT NULL,
    resource    VARCHAR(200),
    ip_address  INET,
    user_agent  TEXT,
    details     JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id   ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Table support_conversations — Andy (STANDARDS.md §7)
CREATE TABLE IF NOT EXISTS support_conversations (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    session_id  UUID NOT NULL DEFAULT uuid_generate_v4(),
    started_at  TIMESTAMPTZ DEFAULT NOW(),
    ended_at    TIMESTAMPTZ,
    status      VARCHAR(20) DEFAULT 'active',
    messages    JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_support_conversations_session ON support_conversations(session_id);

-- Table andy_knowledge — Base de connaissance Andy
CREATE TABLE IF NOT EXISTS andy_knowledge (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(500) NOT NULL,
    content     TEXT NOT NULL,
    category    VARCHAR(100),
    lang        VARCHAR(10) DEFAULT 'fr',
    version     INTEGER DEFAULT 1,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_andy_knowledge_category ON andy_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_andy_knowledge_lang     ON andy_knowledge(lang);

-- ============================================================================
-- CONFIGURATION INITIALE (system_config)
-- ============================================================================
INSERT INTO system_config (section, key, value, value_type, label, description) VALUES
    ('general',  'app_name',     'LLMUI Core',   'string', 'Nom application',    'Nom affiché dans l''interface'),
    ('general',  'app_version',  '1.0.0',        'string', 'Version',            'Version courante'),
    ('general',  'default_lang', 'fr',           'string', 'Langue par défaut',  'Code langue ISO'),
    ('general',  'timezone',     'America/Montreal', 'string', 'Fuseau horaire', 'Timezone du serveur'),
    ('andy',     'enabled',      'true',         'bool',   'Andy activé',        'Activer le widget Andy'),
    ('andy',     'model',        'qwen3.5:0.8b', 'string', 'Modèle Ollama',      'Modèle utilisé par Andy'),
    ('andy',     'ollama_url',   'http://localhost:11434', 'string', 'URL Ollama', 'Instance Ollama locale'),
    ('security', 'totp_required_admin',  'true',  'bool',  'TOTP admin obligatoire', 'Exiger TOTP pour les admins'),
    ('security', 'max_login_attempts',   '5',     'int',   'Max tentatives login',   'Blocage après N échecs'),
    ('security', 'lockout_minutes',      '15',    'int',   'Durée blocage (min)',     'Durée blocage après échecs')
ON CONFLICT (section, key) DO NOTHING;

\echo '✅ Base de données llmui_core créée avec succès — utilisateur : llmui_user'
