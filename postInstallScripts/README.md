# postInstallScripts — LLMUI Core

> Copyright © Technologies Nexios TF Inc. — nexiostf.com

Scripts à exécuter manuellement sur les serveurs d'infrastructure,
**séparément** de l'installateur principal (`installer/install.sh`).

---

## Contenu

| Fichier | Description |
|---------|-------------|
| `nginx_vhost.conf` | Vhost Nginx complet — HTTPS, headers sécurité, proxy FastAPI |
| `create_database.sql` | Création DB PostgreSQL, user applicatif, permissions, tables initiales |
| `README.md` | Ce fichier |

---

## 1. Création de la base de données PostgreSQL

**Pré-requis** : PostgreSQL 16+ installé et démarré.

1. Éditer `create_database.sql` et remplacer `DB_PASSWORD` par un mot de passe fort :

```bash
# Générer un mot de passe sécurisé
openssl rand -hex 32
```

2. Exécuter le script sur le serveur PostgreSQL :

```bash
psql -U postgres -f create_database.sql
```

3. Mettre à jour le fichier `.env` avec les nouvelles valeurs :

```env
DATABASE_URL=postgresql+asyncpg://llmui_user:VOTRE_MOT_DE_PASSE@localhost:5432/llmui_core
APP_PORT=8004
APP_ENV=production
```

> Ce script est idempotent — il peut être relancé sans erreur si la DB existe déjà.

---

## 2. Configuration Nginx

**Pré-requis** : Nginx installé, certbot et certificat Let's Encrypt obtenu.

1. Remplacer les variables dans `nginx_vhost.conf` :

   | Variable | Exemple |
   |----------|---------|
   | `DOMAIN` | `llmui.monentreprise.com` |
   | `APP_PORT` | `8004` |

2. Copier et activer le vhost :

```bash
# Remplacer les variables
sed -i 's/DOMAIN/llmui.monentreprise.com/g' nginx_vhost.conf
sed -i 's/APP_PORT/8004/g' nginx_vhost.conf

# Copier vers Nginx
cp nginx_vhost.conf /etc/nginx/sites-available/llmui-core
ln -s /etc/nginx/sites-available/llmui-core /etc/nginx/sites-enabled/

# Tester et recharger
nginx -t && systemctl reload nginx
```

3. Obtenir le certificat Let's Encrypt (si pas déjà fait) :

```bash
certbot --nginx -d llmui.monentreprise.com --non-interactive --agree-tos -m admin@example.com
systemctl enable certbot.timer
```

---

## Notes importantes

- Ces scripts sont conçus pour être exécutés **une seule fois** lors de la mise en service
- Les deux scripts sont idempotents — ils peuvent être relancés sans danger
- Le mot de passe de `create_database.sql` ne doit **jamais** être committé dans Git
- Pour les mises à jour de schéma, utiliser les migrations Alembic (voir `installer/`)

---

*Technologies Nexios TF Inc. — nexiostf.com — La Tuque, Québec, Canada*
