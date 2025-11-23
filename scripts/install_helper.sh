#!/bin/bash
#
# LLMUI Core v0.5.0 - Installation Helper with Integrated Backup
# Script qui gère directement l'installation avec backup
# Author: François Chalut | contact@llmui.org
#

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="/opt/llmui"
DATA_DIR="/var/lib/llmui"
BACKUP_DIR="/var/backups/llmui"

print_header() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                    ║"
    echo "║            🚀 LLMUI Core v0.5.0 - Installation avec Backup         ║"
    echo "║                                                                    ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}❌ Ce script doit être exécuté en tant que root${NC}"
        echo -e "${YELLOW}   Utilisez: sudo $0${NC}"
        exit 1
    fi
}

detect_existing() {
    echo -e "${BLUE}🔍 Vérification installation existante...${NC}"
    
    if [ -d "$INSTALL_DIR" ] || [ -d "$DATA_DIR" ]; then
        echo -e "${YELLOW}⚠️  Installation LLMUI détectée${NC}"
        
        # Version
        if [ -f "$INSTALL_DIR/VERSION" ]; then
            VERSION=$(cat "$INSTALL_DIR/VERSION")
            echo -e "   📦 Version: ${CYAN}$VERSION${NC}"
        fi
        
        # Database
        if [ -f "$DATA_DIR/llmui.db" ]; then
            DB_SIZE=$(du -h "$DATA_DIR/llmui.db" | cut -f1)
            echo -e "   🗄️  Database: ${CYAN}$DB_SIZE${NC}"
        fi
        
        # Services
        echo -e "   🔧 Services:"
        for service in llmui-backend llmui-proxy; do
            if systemctl is-active --quiet $service 2>/dev/null; then
                echo -e "      ✅ $service: ${GREEN}actif${NC}"
            else
                echo -e "      ❌ $service: ${RED}inactif${NC}"
            fi
        done
        
        return 0  # Existe
    else
        echo -e "${GREEN}✅ Aucune installation existante${NC}"
        return 1  # N'existe pas
    fi
}

create_backup() {
    echo ""
    echo -e "${BLUE}💾 Création du backup...${NC}"
    
    # Crée le dossier backup
    mkdir -p "$BACKUP_DIR"
    
    # Timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/llmui_backup_$TIMESTAMP.tar.gz"
    
    # Arrête les services
    echo -e "${YELLOW}   ⏸️  Arrêt des services...${NC}"
    systemctl stop llmui-backend 2>/dev/null || true
    systemctl stop llmui-proxy 2>/dev/null || true
    
    # Crée le backup
    echo -e "${BLUE}   📦 Compression des données...${NC}"
    
    BACKUP_ITEMS=()
    [ -d "$DATA_DIR" ] && BACKUP_ITEMS+=("$DATA_DIR")
    [ -d "$INSTALL_DIR" ] && BACKUP_ITEMS+=("$INSTALL_DIR")
    [ -d "/etc/llmui" ] && BACKUP_ITEMS+=("/etc/llmui")
    
    if [ ${#BACKUP_ITEMS[@]} -gt 0 ]; then
        tar -czf "$BACKUP_FILE" "${BACKUP_ITEMS[@]}" 2>/dev/null || {
            echo -e "${RED}❌ Erreur création backup${NC}"
            return 1
        }
        
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}   ✅ Backup créé: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
        return 0
    else
        echo -e "${YELLOW}   ⚠️  Aucune donnée à sauvegarder${NC}"
        return 1
    fi
}

show_menu() {
    echo ""
    echo -e "${CYAN}┌─────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│  Que souhaitez-vous faire ?                             │${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│  1)${NC} 💾 ${GREEN}Sauvegarder et réinstaller${NC} (recommandé)     │"
    echo -e "${CYAN}│  2)${NC} 🗑️  ${YELLOW}Réinstaller sans backup${NC} (DANGEREUX)          │"
    echo -e "${CYAN}│  3)${NC} 🔄 ${BLUE}Mettre à jour seulement${NC}                      │"
    echo -e "${CYAN}│  4)${NC} ❌ ${RED}Annuler${NC}                                      │"
    echo -e "${CYAN}└─────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

run_installation() {
    local mode=$1
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🚀 Démarrage de l'installation${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Lance le script d'installation principal
    if [ -f "$SCRIPT_DIR/install.sh" ]; then
        echo -e "${GREEN}📜 Exécution de install.sh...${NC}"
        bash "$SCRIPT_DIR/install.sh"
    elif [ -f "$SCRIPT_DIR/install_interactive.sh" ]; then
        echo -e "${GREEN}📜 Exécution de install_interactive.sh...${NC}"
        bash "$SCRIPT_DIR/install_interactive.sh"
    else
        echo -e "${RED}❌ Script d'installation introuvable${NC}"
        exit 1
    fi
}

list_backups() {
    echo ""
    echo -e "${BLUE}📋 Backups disponibles:${NC}"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
        echo -e "${YELLOW}   Aucun backup trouvé${NC}"
        return
    fi
    
    local count=0
    for backup in "$BACKUP_DIR"/llmui_backup_*.tar.gz; do
        if [ -f "$backup" ]; then
            count=$((count + 1))
            local filename=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date=$(echo "$filename" | grep -oP '\d{8}_\d{6}')
            local formatted_date=$(echo "$date" | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)_\([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
            
            echo -e "   $count) 📦 $formatted_date - $size"
        fi
    done
    
    if [ $count -eq 0 ]; then
        echo -e "${YELLOW}   Aucun backup trouvé${NC}"
    fi
}

restore_backup() {
    list_backups
    
    echo ""
    read -p "Entrez le numéro du backup à restaurer (0 pour annuler): " choice
    
    if [ "$choice" = "0" ] || [ -z "$choice" ]; then
        echo -e "${YELLOW}Restauration annulée${NC}"
        return
    fi
    
    # Trouve le backup correspondant
    local count=0
    local selected_backup=""
    for backup in "$BACKUP_DIR"/llmui_backup_*.tar.gz; do
        if [ -f "$backup" ]; then
            count=$((count + 1))
            if [ "$count" -eq "$choice" ]; then
                selected_backup="$backup"
                break
            fi
        fi
    done
    
    if [ -z "$selected_backup" ]; then
        echo -e "${RED}❌ Backup invalide${NC}"
        return 1
    fi
    
    echo ""
    echo -e "${YELLOW}⚠️  ATTENTION: Cette opération va écraser l'installation actuelle${NC}"
    read -p "Continuer? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Restauration annulée${NC}"
        return
    fi
    
    echo ""
    echo -e "${BLUE}📦 Restauration du backup...${NC}"
    
    # Arrête les services
    systemctl stop llmui-backend 2>/dev/null || true
    systemctl stop llmui-proxy 2>/dev/null || true
    
    # Extrait le backup
    tar -xzf "$selected_backup" -C / 2>/dev/null || {
        echo -e "${RED}❌ Erreur lors de la restauration${NC}"
        return 1
    }
    
    # Recharge systemd et démarre les services
    systemctl daemon-reload
    systemctl start llmui-backend
    systemctl start llmui-proxy
    
    echo -e "${GREEN}✅ Backup restauré avec succès!${NC}"
}

main() {
    print_header
    
    echo -e "${CYAN}Auteur:  ${NC}François Chalut"
    echo -e "${CYAN}Website: ${NC}https://llmui.org"
    echo ""
    
    check_root
    
    # Détecte installation existante
    if detect_existing; then
        # Installation existe
        show_menu
        read -p "Votre choix [1-4]: " choice
        
        case $choice in
            1)
                echo -e "${GREEN}✅ Installation avec backup${NC}"
                if create_backup; then
                    echo ""
                    read -p "Backup créé. Continuer l'installation? (yes/no): " confirm
                    if [ "$confirm" = "yes" ]; then
                        run_installation "with_backup"
                    else
                        echo -e "${YELLOW}Installation annulée${NC}"
                    fi
                else
                    echo -e "${RED}Backup échoué. Installation annulée par sécurité.${NC}"
                    exit 1
                fi
                ;;
            2)
                echo -e "${YELLOW}⚠️  Installation sans backup${NC}"
                read -p "ATTENTION: Données perdues définitivement! Continuer? (yes/no): " confirm
                if [ "$confirm" = "yes" ]; then
                    run_installation "without_backup"
                else
                    echo -e "${YELLOW}Installation annulée${NC}"
                fi
                ;;
            3)
                echo -e "${BLUE}🔄 Mise à jour${NC}"
                run_installation "update"
                ;;
            4)
                echo -e "${RED}Installation annulée${NC}"
                exit 0
                ;;
            5)
                # Easter egg: restauration
                restore_backup
                ;;
            *)
                echo -e "${RED}Choix invalide${NC}"
                exit 1
                ;;
        esac
    else
        # Pas d'installation existante
        echo ""
        read -p "Procéder à l'installation? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            run_installation "fresh"
        else
            echo -e "${YELLOW}Installation annulée${NC}"
            exit 0
        fi
    fi
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ Installation terminée!                                 ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Affiche les backups disponibles
    list_backups
}

# Point d'entrée
main "$@"
