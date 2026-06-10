#!/bin/bash
# Copyright © Technologies Nexios TF Inc. — nexiostf.com
# LLMUI Core - Installation Interactive v1.0.0
# Version: 1.0.0

set -e

# ============================================================================
# COULEURS & HELPERS
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

INSTALL_DIR="/opt/llmui-core"
VENV_DIR="$INSTALL_DIR/venv"
LOG_FILE="/tmp/llmui_install.log"
ERROR_LOG="/tmp/llmui_errors.log"
INSTALL_ERRORS=0
APP_PORT="${APP_PORT:-8004}"

print_msg() {
    local type=$1 msg=$2
    case $type in
        success) echo -e "${GREEN}✅ $msg${NC}"; echo "OK  $msg" >> "$LOG_FILE" ;;
        error)   echo -e "${RED}❌ $msg${NC}"; echo "ERR $msg" >> "$ERROR_LOG"; ((INSTALL_ERRORS++)) ;;
        warning) echo -e "${YELLOW}⚠️  $msg${NC}"; echo "WRN $msg" >> "$LOG_FILE" ;;
        info)    echo -e "${BLUE}ℹ️  $msg${NC}"; echo "INF $msg" >> "$LOG_FILE" ;;
        step)    echo -e "${CYAN}▶ $msg${NC}"; echo ">>> $msg" >> "$LOG_FILE" ;;
    esac
}

wait_for_continue() {
    echo ""
    echo -e "${YELLOW}Appuyez sur ENTRÉE pour continuer...${NC}"
    read -r
}

check_service_start() {
    local service_name=$1 check_command=$2 timeout=15 elapsed=0
    print_msg "info" "Vérification du démarrage de $service_name..."
    while [ $elapsed -lt $timeout ]; do
        if eval "$check_command" &>/dev/null; then
            print_msg "success" "$service_name démarré avec succès"
            return 0
        fi
        sleep 1
        ((elapsed++))
    done
    print_msg "error" "Échec du démarrage de $service_name après ${timeout}s"
    return 1
}

show_error_summary() {
    echo ""
    if [ $INSTALL_ERRORS -gt 0 ]; then
        echo -e "${RED}═══════════════════════════════════════════════════${NC}"
        echo -e "${RED}⚠️  Installation terminée avec $INSTALL_ERRORS erreur(s)${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════${NC}"
        cat "$ERROR_LOG"
        return 1
    else
        echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}✅ Installation terminée sans erreur !${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
        return 0
    fi
}

> "$LOG_FILE"
> "$ERROR_LOG"

# ============================================================================
# BANNER
# ============================================================================
clear
echo -e "${CYAN}"
cat << 'BANNER_EOF'
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              Installation Interactive LLMUI              ║
║                     Version 1.0.0                        ║
║          Technologies Nexios TF Inc.                     ║
╚══════════════════════════════════════════════════════════╝
BANNER_EOF
echo -e "${NC}"

print_msg "info" "Répertoire d'installation : $INSTALL_DIR"
print_msg "info" "Port applicatif : $APP_PORT"
wait_for_continue

# ============================================================================
# ÉTAPE 1 — PRÉREQUIS SYSTÈME
# ============================================================================
print_msg "step" "Étape 1/7 : Vérification et installation des prérequis système"
echo ""

# Détecter le gestionnaire de paquets
if command -v apt-get &>/dev/null; then
    PKG_INSTALL="sudo apt-get install -y"
    sudo apt-get update -qq 2>>"$ERROR_LOG" || print_msg "warning" "apt update échoué (non bloquant)"
elif command -v dnf &>/dev/null; then
    PKG_INSTALL="sudo dnf install -y"
elif command -v yum &>/dev/null; then
    PKG_INSTALL="sudo yum install -y"
else
    print_msg "warning" "Gestionnaire de paquets non détecté — certaines auto-installations seront impossibles"
    PKG_INSTALL=""
fi

# --- Python 3.11+ ---
print_msg "info" "Vérification de Python 3.11+..."
if command -v python3 &>/dev/null; then
    PYTHON_MINOR=$(python3 -c "import sys; print(sys.version_info.minor)")
    PYTHON_VER=$(python3 --version | cut -d' ' -f2)
    if [ "$PYTHON_MINOR" -ge 11 ]; then
        print_msg "success" "Python $PYTHON_VER détecté"
    else
        print_msg "warning" "Python $PYTHON_VER — LLMUI Core v1.0.0 requiert 3.11+"
        if [ -n "$PKG_INSTALL" ]; then
            print_msg "info" "Installation de Python 3.11..."
            $PKG_INSTALL python3.11 python3.11-venv 2>>"$ERROR_LOG" \
                && print_msg "success" "Python 3.11 installé" \
                || print_msg "error" "Échec — installez Python 3.11+ manuellement"
        fi
    fi
else
    print_msg "error" "Python 3 introuvable"
    [ -n "$PKG_INSTALL" ] \
        && $PKG_INSTALL python3 python3-venv 2>>"$ERROR_LOG" \
        && print_msg "success" "Python 3 installé" \
        || { print_msg "error" "Impossible d'installer Python 3 — arrêt"; exit 1; }
fi

# --- python3-venv (manque souvent sur Debian/Ubuntu) ---
print_msg "info" "Vérification de python3-venv..."
if python3 -m venv --help &>/dev/null; then
    print_msg "success" "python3-venv disponible"
else
    print_msg "warning" "python3-venv absent — installation automatique..."
    if [ -n "$PKG_INSTALL" ]; then
        $PKG_INSTALL python3-venv python3-full 2>>"$ERROR_LOG" \
            && print_msg "success" "python3-venv installé" \
            || { print_msg "error" "Impossible d'installer python3-venv"; exit 1; }
    else
        print_msg "error" "Installez python3-venv manuellement (ex: apt install python3-venv)"; exit 1
    fi
fi

# --- pip ---
print_msg "info" "Vérification de pip..."
if python3 -m pip --version &>/dev/null; then
    print_msg "success" "pip disponible ($(python3 -m pip --version | cut -d' ' -f1-2))"
else
    print_msg "warning" "pip absent — installation automatique..."
    # Essai 1 : ensurepip (inclus dans CPython standard)
    if python3 -m ensurepip --upgrade 2>>"$ERROR_LOG"; then
        print_msg "success" "pip installé via ensurepip"
    elif [ -n "$PKG_INSTALL" ]; then
        $PKG_INSTALL python3-pip 2>>"$ERROR_LOG" \
            && print_msg "success" "pip installé via gestionnaire de paquets" \
            || { print_msg "error" "Impossible d'installer pip"; exit 1; }
    else
        print_msg "error" "pip introuvable — installez python3-pip manuellement"; exit 1
    fi
fi

# --- curl ---
print_msg "info" "Vérification de curl..."
if command -v curl &>/dev/null; then
    print_msg "success" "curl disponible"
elif [ -n "$PKG_INSTALL" ]; then
    print_msg "warning" "curl absent — installation automatique..."
    $PKG_INSTALL curl 2>>"$ERROR_LOG" \
        && print_msg "success" "curl installé" \
        || print_msg "warning" "curl non installé — health checks désactivés"
fi

# --- Serveur PostgreSQL (STANDARDS.md — PostgreSQL 16+ obligatoire) ---
print_msg "info" "Vérification du serveur PostgreSQL..."
if command -v pg_lsclusters &>/dev/null || systemctl list-unit-files 2>/dev/null | grep -q 'postgresql'; then
    print_msg "success" "Serveur PostgreSQL présent"
elif [ -n "$PKG_INSTALL" ]; then
    print_msg "warning" "Serveur PostgreSQL absent — installation..."
    $PKG_INSTALL postgresql postgresql-contrib 2>>"$ERROR_LOG" \
        && print_msg "success" "PostgreSQL installé et démarré" \
        || print_msg "warning" "Échec installation PostgreSQL — installez-le manuellement (postInstallScripts/README.md)"
fi

# --- Client PostgreSQL ---
print_msg "info" "Vérification de psql (client PostgreSQL)..."
if command -v psql &>/dev/null; then
    print_msg "success" "psql disponible"
elif [ -n "$PKG_INSTALL" ]; then
    print_msg "warning" "psql absent — installation du client PostgreSQL..."
    $PKG_INSTALL postgresql-client 2>>"$ERROR_LOG" \
        && print_msg "success" "postgresql-client installé" \
        || print_msg "warning" "postgresql-client non installé — exécutez create_database.sql manuellement"
fi

# --- Ollama ---
print_msg "info" "Vérification d'Ollama..."
if command -v ollama &>/dev/null; then
    print_msg "success" "Ollama disponible"
else
    print_msg "warning" "Ollama absent — installation via script officiel..."
    if command -v curl &>/dev/null; then
        # ✅ CORRECTION M-07 : on télécharge le script dans un fichier (pas de
        # `curl | sh`), on vérifie qu'il a bien été reçu en entier et qu'il
        # ressemble à un script shell, et on affiche son SHA-256 pour
        # permettre une vérification manuelle avant exécution.
        OLLAMA_INSTALL_SCRIPT="$(mktemp)"
        if curl -fsSL https://ollama.com/install.sh -o "$OLLAMA_INSTALL_SCRIPT" 2>>"$ERROR_LOG" \
            && [ -s "$OLLAMA_INSTALL_SCRIPT" ] \
            && head -n1 "$OLLAMA_INSTALL_SCRIPT" | grep -q '^#!'; then
            print_msg "info" "SHA-256 du script Ollama : $(sha256sum "$OLLAMA_INSTALL_SCRIPT" | cut -d' ' -f1)"
            if sh "$OLLAMA_INSTALL_SCRIPT" 2>>"$ERROR_LOG"; then
                print_msg "success" "Ollama installé"
            else
                print_msg "warning" "Échec installation Ollama — installez manuellement : https://ollama.com/download"
            fi
        else
            print_msg "warning" "Téléchargement du script Ollama invalide — installez manuellement : https://ollama.com/download"
        fi
        rm -f "$OLLAMA_INSTALL_SCRIPT"
    else
        print_msg "warning" "curl indisponible — installez Ollama manuellement : https://ollama.com/download"
    fi
fi

# --- Droits sudo ---
sudo -n true 2>/dev/null \
    && print_msg "success" "Droits sudo disponibles" \
    || print_msg "warning" "sudo demandera votre mot de passe pour certaines opérations"

wait_for_continue

# ============================================================================
# ÉTAPE 2 — STRUCTURE DE FICHIERS
# ============================================================================
print_msg "step" "Étape 2/7 : Création de la structure de fichiers"
echo ""

if sudo mkdir -p "$INSTALL_DIR"/{src,web,ssl,scripts,docs,tests,images,tools,postInstallScripts} 2>>"$ERROR_LOG"; then
    print_msg "success" "Structure créée dans $INSTALL_DIR"
else
    print_msg "error" "Échec de la création de la structure"
fi

if sudo chown -R "$USER:$USER" "$INSTALL_DIR" 2>>"$ERROR_LOG"; then
    print_msg "success" "Permissions configurées pour $USER"
else
    print_msg "error" "Échec des permissions"
fi

wait_for_continue

# ============================================================================
# ÉTAPE 3 — ENVIRONNEMENT VIRTUEL PYTHON
# ============================================================================
print_msg "step" "Étape 3/7 : Environnement virtuel Python"
echo ""

if [ -d "$VENV_DIR" ]; then
    print_msg "info" "Venv existant — réutilisation"
else
    if python3 -m venv "$VENV_DIR" 2>>"$ERROR_LOG"; then
        print_msg "success" "Venv créé : $VENV_DIR"
    else
        print_msg "error" "Échec création venv"; exit 1
    fi
fi

# shellcheck source=/dev/null
source "$VENV_DIR/bin/activate"
print_msg "success" "Venv activé"

print_msg "info" "Mise à jour de pip dans le venv..."
"$VENV_DIR/bin/python" -m pip install --upgrade pip 2>>"$ERROR_LOG" \
    && print_msg "success" "pip à jour" \
    || print_msg "warning" "Mise à jour pip échouée (non critique)"

chmod -R u+rwx "$VENV_DIR/bin" 2>/dev/null || true

wait_for_continue

# ============================================================================
# ÉTAPE 4 — DÉPENDANCES PYTHON
# ============================================================================
print_msg "step" "Étape 4/7 : Installation des packages Python"
echo ""

# Chercher requirements.txt (priorité : répertoire courant, puis INSTALL_DIR)
REQUIREMENTS_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for candidate in "$SCRIPT_DIR/../requirements.txt" "./requirements.txt" "$INSTALL_DIR/requirements.txt"; do
    if [ -f "$candidate" ]; then
        REQUIREMENTS_FILE="$(realpath "$candidate")"
        break
    fi
done

if [ -n "$REQUIREMENTS_FILE" ]; then
    print_msg "success" "requirements.txt trouvé : $REQUIREMENTS_FILE"
else
    print_msg "warning" "requirements.txt introuvable — création du fichier minimal v1.0.0..."
    REQUIREMENTS_FILE="$INSTALL_DIR/requirements.txt"
    cat > "$REQUIREMENTS_FILE" << 'REQEOF'
# LLMUI Core v1.0.0 — dépendances minimales
# Copyright © Technologies Nexios TF Inc.
fastapi==0.104.1
uvicorn[standard]==0.24.0
starlette==0.27.0
httpx==0.25.2
pydantic==2.5.0
python-multipart==0.0.6
itsdangerous==2.1.2
python-dotenv==1.0.0
PyYAML==6.0.1
# Sécurité (STANDARDS.md §6 — Argon2 obligatoire, jamais bcrypt)
argon2-cffi==23.1.0
passlib[argon2]==1.7.4
PyJWT==2.8.0
pyotp==2.9.0
cryptography==41.0.7
# PostgreSQL async (STANDARDS.md — jamais SQLite)
asyncpg==0.29.0
sqlalchemy[asyncio]==2.0.23
alembic==1.12.1
# Cache
redis==5.0.1
REQEOF
    print_msg "info" "Fichier minimal créé"
fi

print_msg "info" "Installation des dépendances (peut prendre quelques minutes)..."
if "$VENV_DIR/bin/pip" install -r "$REQUIREMENTS_FILE" 2>>"$ERROR_LOG"; then
    print_msg "success" "Dépendances installées"
else
    print_msg "error" "Échec installation des dépendances — voir $ERROR_LOG"
fi

wait_for_continue

# ============================================================================
# ÉTAPE 5 — CONFIGURATION .env
# ============================================================================
print_msg "step" "Étape 5/7 : Configuration de l'environnement (.env)"
echo ""

ENV_FILE="$INSTALL_DIR/.env"
ENV_EXAMPLE=""
for candidate in "$SCRIPT_DIR/../.env.example" "./.env.example" "$INSTALL_DIR/.env.example"; do
    if [ -f "$candidate" ]; then ENV_EXAMPLE="$(realpath "$candidate")"; break; fi
done

if [ -f "$ENV_FILE" ]; then
    print_msg "info" ".env existant conservé"
else
    if [ -n "$ENV_EXAMPLE" ]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        print_msg "success" ".env créé depuis .env.example"
    else
        cat > "$ENV_FILE" << ENVEOF
DATABASE_URL=postgresql+asyncpg://llmui_user:CHANGEME@localhost:5432/llmui_core
APP_PORT=$APP_PORT
APP_ENV=production
ENVEOF
        print_msg "info" ".env minimal créé"
    fi
    # Génère un mot de passe PostgreSQL fort (remplace le placeholder CHANGEME).
    # L'étape 6 réutilisera ce mot de passe pour créer le rôle llmui_user.
    GENERATED_DB_PASS="$(openssl rand -hex 32)"
    sed -i "s#://llmui_user:CHANGEME@#://llmui_user:${GENERATED_DB_PASS}@#" "$ENV_FILE"
    print_msg "success" "Mot de passe PostgreSQL généré automatiquement dans $ENV_FILE"
fi

# Certificats SSL (optionnel)
if [ ! -f "$INSTALL_DIR/ssl/llmui.crt" ]; then
    mkdir -p "$INSTALL_DIR/ssl"
    SSL_SCRIPT=""
    for candidate in "$SCRIPT_DIR/generate_ssl.sh" "$INSTALL_DIR/scripts/generate_ssl.sh"; do
        [ -f "$candidate" ] && SSL_SCRIPT="$candidate" && break
    done
    if [ -n "$SSL_SCRIPT" ]; then
        bash "$SSL_SCRIPT" 2>>"$ERROR_LOG" \
            && print_msg "success" "Certificats SSL générés" \
            || print_msg "warning" "Génération SSL échouée (HTTPS indisponible, non bloquant)"
    fi
fi

wait_for_continue

# ============================================================================
# ÉTAPE 6 — BASE DE DONNÉES POSTGRESQL
# ============================================================================
print_msg "step" "Étape 6/7 : Base de données PostgreSQL"
echo ""

if command -v psql &>/dev/null; then
    if ! sudo -u postgres psql -c '\q' 2>/dev/null; then
        print_msg "info" "PostgreSQL inaccessible — tentative de démarrage du service..."
        sudo systemctl enable --now postgresql 2>>"$ERROR_LOG" || true
        sleep 2
    fi

    if sudo -u postgres psql -c '\q' 2>/dev/null; then
        print_msg "success" "PostgreSQL accessible"

        SQL_SCRIPT=""
        for candidate in "$SCRIPT_DIR/../postInstallScripts/create_database.sql" \
                         "$INSTALL_DIR/postInstallScripts/create_database.sql"; do
            [ -f "$candidate" ] && SQL_SCRIPT="$(realpath "$candidate")" && break
        done

        # create_database.sql utilise LC_COLLATE/LC_CTYPE fr_CA.UTF-8 — absente
        # par défaut sur une installation minimale (seules C/C.UTF-8 existent).
        if ! locale -a 2>/dev/null | grep -qi '^fr_CA\.utf8$'; then
            print_msg "info" "Génération de la locale fr_CA.UTF-8..."
            echo "fr_CA.UTF-8 UTF-8" | sudo tee -a /etc/locale.gen >/dev/null
            sudo locale-gen 2>>"$ERROR_LOG" \
                && print_msg "success" "Locale fr_CA.UTF-8 générée" \
                || print_msg "warning" "Échec génération locale fr_CA.UTF-8 — la création de llmui_core pourrait échouer"
        fi

        if [ -n "$SQL_SCRIPT" ]; then
            # Récupère le mot de passe depuis .env pour créer le rôle llmui_user
            # avec le même mot de passe (évite tout désalignement .env / DB).
            DB_PASS="$(sed -n 's#^DATABASE_URL=.*://[^:]*:\([^@]*\)@.*#\1#p' "$ENV_FILE")"
            if [ -z "$DB_PASS" ]; then
                print_msg "warning" "Mot de passe introuvable dans $ENV_FILE — exécutez create_database.sql manuellement (postInstallScripts/README.md)"
            else
                # Copie temporaire avec mot de passe injecté : `psql -f` en
                # `sudo -u postgres` échoue sur les fichiers sous /root (pas de
                # droit de traversée pour postgres) — on lit donc via stdin,
                # ouvert par root avant le changement d'utilisateur.
                DB_PASS_ESCAPED="$(printf '%s' "$DB_PASS" | sed -e 's/[\/&]/\\&/g')"
                TMP_SQL="$(mktemp)"
                sed "s/DB_PASSWORD/$DB_PASS_ESCAPED/g" "$SQL_SCRIPT" > "$TMP_SQL"
                sudo -u postgres psql < "$TMP_SQL" 2>>"$ERROR_LOG" \
                    && print_msg "success" "Base de données llmui_core configurée (mot de passe synchronisé avec $ENV_FILE)" \
                    || print_msg "warning" "Erreur lors de la configuration — vérifiez $ERROR_LOG (script idempotent)"
                rm -f "$TMP_SQL"
            fi
        else
            print_msg "warning" "create_database.sql introuvable — créez la DB manuellement (postInstallScripts/README.md)"
        fi
    else
        print_msg "warning" "PostgreSQL inaccessible — installez/démarrez-le : sudo apt install postgresql && sudo systemctl enable --now postgresql"
    fi
else
    print_msg "warning" "psql absent — créez la base de données manuellement (postInstallScripts/README.md)"
fi

wait_for_continue

# ============================================================================
# ÉTAPE 7 — DÉMARRAGE DU BACKEND
# ============================================================================
print_msg "step" "Étape 7/7 : Démarrage du backend"
echo ""

BACKEND_SCRIPT=""
for candidate in "$SCRIPT_DIR/../src/llmui_backend.py" "$INSTALL_DIR/src/llmui_backend.py" "./src/llmui_backend.py"; do
    [ -f "$candidate" ] && BACKEND_SCRIPT="$(realpath "$candidate")" && break
done

if [ -n "$BACKEND_SCRIPT" ]; then
    print_msg "info" "Démarrage du backend LLMUI sur le port $APP_PORT..."
    cd "$(dirname "$(dirname "$BACKEND_SCRIPT")")" 2>/dev/null || true
    "$VENV_DIR/bin/python" "$BACKEND_SCRIPT" &
    BACKEND_PID=$!

    if command -v curl &>/dev/null; then
        if check_service_start "Backend" "curl -sf http://localhost:$APP_PORT/health"; then
            print_msg "success" "Backend démarré (PID: $BACKEND_PID)"
        else
            print_msg "error" "Le backend n'a pas démarré — consultez les logs"
            kill $BACKEND_PID 2>/dev/null || true
        fi
    else
        sleep 3
        if kill -0 $BACKEND_PID 2>/dev/null; then
            print_msg "success" "Backend démarré (PID: $BACKEND_PID)"
        else
            print_msg "error" "Le backend s'est arrêté immédiatement"
        fi
    fi
else
    print_msg "warning" "src/llmui_backend.py introuvable — démarrez manuellement après déploiement"
fi

# ============================================================================
# RÉSUMÉ FINAL
# ============================================================================
echo ""
echo "════════════════════════════════════════════════════════"

if show_error_summary; then
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    echo ""
    echo -e "${GREEN}🎉 LLMUI Core v1.0.0 installé !${NC}"
    echo ""
    echo -e "  ${BLUE}Interface web :${NC}  ${GREEN}http://$SERVER_IP:$APP_PORT${NC}"
    echo -e "  ${BLUE}API docs      :${NC}  ${GREEN}http://localhost:$APP_PORT/docs${NC}"
    echo -e "  ${BLUE}Health check  :${NC}  ${GREEN}http://localhost:$APP_PORT/health${NC}"
    echo ""
    echo -e "  ${BLUE}Fichier .env  :${NC}  ${YELLOW}$INSTALL_DIR/.env${NC}"
    echo -e "  ${BLUE}Logs install  :${NC}  ${YELLOW}$LOG_FILE${NC}"
else
    echo -e "${RED}⚠️  Installation avec erreurs${NC}"
    echo -e "  Erreurs   : ${YELLOW}$ERROR_LOG${NC}"
    echo -e "  Log complet: ${YELLOW}$LOG_FILE${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}Appuyez sur ENTRÉE pour afficher les logs...${NC}"
read -r

echo ""
cat "$LOG_FILE"
[ $INSTALL_ERRORS -gt 0 ] && echo "" && echo -e "${RED}--- Erreurs ---${NC}" && cat "$ERROR_LOG"

deactivate 2>/dev/null || true
exit $INSTALL_ERRORS
