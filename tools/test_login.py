#!/usr/bin/env python3
"""
==============================================================================
Test Login - Vérifie le système de login
==============================================================================
"""

import sqlite3
import hashlib
import sys

DB_PATH = "/var/lib/llmui/llmui.db"

def test_login(username, password):
    """Teste le login avec username/password"""
    print(f"\n=== TEST DE LOGIN ===")
    print(f"Username: {username}")
    print(f"Password: {password}")
    
    # Calculer le hash
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    print(f"Hash calculé: {password_hash}")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Vérifier si l'utilisateur existe
        cursor.execute("SELECT id, username, password_hash, is_admin FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if not user:
            print(f"\n❌ Utilisateur '{username}' introuvable dans la base")
            return False
        
        print(f"\nUtilisateur trouvé:")
        print(f"  ID: {user[0]}")
        print(f"  Username: {user[1]}")
        print(f"  Hash stocké: {user[2]}")
        print(f"  Is admin: {user[3]}")
        
        # Comparer les hash
        if user[2] == password_hash:
            print(f"\n✓ LOGIN RÉUSSI!")
            print(f"  Les hash correspondent")
            return True
        else:
            print(f"\n❌ LOGIN ÉCHOUÉ!")
            print(f"  Hash stocké:  {user[2]}")
            print(f"  Hash calculé: {password_hash}")
            print(f"  Les hash ne correspondent pas")
            return False
        
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        return False

def list_users():
    """Liste tous les utilisateurs"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, username, is_admin, created_at FROM users")
        users = cursor.fetchall()
        
        print(f"\n=== UTILISATEURS DANS LA BASE ===")
        if not users:
            print("Aucun utilisateur trouvé")
        else:
            for user in users:
                print(f"  - {user[1]} (admin={user[2]}, created={user[3]})")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    # Lister les utilisateurs
    list_users()
    
    # Tester le login
    if len(sys.argv) >= 3:
        username = sys.argv[1]
        password = sys.argv[2]
        test_login(username, password)
    else:
        print("\nUsage: python3 test_login.py <username> <password>")
        print("Exemple: python3 test_login.py admin monmotdepasse")
