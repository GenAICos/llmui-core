#!/usr/bin/env python3
"""
Script de diagnostic LLMUI Backend
Vérifie pourquoi le backend ne répond pas
"""

import subprocess
import os
import sys
import sqlite3

def check(description, command):
    """Exécute une vérification"""
    print(f"\n🔍 {description}...")
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"   ✓ OK")
        if result.stdout.strip():
            print(f"   → {result.stdout.strip()}")
        return True
    else:
        print(f"   ✗ ÉCHEC")
        if result.stderr.strip():
            print(f"   → {result.stderr.strip()}")
        return False

print("="*60)
print(" DIAGNOSTIC LLMUI BACKEND")
print("="*60)

# 1. Vérifier que le service backend existe
check("Service backend existe", "systemctl list-unit-files | grep llmui-backend")

# 2. Vérifier l'état du service
check("État du service backend", "systemctl is-active llmui-backend")

# 3. Voir les dernières lignes de logs
print("\n📋 Logs backend (20 dernières lignes):")
print("-"*60)
subprocess.run("journalctl -u llmui-backend -n 20 --no-pager", shell=True)

# 4. Vérifier que le fichier backend existe
check("Fichier backend existe", "test -f /opt/llmui-core/src/llmui_backend.py")

# 5. Vérifier l'environnement virtuel
check("Environnement virtuel existe", "test -d /opt/llmui-core/venv")

# 6. Vérifier que Python fonctionne dans le venv
check("Python dans venv", "/opt/llmui-core/venv/bin/python --version")

# 7. Vérifier les dépendances
print("\n📦 Dépendances Python:")
subprocess.run("/opt/llmui-core/venv/bin/pip list | grep -E '(fastapi|uvicorn|sqlite|httpx)'", shell=True)

# 8. Vérifier la base de données
db_path = "/var/lib/llmui/llmui.db"
if os.path.exists(db_path):
    print(f"\n✓ Base de données existe: {db_path}")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"   Tables: {[t[0] for t in tables]}")
        
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"   Utilisateurs: {user_count}")
        conn.close()
    except Exception as e:
        print(f"   ✗ Erreur lecture DB: {e}")
else:
    print(f"\n✗ Base de données manquante: {db_path}")

# 9. Tester le port 5000
check("Port 5000 écoute", "netstat -tlnp | grep :5000 || ss -tlnp | grep :5000")

# 10. Tester une requête directe
print("\n🌐 Test requête HTTP directe sur port 5000:")
subprocess.run("curl -I http://127.0.0.1:5000/ 2>/dev/null || echo '✗ Backend ne répond pas'", shell=True)

print("\n" + "="*60)
print(" ACTIONS RECOMMANDÉES")
print("="*60)
print("\n1. Démarrer le backend:")
print("   sudo systemctl start llmui-backend")
print("\n2. Voir les logs en temps réel:")
print("   sudo journalctl -u llmui-backend -f")
print("\n3. Redémarrer tout:")
print("   sudo systemctl restart llmui-backend llmui-proxy nginx")
print()
