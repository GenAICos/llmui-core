#!/bin/bash
"""
==============================================================================
Andy Setup - Installation interactive LLMUI Core V 0.5.0
==============================================================================
"""
clear
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║ █████╗ ███╗   ██╗██████╗ ██╗   ██╗ ██╗   ██╗ ██╗   ██████╗ ███████╗      ║
║ ██╔══██╗████╗  ██║██╔══██╗╚██╗ ██╔╝ ██║   ██║ ██║   ██╔═══██╗██╔════╝    ║
║ ███████║██╔██╗ ██║██║  ██║ ╚████╔╝ ██║   ██║ ██║   ██║   ██║███████╗     ║
║ ██╔══██║██║╚██╗██║██║  ██║  ╚██╔╝  ╚██╗ ██╔╝ ██║   ██║   ██║╚════██║     ║
║ ██║  ██║██║ ╚████║██████╔╝   ██║    ╚████╔╝  ╚██████╔╝███████║           ║
║ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝    ╚═╝     ╚═══╝    ╚═════╝ ╚══════╝           ║
║                                                                          ║
║               Assistant DevOps Autonome v0.5.0                           ║
║               Installation automatisée de LLMUI Core                     ║
║                                                                          ║
║                       Francois Chalut                                    ║
║                       Souveraineté Numérique                             ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
EOF
echo ""
echo "Bienvenue dans l'installation interactive de LLMUI Core!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
# Vérification root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    echo " Utilisez: sudo bash andy_setup.sh"
    exit 1
fi
echo "✓ Privilèges root confirmés"
echo ""
# Menu principal
while true; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " MENU PRINCIPAL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo " [1] Installation complète (recommandé)"
    echo " [2] Installation de base uniquement"
    echo " [3] Déployer les fichiers source"
    echo " [4] Démarrer les services"
    echo " [5] Vérifier l'installation"
    echo " [6] Consulter les logs"
    echo " [7] Lire la documentation"
    echo " [Q] Quitter"
    echo ""
    read -p "Votre choix: " choice
    echo ""
   
    case $choice in
        1)
            echo "🚀 Installation complète de LLMUI Core"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "Cette installation comprend:"
            echo " • Mise à jour de l'OS"
            echo " • Installation d'Ollama + 3 modèles LLM"
            echo " • Configuration système complète"
            echo " • Déploiement des fichiers source"
            echo " • Démarrage des services"
            echo ""
            read -p "Continuer? (o/N): " confirm
            if [[ $confirm =~ ^[Oo]$ ]]; then
                echo ""
                echo "═══ ÉTAPE 1/3: Installation de base ═══"
                python3 andy_installer.py
                INSTALL_STATUS=$?        # ← on capture le code de retour

                if [ $INSTALL_STATUS -ne 0 ]; then
                    echo ""
                    echo "❌ ÉCHEC à l'étape 1 (andy_installer.py)"
                    echo "   Consultez le log: /tmp/andy_install.log"
                    read -p "Appuyez sur ENTER pour retourner au menu..."
                    continue
                fi

                echo ""
                echo "═══ ÉTAPE 2/3: Déploiement des sources ═══"
                python3 andy_deploy_source.py
                if [ $? -ne 0 ]; then
                    echo "❌ ÉCHEC à l'étape 2"
                    read -p "Appuyez sur ENTER pour continuer..."
                    continue
                fi

                echo ""
                echo "═══ ÉTAPE 3/3: Démarrage des services ═══"
                python3 andy_start_services.py

                echo ""
                echo "✓ Installation complète terminée avec succès !"
                echo "  Accédez à l'interface via l'IP de votre serveur"
                echo ""
                read -p "Appuyez sur ENTER pour continuer..."
            fi
            ;;
           
        2)
            echo "🔧 Installation de base"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            python3 andy_installer.py
            echo ""
            read -p "Appuyez sur ENTER pour continuer..."
            ;;
           
        3)
            echo "📦 Déploiement des fichiers source"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            python3 andy_deploy_source.py
            echo ""
            read -p "Appuyez sur ENTER pour continuer..."
            ;;
           
        4)
            echo "▶️ Démarrage des services"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            python3 andy_start_services.py
            echo ""
            read -p "Appuyez sur ENTER pour continuer..."
            ;;
           
        5)
            echo "🔍 Vérification de l'installation"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
           
            echo "Services systemd:"
            systemctl is-active llmui-backend && echo " ✓ llmui-backend: actif" || echo " ✗ llmui-backend: inactif"
            systemctl is-active llmui-proxy && echo " ✓ llmui-proxy: actif" || echo " ✗ llmui-proxy: inactif"
            systemctl is-active nginx && echo " ✓ nginx: actif" || echo " ✗ nginx: inactif"
           
            echo ""
            echo "Test HTTP:"
            if curl -I http://localhost/ 2>/dev/null | head -n 1; then
                echo " ✓ Interface accessible"
            else
                echo " ✗ Interface inaccessible"
            fi
           
            echo ""
            echo "Adresse IP du serveur:"
            IP=$(hostname -I | awk '{print $1}')
            echo " → http://$IP/"
           
            echo ""
            read -p "Appuyez sur ENTER pour continuer..."
            ;;
           
        6)
            echo "📋 Logs disponibles"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo " [1] Log d'installation Andy"
            echo " [2] Log backend (temps réel)"
            echo " [3] Log proxy (temps réel)"
            echo " [4] Log Nginx access"
            echo " [5] Log Nginx error"
            echo " [6] Retour"
            echo ""
            read -p "Votre choix: " log_choice
           
            case $log_choice in
                1) less /tmp/andy_install.log 2>/dev/null || echo "Log non trouvé" ;;
                2) journalctl -u llmui-backend -f ;;
                3) journalctl -u llmui-proxy -f ;;
                4) tail -f /var/log/nginx/llmui-access.log 2>/dev/null || echo "Log inexistant" ;;
                5) tail -f /var/log/nginx/llmui-error.log 2>/dev/null || echo "Log inexistant" ;;
                6|*) continue 2 ;;
            esac
            ;;
           
        7)
            echo "📖 Documentation"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            if [ -f README_ANDY.md ]; then
                less README_ANDY.md
            else
                echo "Fichier README_ANDY.md non trouvé dans le répertoire courant"
            fi
            read -p "Appuyez sur ENTER pour continuer..."
            ;;
           
        [Qq])
            echo "👋 Merci d'avoir utilisé Andy!"
            echo ""
            echo "Fichiers importants:"
            echo " • Logs: /tmp/andy_install.log"
            echo " • Base de données: /tmp/andy_installation.db"
            echo " • Installation: /opt/llmui-core/"
            echo ""
            exit 0
            ;;
           
        *)
            echo "❌ Choix invalide"
            echo ""
            ;;
    esac
   
    clear
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════╗
║ Andy v0.5.0 - Assistant DevOps                                           ║
╚══════════════════════════════════════════════════════════════════════════╝
EOF
    echo ""
done
