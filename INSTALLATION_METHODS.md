# 🎯 Trois façons d'installer LLMUI Core v2.0

LLMUI Core offre **3 méthodes d'installation** pour s'adapter à tous les niveaux de confort et besoins.

---

## 🤖 Méthode 1: Andy (Automatique) - Recommandée

**Pour**: Nouveaux utilisateurs, installations rapides, production

### Fichiers
- `andy_setup.sh` - Menu interactif
- `andy_installer.py` - Installation automatique
- `andy_deploy_source.py` - Déploiement sources
- `andy_start_services.py` - Gestion services

### Caractéristiques
✅ **Automatique à 100%** - Installation en 3 commandes  
✅ **Détection intelligente** - Identifie apt/dnf/yum automatiquement  
✅ **Gestion d'erreurs** - Corrige les problèmes automatiquement  
✅ **Traçabilité** - Base SQLite avec historique complet  
✅ **Menu interactif** - Options modulaires (installer, vérifier, logs)  
✅ **Multi-OS** - Debian, Ubuntu, Rocky, RHEL  

### Installation complète
```bash
# Option A: Menu interactif (recommandé pour débuter)
sudo bash andy_setup.sh
# → Choisir [1] Installation complète

# Option B: Ligne de commande (pour scripts)
sudo python3 andy_installer.py      # Étape 1: Base système
sudo python3 andy_deploy_source.py  # Étape 2: Fichiers source
sudo python3 andy_start_services.py # Étape 3: Services
```

### Durée
- **Totale**: 15-30 minutes (selon connexion)
- **Interaction**: 2 minutes (nom utilisateur + mot de passe)
- **Reste**: 100% automatique

### Avantages
- 🚀 Le plus rapide
- 🧠 Le plus intelligent
- 🔒 Le plus sécurisé (base de données de traçabilité)
- 📊 Rapport détaillé à la fin
- 🛡️ Backup automatique avant modifications

### Documentation
- `README_ANDY.md` - Documentation complète Andy
- `ANDY_INTERACTIVE.md` - Guide du menu interactif

---

## 📚 Méthode 2: Interactive Guidée - Pour les prudents

**Pour**: Ceux qui veulent comprendre chaque étape, apprentissage, contrôle total

### Fichiers
- `scripts/install_interactive.sh` - **Installation guidée étape par étape**
- `scripts/install.sh` - Installation classique
- `scripts/install_backend.py` - Backend Python

### Caractéristiques
✅ **Explications détaillées** à chaque étape  
✅ **Confirmation** avant chaque action  
✅ **Possibilité de passer** des étapes  
✅ **Pédagogique** - Parfait pour apprendre  
✅ **Flexibilité** - Personnaliser l'installation  

### Installation guidée
```bash
# Lancer l'assistant interactif
sudo bash scripts/install_interactive.sh

# L'assistant vous guidera à travers:
# 1. Vérification des prérequis
# 2. Installation des dépendances (avec confirmation)
# 3. Configuration Ollama + modèles (avec explications)
# 4. Configuration services systemd (étape par étape)
# 5. Configuration Nginx (avec options)
# 6. Configuration pare-feu (avec choix)
# 7. Vérification finale (avec tests)
```

### Exemple d'interaction
```
┌─────────────────────────────────────────────────┐
│ Étape 2/7: Installation des dépendances        │
└─────────────────────────────────────────────────┘

Cette étape va installer:
  • Python 3.8+ et pip
  • Nginx pour le reverse proxy
  • SQLite3 pour la base de données
  • Outils de compilation

Voulez-vous continuer? [O/n]: O
Installer aussi les outils de développement? [O/n]: O
```

### Durée
- **Totale**: 20-40 minutes
- **Interaction**: 10-15 minutes (choix et confirmations)
- **Attente**: 10-25 minutes

### Avantages
- 📖 Éducatif - Vous comprenez ce qui se passe
- 🎛️ Contrôle - Choix à chaque étape
- ✋ Pause - Prenez le temps de lire
- 🔍 Transparence - Aucune action cachée
- 🎓 Parfait pour apprendre Linux/DevOps

### Pour qui?
- Premiers pas avec Linux
- Administrateurs voulant comprendre l'architecture
- Installations personnalisées
- Environnements d'apprentissage

---

## ⚙️ Méthode 3: Manuelle - Pour les experts

**Pour**: DevOps expérimentés, environnements spéciaux, personnalisation maximale

### Documentation
- `INSTALL.md` - Guide d'installation manuelle complet

### Caractéristiques
✅ **Contrôle absolu** - Chaque commande est documentée  
✅ **Personnalisation** - Adaptez tout à vos besoins  
✅ **Compréhension** - Maîtrise totale du système  
✅ **Flexibilité** - Pour environnements non-standards  

### Installation manuelle
Suivez `INSTALL.md` section "Installation manuelle", qui détaille:

1. **Préparation système**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install python3-pip python3-venv nginx...
   ```

2. **Installation Ollama**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull phi3:3.8b
   ollama pull gemma2:2b
   ollama pull granite4:micro-h
   ```

3. **Configuration utilisateur**
   ```bash
   sudo useradd -r -s /bin/bash -d /opt/llmui-core -m llmui
   sudo mkdir -p /opt/llmui-core/{logs,data,backups}...
   ```

4. **Environnement Python**
   ```bash
   sudo su - llmui -c "python3 -m venv venv"
   sudo su - llmui -c "venv/bin/pip install -r requirements.txt"
   ```

5. **Services systemd**
   - Création manuelle des fichiers .service
   - Configuration fine des paramètres

6. **Configuration Nginx**
   - Personnalisation complète du reverse proxy
   - Configuration SSL avancée

7. **Pare-feu et sécurité**
   - Configuration manuelle UFW/firewalld
   - Règles personnalisées

### Durée
- **Totale**: 30-60 minutes
- **Expérience requise**: Linux avancé
- **Documentation**: 20-30 pages détaillées

### Avantages
- 🎯 Précision maximale
- 🛠️ Personnalisation illimitée
- 🔬 Compréhension approfondie
- 🏗️ Environnements non-standards
- 📚 Documentation complète

### Pour qui?
- DevOps seniors
- Environnements de production critiques
- Architectures personnalisées
- Intégration avec infrastructure existante

---

## 📊 Tableau comparatif

| Critère | Andy (Auto) | Interactive | Manuelle |
|---------|-------------|-------------|----------|
| **Temps total** | 15-30 min | 20-40 min | 30-60 min |
| **Interaction** | 2 min | 10-15 min | Continue |
| **Niveau requis** | Débutant | Intermédiaire | Expert |
| **Apprentissage** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Personnalisation** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Automatisation** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Traçabilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Gestion erreurs** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

---

## 🎯 Quelle méthode choisir?

### Vous êtes nouveau avec LLMUI Core?
→ **Andy (Méthode 1)** - Installation en 3 clics

### Vous voulez apprendre comment ça fonctionne?
→ **Interactive (Méthode 2)** - Guidée étape par étape

### Vous êtes DevOps senior avec besoins spécifiques?
→ **Manuelle (Méthode 3)** - Contrôle total

### Vous installez sur plusieurs serveurs?
→ **Andy (Méthode 1)** - Automatisation et standardisation

### Environnement d'apprentissage/formation?
→ **Interactive (Méthode 2)** - Pédagogique et flexible

### Production critique avec architecture spéciale?
→ **Manuelle (Méthode 3)** - Personnalisation maximale

---

## 🔄 Combinaison des méthodes

Vous pouvez **combiner** les méthodes:

### Exemple 1: Andy pour la base, manuel pour la personnalisation
```bash
# 1. Installation rapide avec Andy
sudo python3 andy_installer.py

# 2. Personnalisation manuelle
sudo nano /opt/llmui-core/config.yaml
sudo systemctl restart llmui-backend
```

### Exemple 2: Interactive pour apprendre, Andy pour reproduire
```bash
# 1. Première fois: Interactive pour comprendre
sudo bash scripts/install_interactive.sh

# 2. Serveurs suivants: Andy pour rapidité
sudo bash andy_setup.sh
```

---

## 📖 Documentation par méthode

### Andy
- `README.md` section "Installation avec Andy"
- `QUICKSTART.md` - Démarrage rapide
- `README_ANDY.md` - Documentation complète
- `ANDY_INTERACTIVE.md` - Guide du menu

### Interactive
- `INSTALL.md` - Référence des étapes
- `scripts/install_interactive.sh` - Le script lui-même (commenté)

### Manuelle
- `INSTALL.md` section "Installation manuelle"
- `docs/ARCHITECTURE.md` - Architecture technique
- `docs/CONFIGURATION.md` - Configuration avancée

---

## 🆘 Support par méthode

### Problème avec Andy?
```bash
# Consulter les logs
less /tmp/andy_install.log

# Base de données SQLite
sqlite3 /tmp/andy_installation.db
SELECT * FROM commands WHERE status='failed';
```

### Problème avec Interactive?
```bash
# Relancer l'étape problématique
sudo bash scripts/install_interactive.sh
# Choisir de passer les étapes réussies
```

### Problème avec Manuelle?
```bash
# Consulter INSTALL.md section "Dépannage"
# Vérifier les logs système
sudo journalctl -xe
```

---

## ✅ Vérification post-installation

Quelle que soit la méthode choisie, vérifiez l'installation:

```bash
# Services actifs?
sudo systemctl status llmui-backend llmui-proxy nginx

# Test HTTP
curl -I http://localhost/

# Test API
curl http://localhost:5000/api/health

# Modèles Ollama
ollama list
```

Ou avec Andy:
```bash
sudo bash andy_setup.sh
# Choisir [5] Vérifier l'installation
```

---

## 💡 Conseil final

**Pour 90% des cas**: Utilisez **Andy** (Méthode 1)
- Installation la plus rapide
- Gestion d'erreurs automatique
- Traçabilité complète
- Production-ready

**Pour apprendre**: Utilisez **Interactive** (Méthode 2)
- Comprenez chaque étape
- Choisissez vos options
- Formation parfaite

**Pour expert**: Utilisez **Manuelle** (Méthode 3)
- Contrôle total
- Personnalisation maximale
- Environnements spéciaux

---

**Génie IA Centre Opérationnel Sécurité inc.**  
*Trois méthodes, un seul objectif: Souveraineté numérique* 🇨🇦
