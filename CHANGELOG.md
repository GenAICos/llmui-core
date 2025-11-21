# Changelog - LLMUI Core

Tous les changements notables de ce projet sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [Non publié]

### À venir
- Support de modèles LLM additionnels (Claude, GPT-4, etc.)
- Interface de configuration graphique
- API WebSocket améliorée
- Système de plugins

---

## [0.5.0] - 2025-11-21

### 🎉 Nouvelle version majeure

Cette version représente une refonte complète de LLMUI Core avec l'introduction d'**Andy**, l'assistant DevOps autonome.

### ✨ Ajouté

#### Andy - Assistant DevOps
- `andy_installer.py`: Installation automatisée complète du système
  - Détection automatique du gestionnaire de paquets (apt/dnf/yum)
  - Installation d'Ollama et téléchargement automatique des modèles
  - Configuration des services systemd
  - Configuration Nginx avec sécurité renforcée
  - Configuration automatique du pare-feu (UFW/firewalld)
  - Base de données SQLite pour traçabilité complète
  
- `andy_deploy_source.py`: Déploiement automatisé des fichiers source
  - Support du clonage Git
  - Configuration automatique des permissions
  - Validation de la structure de fichiers
  
- `andy_start_services.py`: Gestion automatisée des services
  - Démarrage séquencé des services
  - Vérification de l'état des services
  - Tests de connectivité
  - Affichage de l'URL d'accès
  
- `andy_setup.sh`: Menu interactif complet
  - Installation complète en un clic
  - Installation par étapes
  - Vérification de l'installation
  - Consultation des logs
  - Accès à la documentation

#### Documentation
- `README.md`: Documentation principale complète
- `INSTALL.md`: Guide d'installation détaillé (manuel et automatique)
- `README_ANDY.md`: Documentation complète d'Andy
- `ANDY_INTERACTIVE.md`: Guide du menu interactif
- `CONTRIBUTING.md`: Guide de contribution
- `LICENSE`: Licence propriétaire détaillée
- `CHANGELOG.md`: Ce fichier

#### Infrastructure
- Services systemd sécurisés avec isolation
  - `llmui-backend.service`
  - `llmui-proxy.service`
- Configuration Nginx optimisée
  - Support WebSocket
  - Headers de sécurité
  - Reverse proxy configuré
- Pare-feu configuré automatiquement
- Structure de répertoires sécurisée
- Environnement virtuel Python isolé

### 🔧 Modifié

#### Architecture
- Refonte complète du processus d'installation
- Séparation claire backend/proxy/frontend
- Amélioration de la gestion des dépendances
- Standardisation des chemins (/opt/llmui-core/)

#### Sécurité
- Permissions strictes sur les fichiers sensibles
- Isolation des services avec systemd
- Headers de sécurité Nginx renforcés
- Configuration pare-feu automatique
- Chiffrement des sessions

#### Performance
- Optimisation du démarrage des services
- Timeouts configurables
- Gestion améliorée des connexions
- Cache optimisé

### 🐛 Corrigé

- Problèmes de démarrage des services systemd
- Erreurs de permissions sur les répertoires
- Problèmes d'encodage UTF-8
- Conflits de ports
- Timeouts lors du traitement de longues requêtes

### 📚 Documentation

- Documentation complète en français
- Exemples d'utilisation pour tous les composants
- Guide de dépannage détaillé
- Schémas d'architecture
- Guide de contribution

### 🔐 Sécurité

- Ajout de l'authentification JWT
- Chiffrement des sessions
- Protection contre les injections
- Rate limiting
- Validation des entrées utilisateur

---

## [1.0.0] - 2024-XX-XX

### Version initiale

#### ✨ Ajouté

- Architecture de base LLMUI Core
- Support Ollama pour modèles locaux
- Interface web basique
- API REST de base
- Système de consensus simple (workers + merger)
- Gestion de conversations
- Base de données SQLite
- Système de mémoire court terme

#### Modèles supportés
- phi3:3.8b (worker)
- gemma2:2b (worker)
- granite4:micro-h (merger)

#### Fonctionnalités
- Chat en temps réel
- Historique des conversations
- Traitement de fichiers basique (TXT, MD)
- Configuration via YAML
- Logs de base

---

## Types de changements

- `✨ Ajouté` pour les nouvelles fonctionnalités
- `🔧 Modifié` pour les changements aux fonctionnalités existantes
- `⚠️ Déprécié` pour les fonctionnalités bientôt supprimées
- `🗑️ Supprimé` pour les fonctionnalités supprimées
- `🐛 Corrigé` pour les corrections de bugs
- `🔐 Sécurité` pour les corrections de vulnérabilités
- `📚 Documentation` pour les changements de documentation
- `⚡ Performance` pour les améliorations de performance

---

## Roadmap

### Version 2.1.0 (Q1 2025)
- [ ] Support de modèles LLM cloud (API keys configurables)
- [ ] Interface de configuration web
- [ ] Système de notifications
- [ ] Amélioration du système de mémoire RAG
- [ ] Export des conversations (PDF, DOCX)
- [ ] Thèmes d'interface personnalisables

### Version 2.2.0 (Q2 2025)
- [ ] Système de plugins
- [ ] API WebSocket améliorée
- [ ] Support multilingue complet
- [ ] Monitoring et métriques (Prometheus)
- [ ] Backup automatique configurable
- [ ] Documentation API interactive (Swagger)

### Version 3.0.0 (Q3-Q4 2025)
- [ ] AnimaOS intégration
- [ ] Fédération de serveurs LLMUI
- [ ] Marketplace de modèles
- [ ] Système de rôles avancé (RBAC)
- [ ] Clustering et haute disponibilité
- [ ] Support Kubernetes

---

## Notes de version

### 2.0.0 - Détails techniques

#### Performances
- Temps de démarrage: ~15-30 secondes
- Réponse API: < 100ms (sans LLM)
- Consensus: 2-10 secondes (selon modèles)
- Mémoire utilisée: ~500MB-2GB

#### Compatibilité
- Python 3.8+
- Ollama 0.1.0+
- Nginx 1.18+
- SQLite 3.31+

#### Dépendances principales
- FastAPI 0.104.1
- Uvicorn 0.24.0
- aiohttp 3.9.1
- pyyaml 6.0.1
- aiosqlite 0.19.0
- pydantic 2.5.0

#### Breaking changes
- Nouvelle structure de répertoires
- Configuration YAML modifiée
- API endpoints réorganisés
- Services systemd renommés

---

## Support

Pour toute question sur une version spécifique:

- **Issues GitHub**: [Créer un issue](https://github.com/GenAICos/llmui-core/issues)
- **Email**: support@genie-ia.ca
- **Documentation**: [Wiki GitHub](https://github.com/GenAICos/llmui-core/wiki)

---

## Contributeurs

Voir [AUTHORS.md](AUTHORS.md) pour la liste complète des contributeurs.

### Équipe principale

- **François** - Fondateur & Architecte Principal

### Remerciements

- Tous les contributeurs de la communauté
- Les équipes Ollama, FastAPI et Nginx
- La communauté open source Python

---

**Francois Chalut** - Pour la souveraineté numérique du Québec 🇨🇦

*Dernière mise à jour: 2025-11-21*
