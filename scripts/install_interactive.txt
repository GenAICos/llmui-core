#!/bin/bash

# Script d'installation interactif pour LLMUI
# Version: 0.5
# Ce script guide l'utilisateur à travers l'installation complète

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables globales
INSTALL_DIR="/opt/llmui-core"
VENV_DIR="$INSTALL_DIR/venv"
LOG_FILE="/tmp/llmui_install.log"
ERROR_LOG="/tmp/llmui_errors.log"
INSTALL_ERRORS=0

# Fonction pour afficher les messages
print_msg() {
    local type=$1
    local msg=$2
    case $type in
        "success")
            echo -e "${GREEN}✅ $msg${NC}"
            echo "✅ $msg" >> "$LOG_FILE"
            ;;
        "error")
            echo -e "${RED}❌ $msg${NC}"
            echo "❌ $msg" >> "$ERROR_LOG"
            ((INSTALL_ERRORS++))
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  $msg${NC}"
            echo "⚠️  $msg" >> "$LOG_FILE"
            ;;
        "info")
            echo -e "${BLUE}ℹ️  $msg${NC}"
            echo "ℹ️  $msg" >> "$LOG_FILE"
            ;;
        "step")
            echo -e "${BLUE}▶ $msg${NC}"
            echo "▶ $msg" >> "$LOG_FILE"
            ;;
    esac
}

# Fonction pour attendre la confirmation de l'utilisateur
wait_for_continue() {
    echo ""
    echo -e "${YELLOW}Appuyez sur ENTRÉE pour continuer...${NC}"
    read -r
}

# Fonction pour vérifier si un service démarre correctement
check_service_start() {
    local service_name=$1
    local check_command=$2
    local timeout=10
    local elapsed=0
    
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

# Fonction pour afficher le résumé des erreurs
show_error_summary() {
    if [ $INSTALL_ERRORS -gt 0 ]; then
        echo ""
        echo -e "${RED}═══════════════════════════════════════════════════${NC}"
        echo -e "${RED}⚠️  L'installation s'est terminée avec $INSTALL_ERRORS erreur(s)${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${YELLOW}Détails des erreurs :${NC}"
        cat "$ERROR_LOG"
        echo ""
        return 1
    else
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}✅ Installation terminée sans erreur !${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
        echo ""
        return 0
    fi
}

# Initialisation des fichiers de log
> "$LOG_FILE"
> "$ERROR_LOG"

# Banner
clear
echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              Installation Interactive LLMUI              ║
║                      Version 0.5                         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

print_msg "info" "Ce script va installer LLMUI sur votre système"
print_msg "info" "Répertoire d'installation : $INSTALL_DIR"
wait_for_continue

# Étape 1: Vérification des prérequis
print_msg "step" "Étape 1/7 : Vérification des prérequis"
echo ""

print_msg "info" "Vérification de Python 3..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    print_msg "success" "Python $PYTHON_VERSION détecté"
else
    print_msg "error" "Python 3 n'est pas installé"
    exit 1
fi

print_msg "info" "Vérification de pip..."
if python3 -m pip --version &> /dev/null; then
    print_msg "success" "pip est disponible"
else
    print_msg "error" "pip n'est pas disponible"
    exit 1
fi

print_msg "info" "Vérification des droits sudo..."
if sudo -n true 2>/dev/null; then
    print_msg "success" "Droits sudo disponibles"
else
    print_msg "warning" "Certaines opérations nécessiteront sudo"
fi

wait_for_continue

# Étape 2: Création de la structure
print_msg "step" "Étape 2/7 : Création de la structure de fichiers"
echo ""

print_msg "info" "Création du répertoire d'installation..."
if sudo mkdir -p "$INSTALL_DIR"/{src,web,ssl,scripts,docs,examples,tests,images,tools} 2>> "$ERROR_LOG"; then
    print_msg "success" "Structure créée"
else
    print_msg "error" "Échec de la création de la structure"
fi

print_msg "info" "Configuration des permissions..."
if sudo chown -R $USER:$USER "$INSTALL_DIR" 2>> "$ERROR_LOG"; then
    print_msg "success" "Permissions configurées"
else
    print_msg "error" "Échec de la configuration des permissions"
fi

wait_for_continue

# Étape 3: Environnement virtuel Python
print_msg "step" "Étape 3/7 : Configuration de l'environnement virtuel Python"
echo ""

print_msg "info" "Création de l'environnement virtuel..."
if python3 -m venv "$VENV_DIR" 2>> "$ERROR_LOG"; then
    print_msg "success" "Environnement virtuel créé"
else
    print_msg "error" "Échec de la création de l'environnement virtuel"
fi

print_msg "info" "Activation de l'environnement virtuel..."
source "$VENV_DIR/bin/activate"

print_msg "info" "Mise à jour de pip..."
if python -m pip install --upgrade pip 2>> "$ERROR_LOG"; then
    print_msg "success" "pip mis à jour"
else
    print_msg "warning" "Échec de la mise à jour de pip (non critique)"
fi

print_msg "info" "Correction des permissions de l'environnement virtuel..."
if chmod -R u+rwx "$VENV_DIR/bin" 2>> "$ERROR_LOG"; then
    print_msg "success" "Permissions corrigées"
else
    print_msg "warning" "Impossible de corriger certaines permissions"
fi

wait_for_continue

# Étape 4: Installation des dépendances
print_msg "step" "Étape 4/7 : Installation des packages Python"
echo ""

# Créer requirements.txt s'il n'existe pas
if [ ! -f "$INSTALL_DIR/requirements.txt" ]; then
    print_msg "info" "Création de requirements.txt..."
    cat > "$INSTALL_DIR/requirements.txt" << EOF
fastapi==0.121.0
uvicorn[standard]==0.38.0
httpx==0.28.1
pydantic==2.12.3
python-multipart
itsdangerous==2.2.0
pytz==2025.2
pyyaml
EOF
fi

print_msg "info" "Installation des dépendances..."
if "$VENV_DIR/bin/pip" install -r "$INSTALL_DIR/requirements.txt" 2>> "$ERROR_LOG"; then
    print_msg "success" "Dépendances installées"
else
    print_msg "error" "Échec de l'installation des dépendances"
fi

wait_for_continue

# Étape 5: Configuration SSL
print_msg "step" "Étape 5/7 : Configuration SSL"
echo ""

if [ ! -f "$INSTALL_DIR/ssl/llmui.crt" ]; then
    print_msg "info" "Génération des certificats SSL..."
    if bash "$INSTALL_DIR/scripts/generate_ssl.sh" 2>> "$ERROR_LOG"; then
        print_msg "success" "Certificats SSL générés"
    else
        print_msg "warning" "Échec de la génération SSL (utilisera HTTP)"
    fi
else
    print_msg "info" "Certificats SSL déjà présents"
fi

wait_for_continue

# Étape 6: Configuration
print_msg "step" "Étape 6/7 : Configuration de l'application"
echo ""

if [ ! -f "$INSTALL_DIR/config.yaml" ]; then
    print_msg "info" "Création du fichier de configuration..."
    if [ -f "$INSTALL_DIR/config.yaml.example" ]; then
        cp "$INSTALL_DIR/config.yaml.example" "$INSTALL_DIR/config.yaml"
        print_msg "success" "Configuration créée depuis l'exemple"
    else
        print_msg "warning" "Fichier exemple non trouvé"
    fi
fi

wait_for_continue

# Étape 7: Démarrage des services
print_msg "step" "Étape 7/7 : Démarrage des services"
echo ""

print_msg "info" "Démarrage du serveur backend..."
cd "$INSTALL_DIR"
"$VENV_DIR/bin/python" src/llmui_backend.py &
BACKEND_PID=$!

if check_service_start "Backend" "curl -f http://localhost:8000/health 2>/dev/null"; then
    print_msg "success" "Backend démarré (PID: $BACKEND_PID)"
else
    print_msg "error" "Le backend n'a pas pu démarrer correctement"
    kill $BACKEND_PID 2>/dev/null || true
fi

print_msg "info" "Démarrage du serveur proxy..."
"$VENV_DIR/bin/python" src/llmui_proxy.py &
PROXY_PID=$!

if check_service_start "Proxy" "curl -f http://localhost:9000/ 2>/dev/null"; then
    print_msg "success" "Proxy démarré (PID: $PROXY_PID)"
else
    print_msg "error" "Le proxy n'a pas pu démarrer correctement"
    kill $PROXY_PID 2>/dev/null || true
fi

# Affichage du résumé
echo ""
echo "════════════════════════════════════════════════════════"
echo ""

if show_error_summary; then
    echo -e "${GREEN}🎉 LLMUI est maintenant installé et opérationnel !${NC}"
    echo ""
    echo -e "${BLUE}📝 Informations de connexion :${NC}"
    echo -e "   🌐 Interface Web : ${GREEN}http://localhost:9000${NC}"
    echo -e "   🔧 API Backend   : ${GREEN}http://localhost:8000${NC}"
    echo ""
    echo -e "${BLUE}📁 Fichiers importants :${NC}"
    echo -e "   • Configuration : ${YELLOW}$INSTALL_DIR/config.yaml${NC}"
    echo -e "   • Logs d'installation : ${YELLOW}$LOG_FILE${NC}"
    echo ""
    echo -e "${BLUE}🔧 Commandes utiles :${NC}"
    echo -e "   • Arrêter : ${YELLOW}killall python${NC}"
    echo -e "   • Redémarrer : ${YELLOW}$0${NC}"
    echo ""
else
    echo -e "${RED}⚠️  L'installation s'est terminée avec des erreurs${NC}"
    echo ""
    echo -e "${YELLOW}📋 Consultez les logs pour plus de détails :${NC}"
    echo -e "   • Erreurs : ${YELLOW}$ERROR_LOG${NC}"
    echo -e "   • Log complet : ${YELLOW}$LOG_FILE${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Vous pouvez tenter de corriger les erreurs et relancer :${NC}"
    echo -e "   ${YELLOW}$0${NC}"
    echo ""
fi

echo "════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}Appuyez sur ENTRÉE pour continuer et voir les logs détaillés...${NC}"
read -r

# Affichage des logs détaillés
echo ""
echo -e "${BLUE}📋 Log d'installation complet :${NC}"
echo "────────────────────────────────────────────────────────"
cat "$LOG_FILE"

if [ $INSTALL_ERRORS -gt 0 ]; then
    echo ""
    echo -e "${RED}📋 Erreurs détectées :${NC}"
    echo "────────────────────────────────────────────────────────"
    cat "$ERROR_LOG"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}Appuyez sur ENTRÉE pour terminer et retourner au terminal...${NC}"
read -r

deactivate 2>/dev/null || true

exit $INSTALL_ERRORS
