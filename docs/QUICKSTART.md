# 🚀 Démarrage rapide - LLMUI Core v1.0.0

Guide ultra-rapide pour installer et utiliser LLMUI Core en moins de 15 minutes.

---

## ⚡ Installation express

### Prérequis
- Serveur Linux (Debian 13 / Ubuntu 24.04 / Zorin OS 18)
- Python 3.11+
- Accès root (sudo)
- 8GB RAM minimum
- 20GB disque libre

### Installation automatisée

```bash
# 1. Cloner le dépôt
git clone https://github.com/GenAICos/llmui-core.git && cd llmui-core

# 2. Lancer l'installateur interactif
#    (prérequis, PostgreSQL, services systemd, pare-feu)
sudo ./scripts/install_interactive.sh
```

**C'est tout !** ☕

---

## 📋 Ce qui va se passer

Andy va automatiquement:

1. ✅ Mettre à jour votre système
2. ✅ Installer Ollama + 3 modèles LLM (~10 minutes)
3. ✅ Configurer Python et dépendances
4. ✅ Créer les services systemd
5. ✅ Configurer Nginx
6. ✅ Configurer le pare-feu
7. ✅ Démarrer tous les services
8. ✅ Afficher l'URL d'accès

**Durée totale**: 15-30 minutes (selon connexion internet)

---

## 🎯 Première utilisation

### Accéder à l'interface

Une fois l'installation terminée, Andy affiche:

```
✓ Interface accessible sur: http://192.168.1.100/
```

Ouvrez cette URL dans votre navigateur!

### Premiers pas

1. **Page d'accueil**
   - Interface de chat moderne
   - Historique des conversations
   - Upload de fichiers

2. **Première conversation**
   ```
   Vous: Bonjour! Peux-tu m'expliquer comment tu fonctionnes?
   
   LLMUI: Bonjour! Je suis LLMUI Core, une plateforme de consensus...
   ```

3. **Upload de fichier**
   - Cliquez sur 📎
   - Sélectionnez un PDF, DOCX ou image
   - Posez des questions sur le document

---

## 🛠️ Commandes utiles

### Vérifier l'état

```bash
sudo systemctl status llmui-core llmui-proxy nginx
```

### Consulter les logs

```bash
# Backend
sudo journalctl -u llmui-core -f

# Proxy
sudo journalctl -u llmui-proxy -f

# Nginx
sudo tail -f /var/log/nginx/llmui-access.log
```

### Redémarrer les services

```bash
sudo systemctl restart llmui-core llmui-proxy nginx
```

---

## 📱 API REST rapide

### Health check

```bash
curl http://localhost:8004/health
```

### Liste des modèles

```bash
curl http://localhost:8004/api/models
```

### Envoyer un message

```bash
curl -X POST http://localhost:8004/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Bonjour!",
    "user_id": "test_user"
  }'
```

---

## 🔧 Configuration rapide

LLMUI Core se configure via **`/zadmin`** (table `system_config` en PostgreSQL),
jamais via un fichier de configuration (STANDARDS.md §2/§5). Seules 3 variables
de démarrage vivent dans `.env` : `DATABASE_URL`, `APP_PORT`, `APP_ENV`.

### Changer le port de l'application

```bash
sudo nano /opt/llmui-core/.env        # APP_PORT=8004
sudo systemctl restart llmui-core llmui-proxy
```

### Modèles, Andy, sécurité, CORS…

Tout se règle dans **`/zadmin` → Configuration système**.
Voir [`docs/CONFIGURATION.md`](CONFIGURATION.md) pour la liste complète.

### Ajouter SSL (production)

```bash
sudo certbot --nginx -d votre-domaine.com
```

---

## 🐛 Problèmes courants

### Les services ne démarrent pas

```bash
# Vérifier les logs
sudo journalctl -u llmui-core -n 50

# Vérifier les permissions
ls -la /opt/llmui-core/

# Redémarrer
sudo systemctl restart llmui-core llmui-proxy
```

### Page blanche dans le navigateur

```bash
# Vérifier Nginx
sudo systemctl status nginx
sudo nginx -t

# Vérifier le backend
curl http://localhost:8004/health
```

### Ollama ne répond pas

```bash
# Vérifier Ollama
ollama list
ollama ps

# Redémarrer
sudo systemctl restart ollama

# Tester un modèle
ollama run phi3:3.8b "test"
```

---

## 📚 Aller plus loin

### Documentation complète

- **[README.md](README.md)** - Vue d'ensemble complète
- **[INSTALL.md](INSTALL.md)** - Guide d'installation détaillé
- **[README_ANDY.md](README_ANDY.md)** - Documentation Andy
- **[ANDY_INTERACTIVE.md](ANDY_INTERACTIVE.md)** - Guide menu interactif
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribuer au projet

### Tutoriels

1. **Configuration avancée**: INSTALL.md section "Configuration post-installation"
2. **API REST complète**: docs/API.md
3. **Architecture technique**: docs/ARCHITECTURE.md
4. **Dépannage**: docs/TROUBLESHOOTING.md

### Support

- **GitHub Issues**: [Créer un issue](https://github.com/votre-repo/llmui-core/issues)
- **Email**: support@genie-ia.ca
- **Documentation**: [Wiki](https://github.com/votre-repo/llmui-core/wiki)

---

## 🎓 Exemples d'utilisation

### Chat simple

```python
import requests

response = requests.post('http://localhost:8004/api/chat', json={
    "message": "Explique-moi l'intelligence artificielle",
    "user_id": "user123"
})

print(response.json()['response'])
```

### Upload et analyse de document

```python
files = {'file': open('document.pdf', 'rb')}
data = {
    'user_id': 'user123',
    'question': 'Résume ce document'
}

response = requests.post(
    'http://localhost:8004/api/upload',
    files=files,
    data=data
)

print(response.json()['summary'])
```

### Conversation avec contexte

```python
# Premier message
response1 = requests.post('http://localhost:8004/api/chat', json={
    "message": "Mon prénom est François",
    "user_id": "user123",
    "conversation_id": "conv_001"
})

# Message avec contexte
response2 = requests.post('http://localhost:8004/api/chat', json={
    "message": "Quel est mon prénom?",
    "user_id": "user123",
    "conversation_id": "conv_001"
})

print(response2.json()['response'])  # "François"
```

---

## ⚙️ Configuration par cas d'usage

> La configuration vit dans `.env` (3 variables) + `/zadmin` (table
> `system_config`). Voir [`docs/CONFIGURATION.md`](CONFIGURATION.md).

### Développement

```bash
# /opt/llmui-core/.env
APP_ENV=development        # logs plus verbeux
```

### Production

- `.env` : `APP_ENV=production`
- TLS : Let's Encrypt + Nginx (`postInstallScripts/nginx_vhost.conf`)
- Sécurité via `/zadmin` → Sécurité : `max_login_attempts`, `lockout_minutes`,
  `totp_required_admin`, `cors_allowed_origins`

### Performance

- Modèles workers/merger et timeouts : `/zadmin`, ou les constantes
  `DEFAULT_WORKER_MODELS` / `TIMEOUT_CONFIG` de `src/llmui_backend.py`

---

## 🚦 Checklist post-installation

- [ ] Services démarrés (backend, proxy, nginx)
- [ ] Interface accessible via navigateur
- [ ] Test API health check OK
- [ ] Test envoi de message OK
- [ ] Ollama répond correctement
- [ ] Logs sans erreurs
- [ ] Pare-feu configuré
- [ ] SSL configuré (si production)
- [ ] Backup configuré

---

## 🎉 Félicitations!

Vous avez maintenant une installation complète de LLMUI Core!

### Prochaines étapes suggérées

1. ✅ Tester différents types de questions
2. ✅ Uploader et analyser des documents
3. ✅ Explorer l'API REST
4. ✅ Configurer SSL pour la production
5. ✅ Lire la documentation complète
6. ✅ Rejoindre la communauté

---

## 💡 Conseils pro

### Performance

- Utilisez un SSD pour `/opt/llmui-core/data`
- Minimum 8GB RAM, 16GB recommandé
- GPU optionnel mais améliore beaucoup les performances

### Sécurité

- Changez le mot de passe par défaut
- Activez SSL en production
- Mettez à jour régulièrement
- Consultez les logs quotidiennement

### Maintenance

```bash
# Backup quotidien
sudo tar -czf ~/llmui-backup-$(date +%Y%m%d).tar.gz /opt/llmui-core/data

# Nettoyage des logs anciens
sudo journalctl --vacuum-time=7d

# Mise à jour
cd /path/to/llmui-core && git pull
sudo python3 andy_deploy_source.py
sudo systemctl restart llmui-core llmui-proxy
```

---

## 📞 Besoin d'aide?

### Ressources

- 📖 **Documentation**: README.md, INSTALL.md
- 🐛 **Bugs**: [GitHub Issues](https://github.com/votre-repo/llmui-core/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/votre-repo/llmui-core/discussions)
- 📧 **Email**: support@genie-ia.ca

### Avant de demander de l'aide

1. Consultez les logs: `sudo journalctl -u llmui-core -n 100`
2. Vérifiez la documentation: README.md et INSTALL.md
3. Recherchez dans les issues existantes
4. Préparez les informations système:
   ```bash
   uname -a
   python3 --version
   ollama --version
   systemctl status llmui-core llmui-proxy nginx
   ```

---

**🎊 Bienvenue dans l'écosystème LLMUI Core!**

*Pour la souveraineté numérique du Québec* 🇨🇦

---

**Francois Chalut** - 2025
