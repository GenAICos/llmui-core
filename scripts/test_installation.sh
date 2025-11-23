#!/bin/bash
# -*- coding: utf-8 -*-
#
# LLMUI Core v2.0 - Script de test automatique complet
# Author: François Chalut
# Website: https://llmui.org
#
# Ce script teste l'intégralité de l'installation LLMUI Core

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Logs
LOG_FILE="/tmp/llmui_test_$(date +%Y%m%d_%H%M%S).log"

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

test_start() {
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -ne "${BLUE}[TEST $TESTS_TOTAL]${NC} $1... "
    echo "[TEST $TESTS_TOTAL] $1..." >> "$LOG_FILE"
}

test_pass() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log "${GREEN}✅ PASS${NC}"
}

test_fail() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    log "${RED}❌ FAIL${NC}"
    if [ -n "$1" ]; then
        log "${RED}   Raison: $1${NC}"
    fi
}

test_skip() {
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    log "${YELLOW}⚠️  SKIP${NC}"
    if [ -n "$1" ]; then
        log "${YELLOW}   Raison: $1${NC}"
    fi
}

# ============================================================================
# HEADER
# ============================================================================

clear
log ""
log "═══════════════════════════════════════════════════════════════"
log "  LLMUI CORE v2.0 - TEST AUTOMATIQUE COMPLET"
log "═══════════════════════════════════════════════════════════════"
log "  Date: $(date)"
log "  Log: $LOG_FILE"
log "═══════════════════════════════════════════════════════════════"
log ""

# ============================================================================
# SECTION 1: TESTS SYSTÈME
# ============================================================================

log "${BLUE}━━━ SECTION 1: TESTS SYSTÈME ━━━${NC}"
log ""

# Test 1.1: OS
test_start "Vérification du système d'exploitation"
if [[ -f /etc/os-release ]]; then
    OS_NAME=$(grep "^NAME=" /etc/os-release | cut -d'"' -f2)
    OS_VERSION=$(grep "^VERSION=" /etc/os-release | cut -d'"' -f2)
    log "   OS: $OS_NAME $OS_VERSION" >> "$LOG_FILE"
    test_pass
else
    test_fail "Impossible de détecter l'OS"
fi

# Test 1.2: Architecture
test_start "Vérification de l'architecture"
ARCH=$(uname -m)
if [[ "$ARCH" == "x86_64" ]] || [[ "$ARCH" == "aarch64" ]]; then
    log "   Architecture: $ARCH" >> "$LOG_FILE"
    test_pass
else
    test_fail "Architecture non supportée: $ARCH"
fi

# Test 1.3: RAM
test_start "Vérification de la RAM"
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -ge 8 ]; then
    log "   RAM totale: ${TOTAL_RAM}GB" >> "$LOG_FILE"
    test_pass
else
    test_fail "RAM insuffisante: ${TOTAL_RAM}GB (minimum 8GB recommandé)"
fi

# Test 1.4: Espace disque
test_start "Vérification de l'espace disque"
DISK_AVAIL=$(df -BG /opt 2>/dev/null | awk 'NR==2 {print $4}' | tr -d 'G')
if [ "$DISK_AVAIL" -ge 10 ]; then
    log "   Espace disponible: ${DISK_AVAIL}GB" >> "$LOG_FILE"
    test_pass
else
    test_fail "Espace disque insuffisant: ${DISK_AVAIL}GB (minimum 10GB)"
fi

log ""

# ============================================================================
# SECTION 2: TESTS DÉPENDANCES
# ============================================================================

log "${BLUE}━━━ SECTION 2: TESTS DÉPENDANCES ━━━${NC}"
log ""

# Test 2.1: Python
test_start "Vérification de Python"
if command -v python3 &> /dev/null; then
    PY_VERSION=$(python3 --version | cut -d' ' -f2)
    log "   Python version: $PY_VERSION" >> "$LOG_FILE"
    test_pass
else
    test_fail "Python 3 non trouvé"
fi

# Test 2.2: pip
test_start "Vérification de pip"
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version | cut -d' ' -f2)
    log "   pip version: $PIP_VERSION" >> "$LOG_FILE"
    test_pass
else
    test_fail "pip3 non trouvé"
fi

# Test 2.3: Ollama
test_start "Vérification d'Ollama"
if command -v ollama &> /dev/null; then
    OLLAMA_VERSION=$(ollama --version 2>&1 | head -1)
    log "   Ollama version: $OLLAMA_VERSION" >> "$LOG_FILE"
    test_pass
else
    test_fail "Ollama non trouvé"
fi

# Test 2.4: Redis (optionnel)
test_start "Vérification de Redis"
if command -v redis-cli &> /dev/null; then
    REDIS_VERSION=$(redis-cli --version | cut -d' ' -f2)
    log "   Redis version: $REDIS_VERSION" >> "$LOG_FILE"
    test_pass
else
    test_skip "Redis non installé (optionnel)"
fi

log ""

# ============================================================================
# SECTION 3: TESTS INSTALLATION
# ============================================================================

log "${BLUE}━━━ SECTION 3: TESTS INSTALLATION ━━━${NC}"
log ""

INSTALL_DIR="/opt/llmui-core"
DATA_DIR="/var/lib/llmui"
LOG_DIR="/var/log/llmui"

# Test 3.1: Répertoire d'installation
test_start "Vérification du répertoire d'installation"
if [ -d "$INSTALL_DIR" ]; then
    test_pass
else
    test_fail "Répertoire $INSTALL_DIR non trouvé"
fi

# Test 3.2: Fichiers Python
test_start "Vérification des fichiers Python"
REQUIRED_FILES=(
    "$INSTALL_DIR/src/__init__.py"
    "$INSTALL_DIR/src/llmui_backend.py"
    "$INSTALL_DIR/src/llmui_proxy.py"
    "$INSTALL_DIR/src/memory.py"
)
ALL_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        ALL_EXIST=false
        log "   Manquant: $file" >> "$LOG_FILE"
    fi
done
if $ALL_EXIST; then
    test_pass
else
    test_fail "Certains fichiers Python sont manquants"
fi

# Test 3.3: Fichiers Web
test_start "Vérification des fichiers Web"
WEB_FILES=(
    "$INSTALL_DIR/web/index.html"
    "$INSTALL_DIR/web/js/llmui-main.js"
    "$INSTALL_DIR/web/css/llmui-styles.css"
)
ALL_EXIST=true
for file in "${WEB_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        ALL_EXIST=false
        log "   Manquant: $file" >> "$LOG_FILE"
    fi
done
if $ALL_EXIST; then
    test_pass
else
    test_fail "Certains fichiers Web sont manquants"
fi

# Test 3.4: Scripts
test_start "Vérification des scripts"
SCRIPTS=(
    "$INSTALL_DIR/scripts/install.sh"
    "$INSTALL_DIR/scripts/uninstall.sh"
    "$INSTALL_DIR/scripts/start.sh"
)
ALL_EXEC=true
for script in "${SCRIPTS[@]}"; do
    if [ ! -x "$script" ]; then
        ALL_EXEC=false
        log "   Non exécutable: $script" >> "$LOG_FILE"
    fi
done
if $ALL_EXEC; then
    test_pass
else
    test_fail "Certains scripts ne sont pas exécutables"
fi

# Test 3.5: Environnement virtuel Python
test_start "Vérification de l'environnement virtuel Python"
if [ -d "$INSTALL_DIR/venv" ]; then
    test_pass
else
    test_fail "venv non trouvé"
fi

# Test 3.6: Dépendances Python
test_start "Vérification des dépendances Python"
if [ -f "$INSTALL_DIR/venv/bin/python" ]; then
    FASTAPI_INSTALLED=$("$INSTALL_DIR/venv/bin/python" -c "import fastapi" 2>/dev/null && echo "yes" || echo "no")
    if [ "$FASTAPI_INSTALLED" == "yes" ]; then
        test_pass
    else
        test_fail "FastAPI non installé dans venv"
    fi
else
    test_fail "Python venv non trouvé"
fi

log ""

# ============================================================================
# SECTION 4: TESTS BASE DE DONNÉES
# ============================================================================

log "${BLUE}━━━ SECTION 4: TESTS BASE DE DONNÉES ━━━${NC}"
log ""

# Test 4.1: Existence base de données
test_start "Vérification de la base de données SQLite"
if [ -f "$DATA_DIR/llmui.db" ]; then
    test_pass
else
    test_fail "Base de données non trouvée"
fi

# Test 4.2: Permissions base de données
test_start "Vérification des permissions de la base de données"
if [ -f "$DATA_DIR/llmui.db" ]; then
    PERMS=$(stat -c "%a" "$DATA_DIR/llmui.db")
    if [ "$PERMS" == "660" ] || [ "$PERMS" == "600" ]; then
        test_pass
    else
        test_fail "Permissions incorrectes: $PERMS (attendu: 660 ou 600)"
    fi
else
    test_skip "Base de données non trouvée"
fi

# Test 4.3: Tables SQLite
test_start "Vérification des tables SQLite"
if [ -f "$DATA_DIR/llmui.db" ]; then
    TABLES=$(sqlite3 "$DATA_DIR/llmui.db" ".tables" 2>/dev/null || echo "")
    if [[ "$TABLES" == *"conversations"* ]] && [[ "$TABLES" == *"stats"* ]]; then
        test_pass
    else
        test_fail "Tables manquantes"
    fi
else
    test_skip "Base de données non trouvée"
fi

log ""

# ============================================================================
# SECTION 5: TESTS SERVICES
# ============================================================================

log "${BLUE}━━━ SECTION 5: TESTS SERVICES ━━━${NC}"
log ""

# Test 5.1: Service systemd backend
test_start "Vérification du service llmui-backend"
if systemctl is-active --quiet llmui-backend; then
    test_pass
else
    test_fail "Service llmui-backend non actif"
fi

# Test 5.2: Service systemd proxy
test_start "Vérification du service llmui-proxy"
if systemctl is-active --quiet llmui-proxy; then
    test_pass
else
    test_fail "Service llmui-proxy non actif"
fi

# Test 5.3: Service Ollama
test_start "Vérification du service Ollama"
if systemctl is-active --quiet ollama 2>/dev/null; then
    test_pass
else
    # Ollama peut ne pas être un service systemd
    if pgrep -x "ollama" > /dev/null; then
        test_pass
    else
        test_fail "Service Ollama non actif"
    fi
fi

log ""

# ============================================================================
# SECTION 6: TESTS RÉSEAU
# ============================================================================

log "${BLUE}━━━ SECTION 6: TESTS RÉSEAU ━━━${NC}"
log ""

# Test 6.1: Port backend (5000)
test_start "Vérification du port backend (5000)"
if netstat -tuln 2>/dev/null | grep -q ":5000 " || ss -tuln 2>/dev/null | grep -q ":5000 "; then
    test_pass
else
    test_fail "Port 5000 non ouvert"
fi

# Test 6.2: Port proxy (8000)
test_start "Vérification du port proxy (8000)"
if netstat -tuln 2>/dev/null | grep -q ":8000 " || ss -tuln 2>/dev/null | grep -q ":8000 "; then
    test_pass
else
    test_fail "Port 8000 non ouvert"
fi

# Test 6.3: Port Ollama (11434)
test_start "Vérification du port Ollama (11434)"
if netstat -tuln 2>/dev/null | grep -q ":11434 " || ss -tuln 2>/dev/null | grep -q ":11434 "; then
    test_pass
else
    test_fail "Port 11434 non ouvert"
fi

# Test 6.4: Port Redis (6379) - optionnel
test_start "Vérification du port Redis (6379)"
if netstat -tuln 2>/dev/null | grep -q ":6379 " || ss -tuln 2>/dev/null | grep -q ":6379 "; then
    test_pass
else
    test_skip "Redis non actif (optionnel)"
fi

log ""

# ============================================================================
# SECTION 7: TESTS API
# ============================================================================

log "${BLUE}━━━ SECTION 7: TESTS API ━━━${NC}"
log ""

# Test 7.1: Health endpoint backend
test_start "Test de l'endpoint /health"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5000/health 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    test_pass
else
    test_fail "Code HTTP: $HTTP_CODE (attendu: 200)"
fi

# Test 7.2: Models endpoint
test_start "Test de l'endpoint /api/models"
MODELS_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5000/api/models 2>/dev/null)
HTTP_CODE=$(echo "$MODELS_RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    test_pass
else
    test_fail "Code HTTP: $HTTP_CODE (attendu: 200)"
fi

# Test 7.3: Timeout levels endpoint
test_start "Test de l'endpoint /api/timeout-levels"
TIMEOUT_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5000/api/timeout-levels 2>/dev/null)
HTTP_CODE=$(echo "$TIMEOUT_RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    test_pass
else
    test_fail "Code HTTP: $HTTP_CODE (attendu: 200)"
fi

# Test 7.4: Stats endpoint
test_start "Test de l'endpoint /api/stats"
STATS_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5000/api/stats 2>/dev/null)
HTTP_CODE=$(echo "$STATS_RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    test_pass
else
    test_fail "Code HTTP: $HTTP_CODE (attendu: 200)"
fi

# Test 7.5: Proxy - page d'accueil
test_start "Test de l'interface web via proxy"
WEB_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8000/ 2>/dev/null)
HTTP_CODE=$(echo "$WEB_RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    test_pass
else
    test_fail "Code HTTP: $HTTP_CODE (attendu: 200)"
fi

log ""

# ============================================================================
# SECTION 8: TESTS OLLAMA
# ============================================================================

log "${BLUE}━━━ SECTION 8: TESTS OLLAMA ━━━${NC}"
log ""

# Test 8.1: Ollama list
test_start "Liste des modèles Ollama"
if command -v ollama &> /dev/null; then
    MODEL_COUNT=$(ollama list 2>/dev/null | tail -n +2 | wc -l)
    if [ "$MODEL_COUNT" -ge 4 ]; then
        log "   Modèles trouvés: $MODEL_COUNT" >> "$LOG_FILE"
        test_pass
    else
        test_fail "Modèles insuffisants: $MODEL_COUNT (minimum 4)"
    fi
else
    test_skip "Ollama non disponible"
fi

# Test 8.2: Modèles requis
test_start "Vérification des modèles requis"
if command -v ollama &> /dev/null; then
    REQUIRED_MODELS=("granite3.1:2b" "phi3:3.8b" "mistral:7b" "qwen2.5:3b")
    ALL_PRESENT=true
    for model in "${REQUIRED_MODELS[@]}"; do
        if ! ollama list 2>/dev/null | grep -q "$model"; then
            ALL_PRESENT=false
            log "   Manquant: $model" >> "$LOG_FILE"
        fi
    done
    if $ALL_PRESENT; then
        test_pass
    else
        test_fail "Certains modèles requis sont manquants"
    fi
else
    test_skip "Ollama non disponible"
fi

log ""

# ============================================================================
# SECTION 9: TESTS PERMISSIONS
# ============================================================================

log "${BLUE}━━━ SECTION 9: TESTS PERMISSIONS ━━━${NC}"
log ""

# Test 9.1: Utilisateur llmui
test_start "Vérification de l'utilisateur système llmui"
if id -u llmui &>/dev/null; then
    test_pass
else
    test_fail "Utilisateur llmui non trouvé"
fi

# Test 9.2: Propriétaire des fichiers
test_start "Vérification du propriétaire des fichiers"
if [ -d "$INSTALL_DIR" ]; then
    OWNER=$(stat -c "%U" "$INSTALL_DIR")
    if [ "$OWNER" == "llmui" ] || [ "$OWNER" == "root" ]; then
        test_pass
    else
        test_fail "Propriétaire incorrect: $OWNER"
    fi
else
    test_skip "Répertoire d'installation non trouvé"
fi

# Test 9.3: Permissions logs
test_start "Vérification des permissions des logs"
if [ -d "$LOG_DIR" ]; then
    PERMS=$(stat -c "%a" "$LOG_DIR")
    if [ "$PERMS" == "755" ] || [ "$PERMS" == "750" ]; then
        test_pass
    else
        test_fail "Permissions logs incorrectes: $PERMS"
    fi
else
    test_skip "Répertoire de logs non trouvé"
fi

log ""

# ============================================================================
# SECTION 10: TESTS FONCTIONNELS
# ============================================================================

log "${BLUE}━━━ SECTION 10: TESTS FONCTIONNELS ━━━${NC}"
log ""

# Test 10.1: Génération simple
test_start "Test de génération simple"
SIMPLE_TEST=$(curl -s -X POST http://localhost:5000/api/simple-generate \
    -H "Content-Type: application/json" \
    -d '{
        "model": "qwen2.5:3b",
        "prompt": "Say hello in one word",
        "session_id": "test_session",
        "timeout_level": "low"
    }' 2>/dev/null)

if echo "$SIMPLE_TEST" | grep -q '"success":true'; then
    test_pass
else
    test_fail "Génération simple échouée"
fi

# Test 10.2: Statistiques
test_start "Test de récupération des statistiques"
STATS_TEST=$(curl -s http://localhost:5000/api/stats 2>/dev/null)
if echo "$STATS_TEST" | grep -q '"success":true'; then
    test_pass
else
    test_fail "Récupération des statistiques échouée"
fi

# Test 10.3: Interface web
test_start "Test du chargement de l'interface web"
WEB_TEST=$(curl -s http://localhost:8000/ 2>/dev/null)
if echo "$WEB_TEST" | grep -q "LLMUI Core"; then
    test_pass
else
    test_fail "Interface web non chargée correctement"
fi

log ""

# ============================================================================
# SECTION 11: TESTS LOGS
# ============================================================================

log "${BLUE}━━━ SECTION 11: TESTS LOGS ━━━${NC}"
log ""

# Test 11.1: Fichier log backend
test_start "Vérification du fichier log backend"
if [ -f "$LOG_DIR/backend.log" ]; then
    test_pass
else
    test_fail "Fichier backend.log non trouvé"
fi

# Test 11.2: Fichier log proxy
test_start "Vérification du fichier log proxy"
if [ -f "$LOG_DIR/proxy.log" ]; then
    test_pass
else
    test_fail "Fichier proxy.log non trouvé"
fi

# Test 11.3: Erreurs dans les logs
test_start "Recherche d'erreurs critiques dans les logs"
if [ -f "$LOG_DIR/backend.log" ]; then
    ERROR_COUNT=$(grep -i "error\|exception\|traceback" "$LOG_DIR/backend.log" 2>/dev/null | wc -l)
    if [ "$ERROR_COUNT" -eq 0 ]; then
        test_pass
    else
        test_fail "$ERROR_COUNT erreur(s) trouvée(s) dans les logs"
    fi
else
    test_skip "Logs backend non trouvés"
fi

log ""

# ============================================================================
# SECTION 12: TESTS SÉCURITÉ
# ============================================================================

log "${BLUE}━━━ SECTION 12: TESTS SÉCURITÉ ━━━${NC}"
log ""

# Test 12.1: Configuration admin
test_start "Vérification du fichier de configuration admin"
if [ -f "/etc/llmui/admin.conf" ]; then
    test_pass
else
    test_fail "Fichier admin.conf non trouvé"
fi

# Test 12.2: Permissions admin.conf
test_start "Vérification des permissions admin.conf"
if [ -f "/etc/llmui/admin.conf" ]; then
    PERMS=$(stat -c "%a" "/etc/llmui/admin.conf")
    if [ "$PERMS" == "600" ]; then
        test_pass
    else
        test_fail "Permissions admin.conf: $PERMS (attendu: 600)"
    fi
else
    test_skip "Fichier admin.conf non trouvé"
fi

# Test 12.3: SSL (si activé)
test_start "Vérification des certificats SSL"
if [ -f "$INSTALL_DIR/ssl/llmui.crt" ] && [ -f "$INSTALL_DIR/ssl/llmui.key" ]; then
    test_pass
else
    test_skip "SSL non configuré"
fi

log ""

# ============================================================================
# RÉSUMÉ FINAL
# ============================================================================

log ""
log "═══════════════════════════════════════════════════════════════"
log "  RÉSUMÉ DES TESTS"
log "═══════════════════════════════════════════════════════════════"
log ""
log "  Total de tests:     ${BLUE}$TESTS_TOTAL${NC}"
log "  Tests réussis:      ${GREEN}$TESTS_PASSED ✅${NC}"
log "  Tests échoués:      ${RED}$TESTS_FAILED ❌${NC}"
log "  Tests ignorés:      ${YELLOW}$TESTS_SKIPPED ⚠️${NC}"
log ""

# Calcul du pourcentage de réussite
if [ $TESTS_TOTAL -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; ($TESTS_PASSED * 100) / $TESTS_TOTAL" | bc)
    log "  Taux de réussite:   ${SUCCESS_RATE}%"
    log ""
    
    if [ "$SUCCESS_RATE" == "100.0" ]; then
        log "  ${GREEN}🎉 EXCELLENT! Tous les tests sont passés!${NC}"
    elif (( $(echo "$SUCCESS_RATE >= 90" | bc -l) )); then
        log "  ${GREEN}✅ TRÈS BON! Installation fonctionnelle${NC}"
    elif (( $(echo "$SUCCESS_RATE >= 75" | bc -l) )); then
        log "  ${YELLOW}⚠️  BON - Quelques améliorations possibles${NC}"
    elif (( $(echo "$SUCCESS_RATE >= 50" | bc -l) )); then
        log "  ${YELLOW}⚠️  MOYEN - Attention requise${NC}"
    else
        log "  ${RED}❌ CRITIQUE - Installation incomplète${NC}"
    fi
fi

log ""
log "═══════════════════════════════════════════════════════════════"
log "  Log complet sauvegardé dans: $LOG_FILE"
log "═══════════════════════════════════════════════════════════════"
log ""

# Exit code basé sur le nombre d'échecs
if [ $TESTS_FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi