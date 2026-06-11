# Guide de dépannage - LLMUI Core v1.0.0

Guide complet pour résoudre les problèmes courants de LLMUI Core.

---

## 📋 Table des matières

1. [Diagnostic rapide](#diagnostic-rapide)
2. [Problèmes d'installation](#problèmes-dinstallation)
3. [Services ne démarrent pas](#services-ne-démarrent-pas)
4. [Erreurs de connexion](#erreurs-de-connexion)
5. [Problèmes Ollama](#problèmes-ollama)
6. [Erreurs de base de données](#erreurs-de-base-de-données)
7. [Problèmes de performance](#problèmes-de-performance)
8. [Problèmes réseau](#problèmes-réseau)
9. [Erreurs frontend](#erreurs-frontend)
10. [Logs et monitoring](#logs-et-monitoring)

---

## 🔍 Diagnostic rapide

### Commande de diagnostic complet

```bash
#!/bin/bash
# diagnostic_llmui.sh

echo "=== DIAGNOSTIC LLMUI CORE ==="
echo ""

echo "1. Services systemd:"
systemctl is-active llmui-core llmui-proxy nginx ollama

echo ""
echo "2. Ports en écoute:"
ss -tlnp | grep -E '(8004|8000|80|11434)'

echo ""
echo "3. Processus:"
ps aux | grep -E '(llmui|ollama|nginx)' | grep -v grep

echo ""
echo "4. Espace disque:"
df -h /opt/llmui-core

echo ""
echo "5. Mémoire:"
free -h

echo ""
echo "6. Test HTTP:"
curl -I http://localhost/

echo ""
echo "7. Test API:"
curl http://localhost:8004/health

echo ""
echo "8. Modèles Ollama:"
ollama list

echo ""
echo "9. Dernières erreurs backend:"
journalctl -u llmui-core -n 10 --no-pager

echo ""
echo "10. Dernières erreurs Nginx:"
tail -5 /var/log/nginx/llmui-error.log
```

### Checklist rapide

- [ ] Services actifs: `sudo systemctl status llmui-core llmui-proxy nginx`
- [ ] Ports ouverts: `sudo ss -tlnp | grep -E '(8004|8000|80)'`
- [ ] Ollama fonctionne: `ollama list`
- [ ] PostgreSQL accessible: `pg_isready -h localhost`
- [ ] Permissions correctes: `ls -la /opt/llmui-core/`
- [ ] Espace disque: `df -h /opt/llmui-core`

---

## 🛠️ Problèmes d'installation

### Base de connaissance d'Andy vide

**Symptôme**: Andy ne connaît pas le projet / répond de façon générique.

**Solution**:
```bash
# La connaissance d'Andy vit dans PostgreSQL (table andy_knowledge),
# éditable via /zadmin → Support Andy. Vérifier son contenu :
sudo -u postgres psql -d llmui_core -c \
  "SELECT id, title, lang FROM andy_knowledge WHERE is_active;"
```

**Causes fréquentes**:
- **Pas de connexion internet**: Vérifier `ping google.com`
- **Espace disque insuffisant**: `df -h`
- **Permissions**: Vérifier que vous êtes root/sudo
- **Dépôt déjà occupé**: `sudo killall apt apt-get` (Debian/Ubuntu)

### Erreur "Package not found"

**Symptôme**: `E: Unable to locate package python3-venv`

**Solution**:
```bash
# Debian/Ubuntu
sudo apt update
sudo apt-cache search python3-venv

# Si toujours pas trouvé
sudo apt install software-properties-common
sudo add-apt-repository universe
sudo apt update
```

### Ollama ne s'installe pas

**Symptôme**: `curl: command not found` ou erreur réseau

**Solution**:
```bash
# Installer curl
sudo apt install curl  # Debian/Ubuntu
sudo dnf install curl  # RHEL/Rocky

# Installation manuelle Ollama
wget https://ollama.com/download/ollama-linux-amd64
sudo mv ollama-linux-amd64 /usr/local/bin/ollama
sudo chmod +x /usr/local/bin/ollama

# Créer le service
sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama
sudo systemctl enable --now ollama
```

### Modèles LLM ne se téléchargent pas

**Symptôme**: `ollama pull phi3:3.8b` échoue

**Solution**:
```bash
# Vérifier Ollama
sudo systemctl status ollama

# Vérifier connexion
curl http://localhost:11434/api/tags

# Espace disque (modèles = ~6GB total)
df -h /usr/share/ollama

# Télécharger manuellement avec verbose
ollama pull phi3:3.8b --verbose

# Si problème réseau persistant
export OLLAMA_DEBUG=1
ollama pull phi3:3.8b
```

---

## 🚫 Services ne démarrent pas

### Backend ne démarre pas

**Symptôme**: `sudo systemctl start llmui-core` échoue

**Diagnostic**:
```bash
# Voir les erreurs
sudo journalctl -u llmui-core -n 50

# Vérifier le fichier service
cat /etc/systemd/system/llmui-core.service

# Tester manuellement
sudo su - llmui
cd /opt/llmui-core
/opt/llmui-core/venv/bin/python src/llmui_backend.py
```

**Causes fréquentes**:

#### 1. Erreur Python/Import
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution**:
```bash
# Réinstaller les dépendances
sudo su - llmui -c "/opt/llmui-core/venv/bin/pip install -r /opt/llmui-core/requirements.txt"
```

#### 2. Port déjà utilisé
```
OSError: [Errno 98] Address already in use
```

**Solution**:
```bash
# Identifier le processus (APP_PORT, défaut 8004)
sudo lsof -i :8004

# Tuer le processus
sudo kill -9 <PID>

# Ou changer le port dans .env, puis redémarrer
sudo nano /opt/llmui-core/.env        # APP_PORT=8005
sudo systemctl restart llmui-core llmui-proxy
```

#### 3. Permissions
```
PermissionError: [Errno 13] Permission denied: '/opt/llmui-core/data'
```

**Solution**:
```bash
# Corriger les permissions
sudo chown -R llmui:llmui /opt/llmui-core
sudo chmod -R 755 /opt/llmui-core
sudo chmod -R 700 /opt/llmui-core/data /opt/llmui-core/logs
```

#### 4. Variable d'environnement invalide
```
asyncpg: invalid DATABASE_URL / connection refused
```

**Solution**:
```bash
# Vérifier le .env (3 variables : DATABASE_URL, APP_PORT, APP_ENV)
cat /opt/llmui-core/.env

# Recréer le .env depuis le modèle du dépôt si besoin,
# puis renseigner DATABASE_URL (mot de passe PostgreSQL)
sudo cp .env.example /opt/llmui-core/.env
```

### Proxy ne démarre pas

**Symptôme**: `sudo systemctl start llmui-proxy` échoue

**Solution**:
```bash
# Logs
sudo journalctl -u llmui-proxy -n 50

# Vérifier que le backend est actif
sudo systemctl status llmui-core

# Port 8080 libre?
sudo lsof -i :8000

# Test manuel
sudo su - llmui -c "/opt/llmui-core/venv/bin/python /opt/llmui-core/src/llmui_proxy.py"
```

### Nginx ne démarre pas

**Symptôme**: `sudo systemctl start nginx` échoue

**Diagnostic**:
```bash
# Test de configuration
sudo nginx -t

# Logs
sudo journalctl -u nginx -n 50
sudo tail -50 /var/log/nginx/error.log

# Vérifier les permissions
ls -la /opt/llmui-core/web/
```

**Causes fréquentes**:

#### 1. Erreur de syntaxe
```
nginx: [emerg] unexpected "}" in /etc/nginx/sites-enabled/llmui:42
```

**Solution**:
```bash
# Éditer la config
sudo nano /etc/nginx/sites-available/llmui

# Ou restaurer depuis backup
sudo cp /etc/nginx/sites-available/llmui.bak.* /etc/nginx/sites-available/llmui
```

#### 2. Port 80 déjà utilisé
```
nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
```

**Solution**:
```bash
# Identifier le processus
sudo lsof -i :80

# Apache en conflit?
sudo systemctl stop apache2
sudo systemctl disable apache2
```

---

## 🔌 Erreurs de connexion

### Erreur 502 Bad Gateway

**Symptôme**: Page web affiche "502 Bad Gateway"

**Cause**: Backend ou proxy ne répond pas

**Solution**:
```bash
# 1. Vérifier les services
sudo systemctl status llmui-core llmui-proxy

# 2. Démarrer si arrêtés
sudo systemctl start llmui-core
sleep 5
sudo systemctl start llmui-proxy

# 3. Vérifier les logs Nginx
sudo tail -f /var/log/nginx/llmui-error.log

# 4. Test direct du backend
curl http://localhost:8004/health
```

### Erreur 504 Gateway Timeout

**Symptôme**: Requête prend trop de temps et timeout

**Cause**: Ollama ou consensus prend trop de temps

**Solution**:
```bash
# 1. Augmenter les timeouts Nginx
sudo nano /etc/nginx/sites-available/llmui

# Ajouter dans location /api/:
proxy_connect_timeout 120s;
proxy_send_timeout 120s;
proxy_read_timeout 120s;

# 2. Recharger Nginx
sudo nginx -t && sudo systemctl reload nginx

# 3. Le timeout Ollama se règle dans /zadmin (section Andy) ou via les
#    constantes TIMEOUT_CONFIG de src/llmui_backend.py (plafond 4 h — M-04)
```

### Erreur 401 Unauthorized

**Symptôme**: API retourne 401 même avec token

**Solution**:
```bash
# 1. Vérifier le token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8004/api/auth/verify

# 2. Régénérer un token
curl -X POST http://localhost:8004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# 3. La clé de session (session_secret_key) vit en base (table system_config,
#    chiffrée) et est générée au premier démarrage — elle ne s'édite pas à la main

# 4. En cas de doute, redémarrer
sudo systemctl restart llmui-core llmui-proxy
```

### WebSocket se déconnecte

**Symptôme**: Connexion WebSocket se ferme rapidement

**Solution**:
```bash
# 1. Augmenter timeouts WebSocket dans Nginx
sudo nano /etc/nginx/sites-available/llmui

# Dans location /ws/:
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;

# 2. Vérifier les logs
sudo journalctl -u llmui-core -f | grep -i websocket

# 3. Test WebSocket
npm install -g wscat
wscat -c ws://localhost:8004/ws/chat
```

---

## 🤖 Problèmes Ollama

### Ollama ne répond pas

**Symptôme**: `curl http://localhost:11434` échoue

**Solution**:
```bash
# 1. Vérifier le service
sudo systemctl status ollama

# 2. Redémarrer
sudo systemctl restart ollama

# 3. Vérifier les logs
sudo journalctl -u ollama -n 50

# 4. Port en écoute?
sudo ss -tlnp | grep 11434

# 5. Test API
curl http://localhost:11434/api/tags
```

### Modèle introuvable

**Symptôme**: `Error: model 'phi3:3.8b' not found`

**Solution**:
```bash
# Lister les modèles
ollama list

# Re-télécharger
ollama pull phi3:3.8b
ollama pull gemma2:2b
ollama pull granite4:micro-h

# Vérifier
ollama list
```

### Ollama est lent

**Symptôme**: Génération prend >30 secondes

**Causes**:
- Pas de GPU (utilise CPU)
- RAM insuffisante
- Swap excessif

**Solution**:
```bash
# Vérifier utilisation ressources
top -bn1 | grep ollama
free -h

# Si swap utilisé
sudo swapoff -a
sudo swapon -a

# Réduire charge
ollama ps  # Voir modèles chargés
# Les modèles se déchargent automatiquement après 5 min

# Configurer GPU si disponible
# Ajouter dans /etc/systemd/system/ollama.service:
[Service]
Environment="CUDA_VISIBLE_DEVICES=0"

sudo systemctl daemon-reload
sudo systemctl restart ollama
```

### Erreur CUDA/GPU

**Symptôme**: `CUDA error: out of memory`

**Solution**:
```bash
# Vérifier GPU
nvidia-smi

# Réduire le nombre de workers dans /zadmin (ou DEFAULT_WORKER_MODELS)

# Ou forcer CPU
sudo systemctl stop ollama
OLLAMA_FORCE_CPU=1 sudo -u ollama ollama serve
```

---

## 💾 Erreurs de base de données

### PostgreSQL inaccessible

**Symptôme**: `asyncpg ... Connection refused` au démarrage du backend

**Solution**:
```bash
# 1. Démarrer / vérifier le service
sudo systemctl enable --now postgresql
sudo systemctl status postgresql

# 2. Tester la connexion (DATABASE_URL du .env)
psql "postgresql://llmui_user@localhost:5432/llmui_core" -c '\conninfo'
```

### Authentification PostgreSQL échouée

**Symptôme**: `password authentication failed for user "llmui_user"`

**Solution**:
```bash
# Le mot de passe du .env doit correspondre au rôle PostgreSQL.
# Resynchroniser à partir de la valeur du .env :
DB_PASS=$(sed -n 's#.*://llmui_user:\([^@]*\)@.*#\1#p' /opt/llmui-core/.env)
sudo -u postgres psql -c "ALTER ROLE llmui_user WITH PASSWORD '$DB_PASS';"
sudo systemctl restart llmui-core
```

### Table manquante

**Symptôme**: `relation "conversations" does not exist`

**Solution**:
```bash
# Le schéma provient de create_database.sql (idempotent) ; Alembic gère
# ensuite les migrations. Réappliquer le script (sans perte de données) :
sudo -u postgres psql -d llmui_core -f postInstallScripts/create_database.sql
sudo systemctl restart llmui-core

# Vérifier les logs
sudo journalctl -u llmui-core -n 20
```

---

## 🐌 Problèmes de performance

### Réponses lentes

**Diagnostic**:
```bash
# 1. Utilisation CPU/RAM
top
htop

# 2. I/O disque
iostat -x 1

# 3. Temps de réponse API
time curl http://localhost:8004/health

# 4. Logs
sudo journalctl -u llmui-core | grep "processing_time"
```

**Solutions**:

#### Cache (Redis)
```bash
# Cache + rate limiting reposent sur Redis — vérifier qu'il tourne
redis-cli ping        # → PONG
sudo systemctl enable --now redis-server
```

#### Optimiser Ollama
Réduire le nombre de workers dans **/zadmin** (ou via la constante
`DEFAULT_WORKER_MODELS` de `src/llmui_backend.py`).

#### Base de données (PostgreSQL)
```bash
# Compacter / analyser
sudo -u postgres psql -d llmui_core -c "VACUUM ANALYZE;"

# Purger les vieux messages (> 30 jours)
sudo -u postgres psql -d llmui_core -c \
  "DELETE FROM messages WHERE created_at < NOW() - INTERVAL '30 days';"
```

### Mémoire saturée

**Symptôme**: `MemoryError` ou système swap excessif

**Solution**:
```bash
# Identifier consommation
ps aux --sort=-%mem | head -10

# Limiter mémoire Ollama
sudo systemctl edit ollama
# Ajouter:
[Service]
MemoryMax=4G

sudo systemctl daemon-reload
sudo systemctl restart ollama

# Nettoyer cache
sudo systemctl restart llmui-core
```

---

## 🌐 Problèmes réseau

### Ne peut pas se connecter depuis l'extérieur

**Symptôme**: Fonctionne sur localhost mais pas depuis autre machine

**Solution**:
```bash
# 1. Pare-feu
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# OU
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 2. Nginx écoute sur toutes interfaces?
sudo netstat -tlnp | grep :80

# 3. IP publique
curl ifconfig.me

# 4. Test depuis externe
curl -I http://VOTRE_IP/
```

### SSL/HTTPS ne fonctionne pas

**Symptôme**: Erreur certificat ou connexion refusée sur 443

**Solution**:
```bash
# 1. Vérifier certificats
sudo ls -la /opt/llmui-core/ssl/

# 2. Générer avec Let's Encrypt
sudo certbot --nginx -d votre-domaine.com

# 3. Tester renouvellement
sudo certbot renew --dry-run

# 4. Vérifier config Nginx
sudo nginx -t

# 5. Redémarrer
sudo systemctl restart nginx
```

---

## 🎨 Erreurs frontend

### Page blanche

**Symptôme**: Interface ne charge pas, page blanche

**Solution**:
```bash
# 1. Console navigateur (F12)
# Chercher erreurs JavaScript

# 2. Vérifier fichiers web
ls -la /opt/llmui-core/web/

# 3. Permissions
sudo chown -R www-data:www-data /opt/llmui-core/web/

# 4. Test fichiers
curl http://localhost/
curl http://localhost/index.html
curl http://localhost/app.js

# 5. Logs Nginx
sudo tail -f /var/log/nginx/llmui-error.log
```

### Erreur CORS

**Symptôme**: `Access-Control-Allow-Origin` dans console

**Solution**:
```bash
# Dans llmui_backend.py, vérifier CORS:
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # En dev seulement!
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# Redémarrer
sudo systemctl restart llmui-core
```

### Fichiers statiques 404

**Symptôme**: CSS/JS ne chargent pas (404)

**Solution**:
```bash
# Vérifier config Nginx
sudo nano /etc/nginx/sites-available/llmui

# Doit avoir:
root /opt/llmui-core/web;

# Tester
curl -I http://localhost/app.js
curl -I http://localhost/base.css
```

---

## 📊 Logs et monitoring

### Consulter tous les logs

```bash
# Backend (temps réel)
sudo journalctl -u llmui-core -f

# Backend (dernières 100 lignes)
sudo journalctl -u llmui-core -n 100

# Backend (depuis 1h)
sudo journalctl -u llmui-core --since "1 hour ago"

# Proxy
sudo journalctl -u llmui-proxy -f

# Nginx access
sudo tail -f /var/log/nginx/llmui-access.log

# Nginx errors
sudo tail -f /var/log/nginx/llmui-error.log

# Ollama
sudo journalctl -u ollama -f

# Tous en même temps (multitail)
sudo multitail \
  -l "journalctl -u llmui-core -f" \
  -l "journalctl -u llmui-proxy -f" \
  -l "tail -f /var/log/nginx/llmui-error.log"
```

### Filtrer les logs

```bash
# Erreurs seulement
sudo journalctl -u llmui-core -p err -n 50

# Recherche mot-clé
sudo journalctl -u llmui-core | grep -i "error"

# Export logs
sudo journalctl -u llmui-core --since today > ~/llmui-logs-$(date +%Y%m%d).log
```

### Activer debug

```python
# Les logs vont vers journald (aucun fichier de config). Passer APP_ENV en
# « development » dans /opt/llmui-core/.env augmente la verbosité, puis :
sudo systemctl restart llmui-core llmui-proxy

# Suivre les logs en direct
sudo journalctl -u llmui-core -f
```

---

## 🆘 Réinitialisation complète

Si rien ne fonctionne, réinitialisation propre:

```bash
#!/bin/bash
# reset_llmui.sh

echo "⚠️  RÉINITIALISATION COMPLÈTE - Sauvegarder d'abord!"
read -p "Continuer? (tapez 'OUI'): " confirm
if [ "$confirm" != "OUI" ]; then exit 1; fi

# Backup
sudo tar -czf ~/llmui-backup-$(date +%Y%m%d).tar.gz /opt/llmui-core/data

# Arrêter
sudo systemctl stop llmui-core llmui-proxy nginx

# Nettoyer les logs et fichiers générés
sudo rm -rf /var/log/llmui/*
sudo rm -rf /var/lib/llmui/generated/*

# Réinstaller les dépendances Python (compte propriétaire du venv)
sudo -u "$(stat -c '%U' /opt/llmui-core/venv)" \
  /opt/llmui-core/venv/bin/pip install --force-reinstall -r /opt/llmui-core/requirements.txt

# Redémarrer
sudo systemctl start llmui-core
sleep 5
sudo systemctl start llmui-proxy
sleep 3
sudo systemctl start nginx

# Vérifier
sudo systemctl status llmui-core llmui-proxy nginx
curl http://localhost:8004/health
```

---

## 📞 Support supplémentaire

Si le problème persiste:

1. **Consulter les logs complets**:
```bash
sudo tar -czf ~/llmui-debug-$(date +%Y%m%d).tar.gz \
  /tmp/andy_install.log \
  /var/log/nginx/llmui-*.log \
  <(journalctl -u llmui-core -n 500) \
  <(journalctl -u llmui-proxy -n 500) \
  <(journalctl -u ollama -n 500)
```

2. **Informations système**:
```bash
uname -a
python3 --version
ollama --version
nginx -v
cat /etc/os-release
df -h
free -h
```

3. **Créer un issue GitHub** avec:
   - Description du problème
   - Étapes pour reproduire
   - Logs pertinents
   - Informations système

---

**Francois Chalut**  
*Support technique pour la souveraineté numérique* 🇨🇦

**Dernière mise à jour**: 2025-11-21
