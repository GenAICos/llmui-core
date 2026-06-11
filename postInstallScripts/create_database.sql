-- postInstallScripts/create_database.sql
-- Copyright © Technologies Nexios TF Inc. — nexiostf.com
-- Projet : llmui-core — utilisateur llmui_user, base llmui_core
-- Remplacer : DB_PASSWORD (mot de passe fort généré, ex: openssl rand -hex 32)
-- Usage : psql -U postgres -f create_database.sql

-- Création de l'utilisateur applicatif (idempotent)
-- Note : si le rôle existe déjà, son mot de passe est RESYNCHRONISÉ avec
-- DB_PASSWORD — évite le mismatch .env/PostgreSQL lors d'une réinstallation.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'llmui_user') THEN
        CREATE ROLE llmui_user WITH LOGIN PASSWORD 'DB_PASSWORD';
    ELSE
        ALTER ROLE llmui_user WITH LOGIN PASSWORD 'DB_PASSWORD';
    END IF;
END
$$;

-- Création de la base de données (idempotent)
SELECT 'CREATE DATABASE llmui_core OWNER llmui_user ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'llmui_core')\gexec

-- Connexion à la DB pour les permissions
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

-- Confirmation
\echo '✅ Base de données llmui_core créée avec succès — utilisateur : llmui_user'
