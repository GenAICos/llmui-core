# -*- coding: utf-8 -*-
# Copyright © Technologies Nexios TF Inc. — nexiostf.com
"""Accès à la configuration système stockée en base (table `system_config`).

Conformément à STANDARDS.md §2, le fichier `.env` ne contient que
DATABASE_URL, APP_PORT et APP_ENV. Toute autre configuration (secrets de
session, clé de chiffrement TOTP, origines CORS, paramètres Andy, etc.) vit
dans `system_config` et est administrée via `/zadmin`.
"""

import json
import logging
from typing import Any, Callable, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db_models import SystemConfig

logger = logging.getLogger("llmui.system_config")


def cast_config_value(value: Optional[str], value_type: str) -> Any:
    """Convertit la valeur texte stockée selon `value_type`."""
    if value is None:
        return None
    if value_type == "int":
        return int(value)
    if value_type == "bool":
        return value.strip().lower() in ("true", "1", "yes", "on")
    if value_type == "json":
        return json.loads(value)
    return value


async def get_config(session: AsyncSession, section: str, key: str, default: Any = None) -> Any:
    """Lit une valeur de configuration, typée selon `value_type`."""
    result = await session.execute(
        select(SystemConfig).where(SystemConfig.section == section, SystemConfig.key == key)
    )
    row = result.scalar_one_or_none()
    if row is None or row.value in (None, ""):
        return default
    return cast_config_value(row.value, row.value_type)


async def set_config(session: AsyncSession, section: str, key: str, value: str) -> None:
    """Met à jour une valeur de configuration existante."""
    result = await session.execute(
        select(SystemConfig).where(SystemConfig.section == section, SystemConfig.key == key)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise ValueError(f"Clé de configuration inconnue : {section}.{key}")
    row.value = value
    await session.commit()


async def get_or_create_secret(
    session: AsyncSession, section: str, key: str, generator: Callable[[], str]
) -> str:
    """Récupère un secret stocké en base, ou le génère et le persiste s'il
    est absent/vide (H-01, H-05 : clé de session et clé de chiffrement TOTP
    générées automatiquement au premier démarrage)."""
    result = await session.execute(
        select(SystemConfig).where(SystemConfig.section == section, SystemConfig.key == key)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise ValueError(f"Clé de configuration inconnue : {section}.{key}")
    if row.value:
        return row.value
    new_value = generator()
    row.value = new_value
    await session.commit()
    logger.info("Secret généré automatiquement pour %s.%s", section, key)
    return new_value
