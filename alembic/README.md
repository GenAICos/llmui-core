# Migrations Alembic — LLMUI Core

> Copyright © Technologies Nexios TF Inc. — nexiostf.com
> STANDARDS.md §2 : « Migrations : Alembic — toujours, sans exception ».

Alembic gère l'évolution du schéma PostgreSQL. La connexion provient de
`DATABASE_URL` (`.env`, §2) — résolue par `env.py`, jamais codée dans
`alembic.ini`. Le metadata cible est celui de `src/db_models.py`.

## Schéma de référence

La révision initiale (`schema initial`) crée **les 8 tables**, les extensions
(`uuid-ossp`, `pgcrypto`) et amorce `system_config` — soit l'équivalent exact
de `postInstallScripts/create_database.sql`.

## Première installation

`postInstallScripts/create_database.sql` crée la base, le rôle, les permissions
**et les tables**. L'installateur marque ensuite la révision de référence comme
appliquée (sans la rejouer) :

```bash
DATABASE_URL=postgresql+asyncpg://llmui_user:MDP@localhost:5432/llmui_core \
  alembic stamp head
```

## Faire évoluer le schéma

```bash
# 1. Modifier les modèles dans src/db_models.py
# 2. Générer la migration (message descriptif obligatoire — §13)
alembic revision --autogenerate -m "ajout colonne X à users"
# 3. RELIRE le fichier généré dans alembic/versions/ (toujours vérifier upgrade/downgrade)
# 4. Appliquer
alembic upgrade head
```

## Commandes utiles

```bash
alembic current            # révision appliquée
alembic history --verbose  # historique
alembic upgrade head       # appliquer les migrations en attente
alembic downgrade -1       # annuler la dernière (rollback — §2)
```

> ⚠️ `DATABASE_URL` doit être présente (environnement ou `.env`). Les fichiers
> de `versions/` sont **versionnés dans Git** ; jamais de `DROP` sans
> `downgrade()` correspondant.
