# 🚀 Démarrage rapide - LLMUI Core v1.0.0

Guide ultra-rapide pour installer et utiliser LLMUI Core en moins de 15 minutes.

---

## ⚡ Installation express

### Prérequis
- Serveur Linux (Debian/Ubuntu/Rocky/RHEL)
- Python 3.8+
- Accès root (sudo)
- 8GB RAM minimum
- 20GB disque libre

### 3 commandes pour tout installer

```bash
# 1. Cloner le dépôt
git clone https://github.com/votre-repo/llmui-core.git && cd llmui-core

# 2. Lancer l'installation interactive
sudo bash andy_setup.sh

# 3. Choisir option [1] - Installation complète
```

**C'est tout!** Andy s'occupe du reste. ☕

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
# Via Andy
sudo bash andy_setup.sh
# Choisir option [5] - Vérifier l'installation

# Ou manuellement
sudo systemctl status llmui-backend llmui-proxy nginx
```

### Consulter les logs

```bash
# Backend
sudo journalctl -u llmui-backend -f

# Proxy
sudo journalctl -u llmui-proxy -f

# Nginx
sudo tail -f /var/log/nginx/llmui-access.log
```

### Redémarrer les services

```bash
sudo systemctl restart llmui-backend llmui-proxy nginx
```

---

## 📱 API REST rapide

### Health check

```bash
curl http://localhost:5000/api/health
```

### Liste des modèles

```bash
curl http://localhost:5000/api/models
```

### Envoyer un message

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Bonjour!",
    "user_id": "test_user"
  }'
```

---

## 🔧 Configuration rapide

### Fichier principal

Éditez `/opt/llmui-core/config.yaml`:

```yaml
server:
  port: 5000
  
ollama:
  models:
    workers:
      - "phi3:3.8b"
      - "gemma2:2b"
    merger: "granite4:micro-h"

# Redémarrer après modification
```

```bash
sudo systemctl restart llmui-backend llmui-proxy
```

### Ajouter SSL (optionnel)

```bash
sudo certbot --nginx -d votre-domaine.com
```

---

## 🐛 Problèmes courants

### Les services ne démarrent pas

```bash
# Vérifier les logs
sudo journalctl -u llmui-backend -n 50

# Vérifier les permissions
ls -la /opt/llmui-core/

# Redémarrer
sudo systemctl restart llmui-backend llmui-proxy
```

### Page blanche dans le navigateur

```bash
# Vérifier Nginx
sudo systemctl status nginx
sudo nginx -t

# Vérifier le backend
curl http://localhost:5000/api/health
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

response = requests.post('http://localhost:5000/api/chat', json={
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
    'http://localhost:5000/api/upload',
    files=files,
    data=data
)

print(response.json()['summary'])
```

### Conversation avec contexte

```python
# Premier message
response1 = requests.post('http://localhost:5000/api/chat', json={
    "message": "Mon prénom est François",
    "user_id": "user123",
    "conversation_id": "conv_001"
})

# Message avec contexte
response2 = requests.post('http://localhost:5000/api/chat', json={
    "message": "Quel est mon prénom?",
    "user_id": "user123",
    "conversation_id": "conv_001"
})

print(response2.json()['response'])  # "François"
```

---

## ⚙️ Configuration par cas d'usage

### Serveur de développement

```yaml
# config.yaml
server:
  debug: true
  
logging:
  level: "DEBUG"
```

### Production

```yaml
# config.yaml
server:
  ssl_enabled: true
  ssl_cert: "/opt/llmui-core/ssl/cert.pem"
  ssl_key: "/opt/llmui-core/ssl/key.pem"
  
security:
  max_login_attempts: 5
  lockout_duration: 900
  
logging:
  level: "INFO"
```

### Performance maximale

```yaml
# config.yaml
ollama:
  timeout: 120  # Réduire pour réponses plus rapides
  
memory:
  type: "short_term"  # Désactiver RAG pour vitesse
  max_tokens: 2048
```

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
sudo systemctl restart llmui-backend llmui-proxy
```

---

## 📞 Besoin d'aide?

### Ressources

- 📖 **Documentation**: README.md, INSTALL.md
- 🐛 **Bugs**: [GitHub Issues](https://github.com/votre-repo/llmui-core/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/votre-repo/llmui-core/discussions)
- 📧 **Email**: support@genie-ia.ca

### Avant de demander de l'aide

1. Consultez les logs: `sudo journalctl -u llmui-backend -n 100`
2. Vérifiez la documentation: README.md et INSTALL.md
3. Recherchez dans les issues existantes
4. Préparez les informations système:
   ```bash
   uname -a
   python3 --version
   ollama --version
   systemctl status llmui-backend llmui-proxy nginx
   ```

---

**🎊 Bienvenue dans l'écosystème LLMUI Core!**

*Pour la souveraineté numérique du Québec* 🇨🇦

---

**Francois Chalut** - 2025
