#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Copyright © Technologies Nexios TF Inc. — nexiostf.com
"""Crée ou réinitialise le compte administrateur LLMUI Core (C-01).

Le backend ne crée plus aucun compte par défaut : ce script doit être
exécuté manuellement (une fois la base de données initialisée via
`postInstallScripts/create_database.sql`) pour amorcer le premier
administrateur, avec un mot de passe fort choisi par l'opérateur et
hashé avec Argon2 (STANDARDS.md §5/§6).

L'enrôlement TOTP — obligatoire pour les comptes admin — se fait
ensuite via l'interface web, à la première connexion
(`/api/auth/totp/setup` puis `/api/auth/totp/activate`).

Usage :
    python3 scripts/create_admin.py
"""

import asyncio
import getpass
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from sqlalchemy import func, select  # noqa: E402

import security  # noqa: E402
from db_models import User, async_session_factory, engine  # noqa: E402

# Min. 12 caractères, au moins une majuscule, une minuscule, un chiffre
# et un caractère spécial (STANDARDS.md §5 — politique /zadmin).
_PASSWORD_PATTERN = re.compile(r"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$")


def _prompt_email() -> str:
    while True:
        email = input("Courriel de l'administrateur : ").strip().lower()
        if "@" in email and "." in email.rsplit("@", 1)[-1]:
            return email
        print("Adresse courriel invalide.")


def _prompt_full_name() -> str:
    return input("Nom complet (optionnel) : ").strip()


def _prompt_password() -> str:
    print(
        "\nLe mot de passe doit contenir au moins 12 caractères, dont une "
        "majuscule, une minuscule, un chiffre et un caractère spécial."
    )
    while True:
        password = getpass.getpass("Mot de passe : ")
        if not _PASSWORD_PATTERN.match(password):
            print("Mot de passe trop faible — veuillez réessayer.")
            continue
        confirm = getpass.getpass("Confirmez le mot de passe : ")
        if password != confirm:
            print("Les mots de passe ne correspondent pas.")
            continue
        return password


async def create_or_update_admin(email: str, full_name: str, password: str) -> bool:
    """Crée le compte admin s'il n'existe pas, ou met à jour son mot de
    passe et son statut admin/actif s'il existe déjà.

    Retourne `True` si un compte a été créé, `False` s'il a été mis à jour.
    """
    password_hash = security.hash_password(password)

    async with async_session_factory() as session:
        result = await session.execute(select(User).where(func.lower(User.email) == email))
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                email=email,
                password_hash=password_hash,
                full_name=full_name or None,
                is_admin=True,
                is_active=True,
            )
            session.add(user)
            await session.commit()
            return True

        user.password_hash = password_hash
        user.is_admin = True
        user.is_active = True
        if full_name:
            user.full_name = full_name
        await session.commit()
        return False


async def main() -> None:
    print("=== Création / réinitialisation de l'administrateur LLMUI Core ===\n")

    email = _prompt_email()
    full_name = _prompt_full_name()
    password = _prompt_password()

    try:
        created = await create_or_update_admin(email, full_name, password)
    finally:
        await engine.dispose()

    if created:
        print(f"\n✓ Compte administrateur créé : {email}")
    else:
        print(f"\n✓ Compte administrateur mis à jour : {email}")

    print(
        "\nConnectez-vous sur la page de connexion avec ce courriel et ce "
        "mot de passe. La configuration TOTP (obligatoire) vous sera "
        "demandée automatiquement à la première connexion."
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nAnnulé.")
        sys.exit(1)
