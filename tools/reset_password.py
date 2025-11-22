#!/usr/bin/env python3
"""
==============================================================================
Reset Password - Réinitialisation du mot de passe utilisateur
==============================================================================
Change le mot de passe d'un utilisateur de manière sécurisée
==============================================================================
"""

import sqlite3
import hashlib
import sys
import getpass

DB_PATH = "/var/lib/llmui/llmui.db"

def reset_password(username, new_password):
    """Réinitialise le mot de passe d'un utilisateur"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Vérifier que l'utilisateur existe
        cursor.execute("SELECT id, username FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if not user:
            print(f"❌ Utilisateur '{username}' introuvable")
            conn.close()
            return False
        
        # Calculer le nouveau hash
        new_hash = hashlib.sha256(new_password.encode('utf-8')).hexdigest()
        
        # Mettre à jour le mot de passe
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE username = ?",
            (new_hash, username)
        )
        conn.commit()
        
        print(f"\n✓ Mot de passe réinitialisé pour '{username}'")
        print(f"\nDétails:")
        print(f"  Username: {username}")
        print(f"  Nouveau password: {new_password}")
        print(f"  Hash SHA256: {new_hash}")
        print(f"\nVous pouvez maintenant vous connecter avec ce mot de passe.")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def list_users():
    """Liste tous les utilisateurs"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT username, is_admin FROM users")
        users = cursor.fetchall()
        
        print("\n=== UTILISATEURS DISPONIBLES ===")
        if not users:
            print("Aucun utilisateur trouvé")
            return []
        
        for user in users:
            role = "admin" if user[1] else "user"
            print(f"  • {user[0]} ({role})")
        
        conn.close()
        return [u[0] for u in users]
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return []

def main():
    print("=== Réinitialisation de mot de passe LLMUI Core ===")
    
    # Lister les utilisateurs disponibles
    users = list_users()
    
    if not users:
        print("\n❌ Aucun utilisateur trouvé dans la base")
        print("   Utilisez init_database.py pour créer la base")
        sys.exit(1)
    
    # Mode avec arguments
    if len(sys.argv) >= 3:
        username = sys.argv[1]
        new_password = sys.argv[2]
        
        if username not in users:
            print(f"\n❌ Utilisateur '{username}' introuvable")
            print(f"   Utilisateurs disponibles: {', '.join(users)}")
            sys.exit(1)
        
        reset_password(username, new_password)
    
    # Mode interactif
    else:
        print("\n=== Mode interactif ===")
        
        # Sélectionner l'utilisateur
        if len(users) == 1:
            username = users[0]
            print(f"\nUtilisateur sélectionné: {username}")
        else:
            username = input(f"\nNom d'utilisateur [{users[0]}]: ").strip()
            if not username:
                username = users[0]
            
            if username not in users:
                print(f"❌ Utilisateur '{username}' introuvable")
                sys.exit(1)
        
        # Saisir le nouveau mot de passe
        print("\n⚠️  Attention: Évitez les caractères spéciaux complexes dans le mot de passe")
        print("   Recommandé: lettres, chiffres, et symboles simples (.-_@)")
        
        while True:
            new_password = getpass.getpass("\nNouveau mot de passe: ")
            
            if len(new_password) < 4:
                print("❌ Le mot de passe doit contenir au moins 4 caractères")
                continue
            
            # Afficher le mot de passe pour vérification (mode debug)
            print(f"\nMot de passe saisi: {new_password}")
            print(f"Longueur: {len(new_password)} caractères")
            
            # Confirmation
            confirm = input("\nConfirmer ce mot de passe? (o/N): ").strip().lower()
            if confirm == 'o':
                break
            else:
                print("Annulé, veuillez ressaisir.")
        
        # Réinitialiser
        reset_password(username, new_password)

if __name__ == "__main__":
    main()
