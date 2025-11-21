#!/bin/bash
"""
==============================================================================
Script de nettoyage et réorganisation - LLMUI Core v2.0
==============================================================================
Auteur: Génie IA Centre Opérationnel Sécurité inc.
Date: 2025-11-21
==============================================================================
Ce script nettoie et réorganise la structure du projet pour GitHub
==============================================================================
"""

set -euo pipefail

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║              🧹 NETTOYAGE STRUCTURE LLMUI CORE V2.0 🧹                   ║
║                                                                          ║
║        Génie IA Centre Opérationnel Sécurité inc.                        ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
EOF

echo ""
log_warning "Ce script va réorganiser la structure du projet"
log_warning "Une sauvegarde sera créée automatiquement"
echo ""
read -p "Continuer? (o/N): " confirm

if [[ ! $confirm =~ ^[Oo]$ ]]; then
    log_info "Annulé par l'utilisateur"
    exit 0
fi

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "README.md" ] || [ ! -d "src" ]; then
    log_error "Ce script doit être exécuté depuis la racine de llmui-core"
    exit 1
fi

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "ÉTAPE 1: Création de la sauvegarde"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BACKUP_FILE="$HOME/llmui-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
log_info "Création de $BACKUP_FILE..."
tar -czf "$BACKUP_FILE" . 2>/dev/null || {
    log_error "Échec de la sauvegarde"
    exit 1
}
log_success "Sauvegarde créée: $BACKUP_FILE"

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "ÉTAPE 2: Suppression des doublons de documentation"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Doublons documentation
FILES_TO_REMOVE=(
    "README_INSTALLATION.md"
    "docs/readme_fr.md"
    "docs/quick_start_guide.md"
    "docs/guide_installation_rapide.md"
    "docs/PACKAGE_SUMMARY.md"
)

for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        log_info "Suppression: $file"
        rm -f "$file"
    fi
done

log_success "Doublons de documentation supprimés"

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "ÉTAPE 3: Suppression des anciens scripts d'installation"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

OLD_SCRIPTS=(
    "install_ai.sh"
    "install_assistant.py"
    "scripts/ia_install.sh"
    "tools/installer.html"
    "src/init_github.sh"
)

# GARDER ces scripts - méthode d'installation alternative valide:
# - scripts/install_interactive.sh (installation guidée)
# - scripts/install.sh (installation classique)
# - scripts/install_backend.py (backend Python)

for script in "${OLD_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        log_info "Suppression: $script"
        rm -f "$script"
    fi
done

log_success "Anciens scripts supprimés"

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "ÉTAPE 4: Déplacement des fichiers"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# CHANGELOG à la racine
if [ -f "docs/CHANGELOG.md" ] && [ ! -f "CHANGELOG.md" ]; then
    log_info "Déplacement: docs/CHANGELOG.md → ./CHANGELOG.md"
    mv docs/CHANGELOG.md ./
fi

# Renommer config_guide
if [ -f "docs/config_guide.md" ]; then
    log_info "Renommage: docs/config_guide.md → docs/CONFIGURATION.md"
    mv docs/config_guide.md docs/CONFIGURATION.md
fi

# Déplacer modules Python
if [ -f "web/prompt_enrichment.py" ]; then
    log_info "Déplacement: web/prompt_enrichment.py → src/"
    mv web/prompt_enrichment.py src/ 2>/dev/null || true
fi

if [ -f "web/stats_module.py" ]; then
    log_info "Suppression doublon: web/stats_module.py"
    rm -f web/stats_module.py
fi

# Déplacer utilitaires
if [ -f "create_knowledge_db.py" ]; then
    log_info "Déplacement: create_knowledge_db.py → scripts/"
    mv create_knowledge_db.py scripts/
fi

log_success "Fichiers déplacés"

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "ÉTAPE 5: Réorganisation des images"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "images" ]; then
    log_info "Création: web/assets/screenshots/"
    mkdir -p web/assets/screenshots
    
    log_info "Déplacement des images..."
    mv images/* web/assets/screenshots/ 2>/dev/null || true
    
    log_info "Suppression du dossier images/"
    rmdir images 2>/dev/null || true
    
    log_success "Images réorganisées"
else
    log_warning "Dossier images/ non trouvé"
fi

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "ÉTAPE 6: Nettoyage du cache Python"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_info "Suppression des __pycache__..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

log_info "Suppression des .pyc..."
find . -type f -name "*.pyc" -delete 2>/dev/null || true

log_success "Cache Python nettoyé"

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "ÉTAPE 7: Création du .gitignore"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f ".gitignore" ]; then
    log_info "Création de .gitignore..."
    cat > .gitignore << 'GITIGNORE_EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
venv/
env/
ENV/
.venv/

# LLMUI Core data
data/
logs/
backups/
sessions/
cache/
*.db
*.db-journal
*.db-wal

# Configuration sensible
config.yaml
!config.yaml.example
.env
*.key
*.pem
ssl/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.project
.pydevproject

# OS
.DS_Store
Thumbs.db
*.bak

# Logs
*.log
*.log.*

# Temp
*.tmp
tmp/
temp/
*.temp

# Tests
.pytest_cache/
.coverage
htmlcov/
.tox/

# Backup
*.tar.gz
*.zip
*.bak
GITIGNORE_EOF
    log_success ".gitignore créé"
else
    log_warning ".gitignore existe déjà, non modifié"
fi

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "ÉTAPE 8: Suppression dossier tools/ si vide"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "tools" ]; then
    if [ -z "$(ls -A tools)" ]; then
        log_info "Suppression du dossier tools/ (vide)"
        rmdir tools
        log_success "Dossier tools/ supprimé"
    else
        log_warning "Dossier tools/ non vide, conservation"
    fi
fi

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "ÉTAPE 9: Génération du rapport"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
log_success "✨ NETTOYAGE TERMINÉ AVEC SUCCÈS ✨"
echo ""

echo "📊 Résumé:"
echo "  • Sauvegarde: $BACKUP_FILE"
echo "  • Doublons supprimés: ${#FILES_TO_REMOVE[@]} fichiers"
echo "  • Scripts obsolètes supprimés: ${#OLD_SCRIPTS[@]} fichiers"
echo "  • Fichiers déplacés et réorganisés"
echo "  • Cache Python nettoyé"
echo "  • .gitignore créé"
echo ""

echo "📁 Structure actuelle:"
tree -L 2 -I '__pycache__|*.pyc|venv|env' 2>/dev/null || {
    echo "  (Installez 'tree' pour voir la structure: sudo apt install tree)"
    ls -lh
}

echo ""
echo "🎯 Prochaines étapes:"
echo "  1. Vérifier la structure: tree -L 2"
echo "  2. Tester les scripts Andy: sudo bash andy_setup.sh"
echo "  3. Créer documentation manquante dans docs/"
echo "  4. Commit Git:"
echo "     git add ."
echo "     git commit -m 'refactor: nettoyage structure v2.0'"
echo ""

echo "💡 Astuce: Si besoin de restaurer, utilisez:"
echo "   tar -xzf $BACKUP_FILE"
echo ""

log_success "Script terminé!"
