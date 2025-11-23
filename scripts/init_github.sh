#!/bin/bash
# Script d'initialisation Git et préparation GitHub
# LLMUI Core v2.0

cd ~/Bureau/projet/llmui-core

# ============================================================================
# ÉTAPE 1: CORRECTIONS PRÉALABLES
# ============================================================================

echo "📝 Étape 1: Corrections préalables..."

# 1.1 Créer config.yaml.example
cp config.yaml config.yaml.example
echo "✅ config.yaml.example créé"

# 1.2 Corriger les modèles dans config.yaml
sed -i 's/- "gemma2:2b"/- "granite3.1:2b"/' config.yaml
sed -i 's/- "qwen2.5:4b"/- "qwen2.5:3b"/' config.yaml
sed -i 's/merger_model: "qwen2.5:8b"/merger_model: "mistral:7b"/' config.yaml
sed -i 's/simple_model: "qwen2.5:8b"/simple_model: "qwen2.5:3b"/' config.yaml
echo "✅ Modèles Ollama corrigés"

# 1.3 Ajouter config.yaml au .gitignore
if ! grep -q "^config.yaml$" .gitignore; then
    sed -i '/# Configuration (local)/a config.yaml' .gitignore
    echo "✅ config.yaml ajouté au .gitignore"
fi

# 1.4 Retirer !config.yaml
sed -i '/^!config\.yaml$/d' .gitignore
echo "✅ .gitignore nettoyé"

echo ""

# ============================================================================
# ÉTAPE 2: CONFIGURATION GIT
# ============================================================================

echo "📝 Étape 2: Configuration Git..."

git config --global user.name "François Chalut"
git config --global user.email "contact@llmui.org"
echo "✅ Identité Git configurée"

git init
echo "✅ Dépôt Git initialisé"

git branch -M main
echo "✅ Branche main créée"

echo ""

# ============================================================================
# ÉTAPE 3: PREMIER COMMIT
# ============================================================================

echo "📝 Étape 3: Premier commit..."

git add .
echo "✅ Fichiers ajoutés"

git commit -m "Initial commit - LLMUI Core v2.0.0

🎉 Premier commit du projet LLMUI Core v2.0

✨ Fonctionnalités:
- Mode Simple: Conversation directe avec un LLM
- Mode Consensus: Fusion intelligente de plusieurs modèles
- Mémoire hybride avec compression
- Support multi-fichiers avec drag & drop
- Persistance SQLite
- Support SSL/HTTPS
- Interface bilingue FR/EN (i18n)
- Installation guidée avec interface UI
- Tests automatiques complets (70+ tests)

📦 Structure:
- Backend FastAPI (src/)
- Interface web moderne (web/)
- Scripts d'installation (scripts/)
- Documentation complète (docs/)
- Tests unitaires (tests/)
- Exemples d'utilisation (examples/)

🔧 Technologies:
- Python 3.8+ avec FastAPI
- SQLite pour la persistance
- Ollama pour les LLMs locaux
- JavaScript vanilla avec i18n
- CSS moderne avec dark mode

👤 Auteur: François Chalut
🌐 Website: https://llmui.org
📧 Email: contact@llmui.org
📜 Licence: MIT"

echo "✅ Commit initial créé"
echo ""

# ============================================================================
# RÉSUMÉ
# ============================================================================

echo "═══════════════════════════════════════════════════════════"
echo "  ✅ INITIALISATION TERMINÉE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 Statistiques:"
echo "   Fichiers commités: $(git ls-files | wc -l)"
echo ""
echo "📌 PROCHAINES ÉTAPES:"
echo ""
echo "1️⃣  Créer le dépôt sur GitHub:"
echo "   https://github.com/new"
echo "   - Name: llmui-core"
echo "   - Public"
echo "   - Ne PAS initialiser avec README"
echo ""
echo "2️⃣  Lier et pousser (remplacez YOUR_USERNAME):"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/llmui-core.git"
echo "   git push -u origin main"
echo ""
echo "3️⃣  Ajouter les topics sur GitHub:"
echo "   llm, ollama, ai, consensus, fastapi, python, i18n, sqlite"
echo ""
echo "4️⃣  Créer la release v2.0.0"
echo ""
echo "═══════════════════════════════════════════════════════════"
