#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Copyright © Technologies Nexios TF Inc. — nexiostf.com
"""Outil de diagnostic — vérifie les identifiants d'un compte LLMUI Core (C-07).

Compare le mot de passe saisi (via `getpass`, jamais en argument de ligne
de commande — visible dans `ps aux` et l'historique shell) au hash Argon2
stocké en PostgreSQL pour le courriel donné.

Usage :
    python3 tools/test_login.py <courriel>
"""

import asyncio
import getpass
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from sqlalchemy import func, select  # noqa: E402

import security  # noqa: E402
from db_models import User, async_session_factory, engine  # noqa: E402


async def list_users() -> None:
    async with async_session_factory() as session:
        result = await session.execute(select(User).order_by(User.email))
        users = result.scalars().all()

    print("\n=== UTILISATEURS ===")
    if not users:
        print("Aucun utilisateur trouvé")
        return
    for user in users:
        print(f"  - {user.email} (admin={user.is_admin}, actif={user.is_active}, créé={user.created_at})")


async def test_login(email: str, password: str) -> bool:
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(func.lower(User.email) == email.lower()))
        user = result.scalar_one_or_none()

    if user is None:
        print(f"\n❌ Utilisateur '{email}' introuvable")
        return False

    print(f"\nUtilisateur trouvé : {user.email} (id={user.id}, admin={user.is_admin}, actif={user.is_active})")

    if security.verify_password(password, user.password_hash):
        print("\n✓ Mot de passe valide (Argon2)")
        return True

    print("\n❌ Mot de passe invalide")
    return False


async def main() -> None:
    try:
        await list_users()

        if len(sys.argv) < 2:
            print("\nUsage : python3 tools/test_login.py <courriel>")
            return

        email = sys.argv[1]
        password = getpass.getpass("\nMot de passe à vérifier : ")
        await test_login(email, password)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
