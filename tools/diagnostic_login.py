#!/usr/bin/env python3
"""
==============================================================================
Diagnostic Login - Diagnostique les problèmes de connexion
==============================================================================
"""

import sqlite3
import hashlib
import sys
import os

DB_PATH = "/var/lib/llmui/llmui.db"

def check_database():
    """Vérifie l'existence et l'état de la base de données"""
    print("=== VÉRIFICATION BASE DE DONNÉES ===\n")
    
    # Vérifier l'existence
    if not os.path.exists(DB_PATH):
        print(f"❌ Base de données introuvable: {DB_PATH}")
        print("   → Exécutez: sudo python3 init_database.py")
        return False
    
    print(f"✓ Base trouvée: {DB_PATH}")
    print(f"  Taille: {os.path.getsize(DB_PATH)} octets")
    
    # Vérifier les permissions
    stat_info = os.stat(DB_PATH)
    print(f"  Permissions: {oct(stat_info.st_mode)[-3:]}")
    
    try:
        # Vérifier les tables
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [t[0] for t in cursor.fetchall()]
        
        print(f"  Tables: {', '.join(tables)}")
        
        if 'users' not in tables:
            print("❌ Table 'users' manquante")
            conn.close()
            return False
        
        # Compter les utilisateurs
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"  Utilisateurs: {user_count}")
        
        if user_count == 0:
            print("❌ Aucun utilisateur dans la base")
            conn.close()
            return False
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def list_users_detailed():
    """Liste détaillée des utilisateurs"""
    print("\n=== UTILISATEURS DANS LA BASE ===\n")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, username, password_hash, is_admin, created_at FROM users")
        users = cursor.fetchall()
        
        for i, user in enumerate(users, 1):
            print(f"Utilisateur #{i}:")
            print(f"  ID: {user[0]}")
            print(f"  Username: {user[1]}")
            print(f"  Hash: {user[2][:50]}... (len={len(user[2])})")
            print(f"  Admin: {user[3]}")
            print(f"  Créé: {user[4]}")
            print()
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Erreur: {e}")

def test_password_variations(username, base_password):
    """Teste différentes variations d'un mot de passe"""
    print(f"\n=== TEST VARIATIONS DU MOT DE PASSE ===")
    print(f"Username: {username}")
    print(f"Base password: {base_password}\n")
    
    variations = [
        (base_password, "Original"),
        (base_password.strip(), "Sans espaces"),
        (base_password.replace("!!", "!"), "!! → !"),
        (base_password.replace("!", ""), "Sans !"),
    ]
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Récupérer le hash stocké
        cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
        result = cursor.fetchone()
        
        if not result:
            print(f"❌ Utilisateur '{username}' introuvable")
            conn.close()
            return
        
        stored_hash = result[0]
        print(f"Hash stocké: {stored_hash}\n")
        
        # Tester chaque variation
        for pwd, description in variations:
            test_hash = hashlib.sha256(pwd.encode('utf-8')).hexdigest()
            match = "✓ MATCH!" if test_hash == stored_hash else "✗ Pas de match"
            
            print(f"{description}:")
            print(f"  Password: '{pwd}'")
            print(f"  Hash: {test_hash[:50]}...")
            print(f"  {match}")
            print()
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Erreur: {e}")

def suggest_fixes():
    """Suggère des solutions"""
    print("\n=== SOLUTIONS RECOMMANDÉES ===\n")
    
    print("1. Réinitialiser le mot de passe:")
    print("   sudo python3 reset_password.py admin NouveauMotDePasse")
    print()
    
    print("2. Éviter les caractères problématiques:")
    print("   ❌ Éviter: !! (history bash)")
    print("   ✓ Recommandé: lettres, chiffres, .-_@")
    print()
    
    print("3. Tester le login:")
    print("   python3 test_login.py admin VotreMotDePasse")
    print()

def main():
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║         DIAGNOSTIC LOGIN - LLMUI CORE v0.5.0                ║")
    print("╚══════════════════════════════════════════════════════════════╝\n")
    
    # Vérifier la base
    if not check_database():
        print("\n❌ Problèmes détectés avec la base de données")
        suggest_fixes()
        sys.exit(1)
    
    # Lister les utilisateurs
    list_users_detailed()
    
    # Si arguments fournis, tester le login
    if len(sys.argv) >= 3:
        username = sys.argv[1]
        password = sys.argv[2]
        test_password_variations(username, password)
    else:
        print("Pour tester un mot de passe:")
        print("  python3 diagnostic_login.py <username> <password>")
    
    # Suggestions
    suggest_fixes()

if __name__ == "__main__":
    main()
