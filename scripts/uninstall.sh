#!/bin/bash

# ============================================================================
# LLMUI Core v0.5.0 - Complete Uninstallation Script
# ============================================================================
# Author: François Chalut
# Website: https://llmui.org
#
# This script completely removes LLMUI Core from your system:
# - Stops and removes systemd services
# - Removes all installation files
# - Removes user and group
# - Optionally removes data and logs
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
INSTALL_DIR="/opt/llmui-core"
DATA_DIR="/var/lib/llmui"
LOG_DIR="/var/log/llmui"
USER="llmui"
GROUP="llmui"

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================================================
# BANNER
# ============================================================================

clear
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   LLMUI Core v0.5.0 - Uninstallation Script     ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# ROOT CHECK
# ============================================================================

if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   echo "Please run: sudo $0"
   exit 1
fi

log_success "Running as root"

# ============================================================================
# WARNING & CONFIRMATION
# ============================================================================

echo ""
echo -e "${RED}⚠️  WARNING: This will completely remove LLMUI Core!${NC}"
echo ""
echo "The following will be removed:"
echo "  • All services (llmui-backend, llmui-proxy)"
echo "  • Installation directory: $INSTALL_DIR"
echo "  • User and group: $USER"
echo "  • Systemd service files"
echo "  • Log rotation configuration"
echo ""
echo "The following can be optionally removed:"
echo "  • Database and data: $DATA_DIR"
echo "  • Log files: $LOG_DIR"
echo ""

while true; do
    read -p "Continue with uninstallation? (yes/no): " user_input
    user_input=$(echo "$user_input" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
    
    if [[ "$user_input" == "yes" ]]; then
        break
    elif [[ "$user_input" == "no" ]]; then
        echo "Uninstallation cancelled."
        exit 0
    else
        log_warning "Please type 'yes' to continue or 'no' to cancel."
    fi
done

# Ask about data
echo ""
REMOVE_DATA=false
while true; do
    read -p "Remove database and data directory? (y/N): " user_input
    user_input=$(echo "$user_input" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
    
    if [[ "$user_input" == "y" || "$user_input" == "yes" ]]; then
        REMOVE_DATA=true
        break
    elif [[ "$user_input" == "" || "$user_input" == "n" || "$user_input" == "no" ]]; then
        REMOVE_DATA=false
        break
    else
        log_warning "Invalid input. Please enter 'y' for yes or 'n' for no."
    fi
done

# Ask about logs
REMOVE_LOGS=false
while true; do
    read -p "Remove log files? (y/N): " user_input
    user_input=$(echo "$user_input" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
    
    if [[ "$user_input" == "y" || "$user_input" == "yes" ]]; then
        REMOVE_LOGS=true
        break
    elif [[ "$user_input" == "" || "$user_input" == "n" || "$user_input" == "no" ]]; then
        REMOVE_LOGS=false
        break
    else
        log_warning "Invalid input. Please enter 'y' for yes or 'n' for no."
    fi
done

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║           Starting Uninstallation              ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# STEP 1: STOP AND DISABLE SERVICES
# ============================================================================

log_info "Stopping LLMUI services..."

if systemctl is-active --quiet llmui-backend 2>/dev/null; then
    systemctl stop llmui-backend
    log_success "llmui-backend stopped"
else
    log_info "llmui-backend was not running"
fi

if systemctl is-active --quiet llmui-proxy 2>/dev/null; then
    systemctl stop llmui-proxy
    log_success "llmui-proxy stopped"
else
    log_info "llmui-proxy was not running"
fi

log_info "Disabling LLMUI services..."

if systemctl is-enabled --quiet llmui-backend 2>/dev/null; then
    systemctl disable llmui-backend
    log_success "llmui-backend disabled"
fi

if systemctl is-enabled --quiet llmui-proxy 2>/dev/null; then
    systemctl disable llmui-proxy
    log_success "llmui-proxy disabled"
fi

# ============================================================================
# STEP 2: REMOVE SYSTEMD SERVICE FILES
# ============================================================================

log_info "Removing systemd service files..."

if [ -f /etc/systemd/system/llmui-backend.service ]; then
    rm -f /etc/systemd/system/llmui-backend.service
    log_success "llmui-backend.service removed"
fi

if [ -f /etc/systemd/system/llmui-proxy.service ]; then
    rm -f /etc/systemd/system/llmui-proxy.service
    log_success "llmui-proxy.service removed"
fi

systemctl daemon-reload
log_success "Systemd daemon reloaded"

# ============================================================================
# STEP 3: REMOVE INSTALLATION DIRECTORY
# ============================================================================

log_info "Removing installation directory..."

if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    log_success "Installation directory removed: $INSTALL_DIR"
else
    log_info "Installation directory not found: $INSTALL_DIR"
fi

# ============================================================================
# STEP 4: REMOVE DATA DIRECTORY (OPTIONAL)
# ============================================================================

if [ "$REMOVE_DATA" = true ]; then
    log_info "Removing data directory..."
    
    if [ -d "$DATA_DIR" ]; then
        rm -rf "$DATA_DIR"
        log_success "Data directory removed: $DATA_DIR"
    else
        log_info "Data directory not found: $DATA_DIR"
    fi
else
    log_info "Data directory preserved: $DATA_DIR"
fi

# ============================================================================
# STEP 5: REMOVE LOG DIRECTORY (OPTIONAL)
# ============================================================================

if [ "$REMOVE_LOGS" = true ]; then
    log_info "Removing log directory..."
    
    if [ -d "$LOG_DIR" ]; then
        rm -rf "$LOG_DIR"
        log_success "Log directory removed: $LOG_DIR"
    else
        log_info "Log directory not found: $LOG_DIR"
    fi
else
    log_info "Log directory preserved: $LOG_DIR"
fi

# ============================================================================
# STEP 6: REMOVE LOG ROTATION CONFIGURATION
# ============================================================================

log_info "Removing log rotation configuration..."

if [ -f /etc/logrotate.d/llmui ]; then
    rm -f /etc/logrotate.d/llmui
    log_success "Log rotation configuration removed"
fi

# ============================================================================
# STEP 7: REMOVE USER AND GROUP
# ============================================================================

log_info "Removing user and group..."

if id -u "$USER" &>/dev/null; then
    userdel "$USER" 2>/dev/null || true
    log_success "User '$USER' removed"
else
    log_info "User '$USER' not found"
fi

if getent group "$GROUP" &>/dev/null; then
    groupdel "$GROUP" 2>/dev/null || true
    log_success "Group '$GROUP' removed"
else
    log_info "Group '$GROUP' not found"
fi

# ============================================================================
# COMPLETION
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║        Uninstallation Complete! ✅             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}LLMUI Core has been successfully removed!${NC}"
echo ""
echo -e "${CYAN}Removed:${NC}"
echo "  ✅ Services (llmui-backend, llmui-proxy)"
echo "  ✅ Installation directory: $INSTALL_DIR"
echo "  ✅ User and group: $USER"
echo "  ✅ Systemd service files"
echo "  ✅ Log rotation configuration"

if [ "$REMOVE_DATA" = true ]; then
    echo "  ✅ Data directory: $DATA_DIR"
else
    echo "  ⏭️  Data directory preserved: $DATA_DIR"
fi

if [ "$REMOVE_LOGS" = true ]; then
    echo "  ✅ Log directory: $LOG_DIR"
else
    echo "  ⏭️  Log directory preserved: $LOG_DIR"
fi

echo ""
echo -e "${CYAN}Note:${NC}"
echo "  • Ollama was NOT removed (if installed)"
echo "  • Python was NOT removed"
echo "  • System packages were NOT removed"

if [ "$REMOVE_DATA" = false ] || [ "$REMOVE_LOGS" = false ]; then
    echo ""
    echo -e "${YELLOW}Preserved directories:${NC}"
    
    if [ "$REMOVE_DATA" = false ] && [ -d "$DATA_DIR" ]; then
        echo "  • Data: $DATA_DIR"
        echo "    Remove manually with: sudo rm -rf $DATA_DIR"
    fi
    
    if [ "$REMOVE_LOGS" = false ] && [ -d "$LOG_DIR" ]; then
        echo "  • Logs: $LOG_DIR"
        echo "    Remove manually with: sudo rm -rf $LOG_DIR"
    fi
fi

echo ""
echo -e "${CYAN}To reinstall LLMUI Core:${NC}"
echo "  sudo ./install.sh"
echo ""

exit 0
