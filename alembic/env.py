# Copyright © Technologies Nexios TF Inc. — nexiostf.com
"""Environnement Alembic — LLMUI Core (PostgreSQL async).

- L'URL de connexion provient de `DATABASE_URL` (variable du `.env`,
  STANDARDS.md §2), jamais d'`alembic.ini`.
- Le metadata cible est celui des modèles SQLAlchemy (`src/db_models.py`),
  ce qui permet l'autogénération des migrations.
"""

import asyncio
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ---------------------------------------------------------------------------
# Rendre src/ importable : les modèles (db_models.Base) y vivent.
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from db_models import Base  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _database_url() -> str:
    """Retourne DATABASE_URL depuis l'environnement, sinon depuis le `.env`.

    Aucune dépendance externe (python-dotenv n'est pas requis) : le `.env`
    ne contient que des lignes `CLE=valeur` (STANDARDS.md §2).
    """
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    env_file = PROJECT_ROOT / ".env"
    if env_file.exists():
        for raw in env_file.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError(
        "DATABASE_URL introuvable (ni dans l'environnement, ni dans .env). "
        "Renseignez-la avant de lancer Alembic (STANDARDS.md §2)."
    )


def run_migrations_offline() -> None:
    """Migrations en mode 'offline' (génère le SQL sans connexion)."""
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Migrations en mode 'online' via un moteur async (asyncpg)."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _database_url()
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
