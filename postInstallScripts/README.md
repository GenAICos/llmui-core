# postInstallScripts — llmui-core

Copyright © Technologies Nexios TF Inc. — nexiostf.com

Scripts à exécuter manuellement sur les serveurs d'infrastructure,
**séparément** de l'installateur principal.

## 1. Vhost Nginx

Copier `nginx_vhost.conf` sur le serveur Nginx :

```bash
# Remplacer DOMAIN et APP_PORT (8000 = proxy LLMUI par défaut) puis :
cp nginx_vhost.conf /etc/nginx/sites-available/llmui-core
ln -s /etc/nginx/sites-available/llmui-core /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 2. Création de la base de données

Exécuter `create_database.sql` sur le serveur PostgreSQL :

```bash
# Remplacer DB_PASSWORD dans le fichier (ex: openssl rand -hex 32), puis :
psql -U postgres -f create_database.sql
```

> Ces scripts sont conçus pour être exécutés **une seule fois**
> mais sont idempotents — ils peuvent être relancés sans danger.
> Si le rôle `llmui_user` existe déjà, son mot de passe est
> resynchronisé avec `DB_PASSWORD` (évite le mismatch entre le
> `.env` et PostgreSQL lors d'une réinstallation).
