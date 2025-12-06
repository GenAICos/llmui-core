# Guide de dépannage - LLMUI Core v0.5.0

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
systemctl is-active llmui-backend llmui-proxy nginx ollama

echo ""
echo "2. Ports en écoute:"
ss -tlnp | grep -E '(5000|8080|80|11434)'

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
curl http://localhost:5000/api/health

echo ""
echo "8. Modèles Ollama:"
ollama list

echo ""
echo "9. Dernières erreurs backend:"
journalctl -u llmui-backend -n 10 --no-pager

echo ""
echo "10. Dernières erreurs Nginx:"
tail -5 /var/log/nginx/llmui-error.log
```

### Checklist rapide

- [ ] Services actifs: `sudo systemctl status llmui-backend llmui-proxy nginx`
- [ ] Ports ouverts: `sudo ss -tlnp | grep -E '(5000|8080|80)'`
- [ ] Ollama fonctionne: `ollama list`
- [ ] Base de données accessible: `ls -la /opt/llmui-core/data/*.db`
- [ ] Permissions correctes: `ls -la /opt/llmui-core/`
- [ ] Espace disque: `df -h /opt/llmui-core`

---

## 🛠️ Problèmes d'installation

### Andy échoue pendant l'installation

**Symptôme**: Le script `andy_installer.py` s'arrête avec une erreur.

**Solution**:
```bash
# 1. Consulter les logs Andy
less /tmp/andy_install.log

# 2. Consulter la base de données
sqlite3 /tmp/andy_installation.db
SELECT * FROM commands WHERE status='failed' ORDER BY timestamp DESC LIMIT 5;
.quit

# 3. Identifier l'étape problématique et relancer
sudo python3 andy_installer.py
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

**Symptôme**: `sudo systemctl start llmui-backend` échoue

**Diagnostic**:
```bash
# Voir les erreurs
sudo journalctl -u llmui-backend -n 50

# Vérifier le fichier service
cat /etc/systemd/system/llmui-backend.service

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
# Identifier le processus
sudo lsof -i :5000

# Tuer le processus
sudo kill -9 <PID>

# Ou changer le port dans config.yaml
sudo nano /opt/llmui-core/config.yaml
# server:
#   port: 5001
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

#### 4. Configuration invalide
```
yaml.scanner.ScannerError: mapping values are not allowed here
```

**Solution**:
```bash
# Vérifier la syntaxe YAML
python3 -c "import yaml; yaml.safe_load(open('/opt/llmui-core/config.yaml'))"

# Restaurer la config par défaut
sudo cp /opt/llmui-core/config.yaml.example /opt/llmui-core/config.yaml
sudo chown llmui:llmui /opt/llmui-core/config.yaml
```

### Proxy ne démarre pas

**Symptôme**: `sudo systemctl start llmui-proxy` échoue

**Solution**:
```bash
# Logs
sudo journalctl -u llmui-proxy -n 50

# Vérifier que le backend est actif
sudo systemctl status llmui-backend

# Port 8080 libre?
sudo lsof -i :8080

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
sudo systemctl status llmui-backend llmui-proxy

# 2. Démarrer si arrêtés
sudo systemctl start llmui-backend
sleep 5
sudo systemctl start llmui-proxy

# 3. Vérifier les logs Nginx
sudo tail -f /var/log/nginx/llmui-error.log

# 4. Test direct du backend
curl http://localhost:5000/api/health
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

# 3. Augmenter timeout Ollama dans config.yaml
ollama:
  timeout: 600  # 10 minutes
```

### Erreur 401 Unauthorized

**Symptôme**: API retourne 401 même avec token

**Solution**:
```bash
# 1. Vérifier le token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/auth/verify

# 2. Régénérer un token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# 3. Vérifier la config JWT
cat /opt/llmui-core/config.yaml | grep jwt_secret

# 4. Si secret changé, redémarrer
sudo systemctl restart llmui-backend llmui-proxy
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
sudo journalctl -u llmui-backend -f | grep -i websocket

# 3. Test WebSocket
npm install -g wscat
wscat -c ws://localhost:5000/ws/chat
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

# Réduire nombre de modèles simultanés
# Modifier config.yaml pour utiliser 1 worker au lieu de 2

# Ou forcer CPU
sudo systemctl stop ollama
OLLAMA_FORCE_CPU=1 sudo -u ollama ollama serve
```

---

## 💾 Erreurs de base de données

### SQLite locked

**Symptôme**: `database is locked`

**Solution**:
```bash
# 1. Identifier les processus utilisant la DB
sudo lsof /opt/llmui-core/data/*.db

# 2. Arrêter les services
sudo systemctl stop llmui-backend llmui-proxy

# 3. Vérifier intégrité
sqlite3 /opt/llmui-core/data/llmui.db "PRAGMA integrity_check;"

# 4. Si OK, redémarrer
sudo systemctl start llmui-backend llmui-proxy
```

### Base de données corrompue

**Symptôme**: `database disk image is malformed`

**Solution**:
```bash
# 1. Arrêter les services
sudo systemctl stop llmui-backend llmui-proxy

# 2. Backup
cp /opt/llmui-core/data/llmui.db /opt/llmui-core/data/llmui.db.corrupt

# 3. Exporter données
sqlite3 /opt/llmui-core/data/llmui.db.corrupt ".dump" > /tmp/dump.sql

# 4. Créer nouvelle DB
rm /opt/llmui-core/data/llmui.db
sqlite3 /opt/llmui-core/data/llmui.db < /tmp/dump.sql

# 5. Vérifier
sqlite3 /opt/llmui-core/data/llmui.db "PRAGMA integrity_check;"

# 6. Redémarrer
sudo systemctl start llmui-backend llmui-proxy
```

### Erreur migration

**Symptôme**: `no such table: conversations`

**Solution**:
```bash
# Réinitialiser la DB (PERTE DE DONNÉES!)
sudo systemctl stop llmui-backend llmui-proxy

# Backup
sudo cp /opt/llmui-core/data/llmui.db /opt/llmui-core/backups/

# Supprimer
sudo rm /opt/llmui-core/data/llmui.db

# Redémarrer (crée automatiquement)
sudo systemctl start llmui-backend

# Vérifier les logs
sudo journalctl -u llmui-backend -n 20
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
time curl http://localhost:5000/api/health

# 4. Logs
sudo journalctl -u llmui-backend | grep "processing_time"
```

**Solutions**:

#### Cache
```yaml
# Dans config.yaml
caching:
  enabled: true
  response_cache_size: 2000
  embedding_cache_size: 10000
```

#### Optimiser Ollama
```bash
# Moins de workers
# config.yaml:
ollama:
  models:
    workers:
      - "phi3:3.8b"  # Un seul au lieu de 2
```

#### Base de données
```bash
# Vacuum SQLite
sqlite3 /opt/llmui-core/data/llmui.db "VACUUM;"

# Nettoyer vieux messages
sqlite3 /opt/llmui-core/data/llmui.db "DELETE FROM messages WHERE created_at < datetime('now', '-30 days');"
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
sudo systemctl restart llmui-backend
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
sudo systemctl restart llmui-backend
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
sudo journalctl -u llmui-backend -f

# Backend (dernières 100 lignes)
sudo journalctl -u llmui-backend -n 100

# Backend (depuis 1h)
sudo journalctl -u llmui-backend --since "1 hour ago"

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
  -l "journalctl -u llmui-backend -f" \
  -l "journalctl -u llmui-proxy -f" \
  -l "tail -f /var/log/nginx/llmui-error.log"
```

### Filtrer les logs

```bash
# Erreurs seulement
sudo journalctl -u llmui-backend -p err -n 50

# Recherche mot-clé
sudo journalctl -u llmui-backend | grep -i "error"

# Export logs
sudo journalctl -u llmui-backend --since today > ~/llmui-logs-$(date +%Y%m%d).log
```

### Activer debug

```python
# Dans config.yaml
logging:
  level: "DEBUG"  # Au lieu de INFO

# Redémarrer
sudo systemctl restart llmui-backend llmui-proxy
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
sudo systemctl stop llmui-backend llmui-proxy nginx

# Nettoyer cache/logs
sudo rm -rf /opt/llmui-core/logs/*
sudo rm -rf /opt/llmui-core/cache/*
sudo rm -f /opt/llmui-core/data/*.db-journal

# Réinstaller dépendances Python
sudo su - llmui -c "/opt/llmui-core/venv/bin/pip install --force-reinstall -r /opt/llmui-core/requirements.txt"

# Redémarrer
sudo systemctl start llmui-backend
sleep 5
sudo systemctl start llmui-proxy
sleep 3
sudo systemctl start nginx

# Vérifier
sudo systemctl status llmui-backend llmui-proxy nginx
curl http://localhost:5000/api/health
```

---

## 📞 Support supplémentaire

Si le problème persiste:

1. **Consulter les logs complets**:
```bash
sudo tar -czf ~/llmui-debug-$(date +%Y%m%d).tar.gz \
  /tmp/andy_install.log \
  /var/log/nginx/llmui-*.log \
  <(journalctl -u llmui-backend -n 500) \
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
