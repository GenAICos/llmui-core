# Guide de contribution - LLMUI Core v1.0.0

Merci de votre intérêt pour contribuer à LLMUI Core! Ce document explique comment participer au développement du projet.

---

## 📋 Table des matières

1. [Code de conduite](#code-de-conduite)
2. [Comment contribuer](#comment-contribuer)
3. [Standards de code](#standards-de-code)
4. [Processus de développement](#processus-de-développement)
5. [Tests](#tests)
6. [Documentation](#documentation)
7. [Droits d'auteur](#droits-dauteur)

---

## 🤝 Code de conduite

### Nos valeurs

Le projet LLMUI Core est développé dans un esprit de:
- **Respect** mutuel entre contributeurs
- **Collaboration** constructive
- **Souveraineté numérique** québécoise
- **Excellence technique**
- **Éthique** dans l'IA

### Comportements attendus

✅ **Faire**:
- Être respectueux et professionnel
- Fournir des critiques constructives
- Accepter les feedbacks avec ouverture
- Se concentrer sur ce qui est meilleur pour le projet
- Documenter clairement son code
- Respecter les décisions de l'équipe principale

❌ **Ne pas faire**:
- Utiliser un langage offensant
- Publier des informations privées d'autrui
- Harceler ou discriminer
- Faire du spam ou du trolling
- Ignorer les standards du projet

---

## 🚀 Comment contribuer

### Types de contributions

Nous acceptons les contributions suivantes:

1. **Rapports de bugs** 🐛
2. **Suggestions de fonctionnalités** ✨
3. **Améliorations de documentation** 📖
4. **Corrections de code** 🔧
5. **Nouvelles fonctionnalités** 🎁
6. **Optimisations de performance** ⚡
7. **Améliorations de sécurité** 🔐

### Avant de commencer

1. **Vérifier les issues existantes**
   ```bash
   # Chercher dans les issues GitHub
   https://github.com/votre-repo/llmui-core/issues
   ```

2. **Discuter de votre idée**
   - Pour les grandes fonctionnalités, créez d'abord une issue de discussion
   - Expliquez le problème et votre solution proposée
   - Attendez les retours de l'équipe

3. **Lire la documentation**
   - README.md
   - INSTALL.md
   - docs/ARCHITECTURE.md
   - Ce fichier (CONTRIBUTING.md)

---

## 💻 Standards de code

### Python

#### Style

Nous suivons **PEP 8** avec quelques adaptations:

```python
# ✅ BON
def process_user_data(user_id: str, data: dict) -> dict:
    """
    Traite les données utilisateur.
    
    Args:
        user_id: Identifiant unique de l'utilisateur
        data: Données à traiter
        
    Returns:
        Données traitées
    """
    if not user_id:
        raise ValueError("user_id requis")
    
    processed_data = {
        "id": user_id,
        "timestamp": datetime.now(),
        "data": clean_data(data)
    }
    
    return processed_data

# ❌ MAUVAIS
def process(u,d):
    # Pas de docstring
    if not u: raise ValueError("error")  # Une ligne complexe
    return {"id":u,"data":d}  # Pas d'espaces
```

#### Headers de fichiers

**OBLIGATOIRE** sur tous les fichiers Python:

```python
#!/usr/bin/env python3
"""
==============================================================================
Nom du fichier - Courte description
==============================================================================
Auteur: Francois Chalut
Date: YYYY-MM-DD
Version: X.Y.Z
Licence: AGPLv3 + common clause
==============================================================================
Description détaillée du module/script
==============================================================================
"""

import sys
import os
# ... autres imports
```

#### Logging

Utiliser le système de logging standard:

```python
import logging

logger = logging.getLogger(__name__)

# Niveaux appropriés
logger.debug("Détails pour debug")
logger.info("Information générale")
logger.warning("Attention requise")
logger.error("Erreur récupérable")
logger.critical("Erreur fatale")
```

#### Type hints

Utiliser les type hints Python 3.8+:

```python
from typing import List, Dict, Optional, Union

def get_user_conversations(
    user_id: str,
    limit: Optional[int] = 10
) -> List[Dict[str, Union[str, int]]]:
    """Récupère les conversations d'un utilisateur."""
    ...
```

### Shell/Bash

```bash
#!/bin/bash
# ==============================================================================
# Nom du script - Description
# ==============================================================================
# Auteur: Génie IA Centre Opérationnel Sécurité inc.
# Date: YYYY-MM-DD
# ==============================================================================

set -euo pipefail  # Erreurs strictes

# Variables en MAJUSCULES
INSTALL_DIR="/opt/llmui-core"
LOG_FILE="/var/log/llmui/install.log"

# Fonctions bien documentées
log_info() {
    echo "[INFO] $1" | tee -a "$LOG_FILE"
}

main() {
    log_info "Démarrage du script"
    # ...
}

main "$@"
```

### YAML

```yaml
# Configuration avec commentaires
server:
  host: "0.0.0.0"  # Écouter sur toutes interfaces
  port: 5000       # Port par défaut
  
  # Options SSL
  ssl_enabled: false
  ssl_cert: "/path/to/cert.pem"
```

---

## 🔄 Processus de développement

### 1. Fork et clone

```bash
# Fork sur GitHub, puis:
git clone https://github.com/VOTRE_USERNAME/llmui-core.git
cd llmui-core

# Ajouter l'upstream
git remote add upstream https://github.com/genie-ia/llmui-core.git
```

### 2. Créer une branche

```bash
# Format: type/courte-description
git checkout -b feature/consensus-voting
git checkout -b fix/memory-leak
git checkout -b docs/api-examples
```

**Types de branches**:
- `feature/` - Nouvelle fonctionnalité
- `fix/` - Correction de bug
- `docs/` - Documentation
- `refactor/` - Refactoring
- `perf/` - Optimisation
- `test/` - Tests

### 3. Développer

```bash
# Garder votre branche à jour
git fetch upstream
git rebase upstream/main

# Faire vos modifications
# Commiter régulièrement avec messages clairs
git add .
git commit -m "feat: ajouter système de vote pour consensus"
```

### 4. Format des commits

Utiliser le format **Conventional Commits**:

```
type(scope): description courte

Description détaillée optionnelle.

BREAKING CHANGE: description si applicable
Closes #123
```

**Types**:
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation
- `style`: Formatage (pas de changement de code)
- `refactor`: Refactoring
- `perf`: Optimisation de performance
- `test`: Ajout/modification de tests
- `chore`: Maintenance (dépendances, config)

**Exemples**:
```bash
git commit -m "feat(consensus): ajouter algorithme de vote pondéré"
git commit -m "fix(memory): corriger fuite mémoire dans RAG loader"
git commit -m "docs(api): ajouter exemples d'endpoints WebSocket"
git commit -m "perf(ollama): optimiser batch processing des requêtes"
```

### 5. Tests

```bash
# Exécuter les tests
python -m pytest tests/

# Avec coverage
python -m pytest --cov=src tests/

# Tests spécifiques
python -m pytest tests/test_consensus.py
```

### 6. Push et Pull Request

```bash
# Push de votre branche
git push origin feature/consensus-voting

# Créer la Pull Request sur GitHub
# Titre: Format conventional commit
# Description: Expliquer QUOI et POURQUOI
```

### Template de Pull Request

```markdown
## Description
[Décrivez vos changements]

## Type de changement
- [ ] Bug fix
- [ ] Nouvelle fonctionnalité
- [ ] Breaking change
- [ ] Documentation

## Motivation
[Pourquoi ce changement est nécessaire]

## Tests effectués
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Tests manuels

## Checklist
- [ ] Code suit les standards du projet
- [ ] Documentation mise à jour
- [ ] Tests passent
- [ ] Pas de warnings
- [ ] Commit messages suivent le format
```

---

## 🧪 Tests

### Structure des tests

```
tests/
├── unit/
│   ├── test_auth.py
│   ├── test_consensus.py
│   └── test_memory.py
├── integration/
│   ├── test_api.py
│   └── test_ollama.py
└── fixtures/
    └── sample_data.yaml
```

### Écrire des tests

```python
import pytest
from src.consensus import ConsensusEngine

class TestConsensusEngine:
    """Tests pour le moteur de consensus."""
    
    @pytest.fixture
    def engine(self):
        """Fixture: engine de test."""
        return ConsensusEngine(models=["phi3", "gemma2"])
    
    def test_vote_majority(self, engine):
        """Test du vote à majorité simple."""
        responses = [
            {"model": "phi3", "response": "A"},
            {"model": "gemma2", "response": "A"},
        ]
        
        result = engine.vote(responses)
        assert result == "A"
    
    def test_vote_weighted(self, engine):
        """Test du vote pondéré."""
        # ... test implementation
```

### Coverage minimum

- **Nouveau code**: 80% minimum
- **Code critique**: 95% minimum
- **Code existant**: Ne pas réduire le coverage

---

## 📖 Documentation

### Docstrings

Format Google Style:

```python
def process_consensus(
    responses: List[Dict],
    strategy: str = "majority"
) -> Dict[str, Any]:
    """
    Traite les réponses multiples pour obtenir un consensus.
    
    Cette fonction analyse les réponses de différents modèles LLM
    et applique une stratégie de consensus pour obtenir la meilleure
    réponse possible.
    
    Args:
        responses: Liste des réponses des modèles avec métadonnées.
            Chaque réponse doit contenir 'model' et 'response'.
        strategy: Stratégie de consensus à utiliser.
            Options: 'majority', 'weighted', 'merger'.
            Défaut: 'majority'.
    
    Returns:
        Dictionnaire contenant:
            - 'consensus': Réponse finale
            - 'confidence': Score de confiance (0-1)
            - 'models_used': Liste des modèles consultés
    
    Raises:
        ValueError: Si responses est vide ou strategy invalide.
        ConsensusError: Si impossible d'obtenir un consensus.
    
    Examples:
        >>> responses = [
        ...     {"model": "phi3", "response": "Paris"},
        ...     {"model": "gemma2", "response": "Paris"}
        ... ]
        >>> result = process_consensus(responses)
        >>> result['consensus']
        'Paris'
    
    Note:
        La stratégie 'weighted' nécessite des scores de confiance
        dans chaque réponse.
    """
    ...
```

### README et guides

- Utiliser Markdown
- Ajouter des exemples concrets
- Inclure des diagrammes si utile (mermaid, ASCII art)
- Maintenir la table des matières à jour

---

## ©️ Droits d'auteur

### Accord de contribution

**EN SOUMETTANT UNE CONTRIBUTION, VOUS ACCEPTEZ QUE**:

1. **Transfert de droits**: Vous transférez tous vos droits d'auteur sur la contribution à Génie IA Centre Opérationnel Sécurité inc.

2. **Licence**: Votre contribution sera soumise à la même licence propriétaire que le projet principal.

3. **Paternité**: Vous serez crédité dans les notes de version et dans AUTHORS.md, mais n'aurez aucun droit de propriété sur le code.

4. **Garanties**: Vous garantissez que:
   - La contribution est votre travail original
   - Vous avez le droit de la soumettre
   - Elle ne viole aucun droit de propriété intellectuelle

### Attribution

Les contributeurs sont crédités dans:
- `AUTHORS.md` - Liste des contributeurs
- Notes de version (CHANGELOG.md)
- Commentaires dans le code si contribution majeure

---

## 🎯 Priorités du projet

### Court terme (Q1 2025)

1. Stabilisation du système de consensus
2. Amélioration de la gestion mémoire
3. Optimisation des performances
4. Documentation API complète

### Moyen terme (2025)

1. Support de nouveaux modèles LLM
2. Interface web enrichie
3. Système de plugins
4. Déploiement multi-serveurs

### Long terme

1. AnimaOS intégration
2. Fédération de serveurs LLMUI
3. Marketplace de modèles
4. Support multilingue avancé

---

## 📞 Communication

### Channels

- **Issues GitHub**: Bugs et features
- **Discussions GitHub**: Questions générales
- **Email**: dev@genie-ia.ca (contributeurs actifs)

### Réponses

- **Issues**: 2-5 jours ouvrables
- **Pull Requests**: 1-2 semaines
- **Questions urgentes**: Email

---

## 🏆 Reconnaissance

Les contributeurs actifs peuvent recevoir:

1. **Crédit public** dans AUTHORS.md
2. **Mention** dans les releases
3. **Accès prioritaire** aux nouvelles features
4. **Invitation** aux réunions de développement (contributeurs réguliers)

---

## 📜 Historique

- **2025-11-21**: Version initiale du guide de contribution

---

## Questions?

N'hésitez pas à:
- Ouvrir une discussion sur GitHub
- Contacter l'équipe: contact@llmui.org
- Consulter la documentation: docs/

---

**Merci de contribuer à LLMUI Core!** 🙏

*Ensemble pour la souveraineté numérique du Québec* 🇨🇦

---

**Francois Chalut** - 2025
