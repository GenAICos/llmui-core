#!/bin/bash

# LLMUI Core - SSL Certificate Generator
# Author: François Chalut
# Website: https://llmui.org
# Version: 2.0.0

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   LLMUI Core - SSL Certificate Generator      ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root${NC}" 
   echo "Run: sudo ./scripts/generate_ssl.sh"
   exit 1
fi

# SSL directory
SSL_DIR="/opt/llmui-core/ssl"
echo -e "${BLUE}[1/5]${NC} Creating SSL directory..."
mkdir -p "$SSL_DIR"
cd "$SSL_DIR"

# Check if certificates already exist
if [ -f "llmui.crt" ] && [ -f "llmui.key" ]; then
    echo -e "${YELLOW}⚠️  SSL certificates already exist${NC}"
    read -p "Do you want to regenerate them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}ℹ️  Keeping existing certificates${NC}"
        exit 0
    fi
    echo -e "${YELLOW}🔄 Regenerating certificates...${NC}"
fi

# Generate private key
echo -e "${BLUE}[2/5]${NC} Generating private key (2048 bits)..."
openssl genrsa -out llmui.key 2048 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Private key generated${NC}"
else
    echo -e "${RED}❌ Failed to generate private key${NC}"
    exit 1
fi

# Generate self-signed certificate
echo -e "${BLUE}[3/5]${NC} Generating self-signed certificate (valid 365 days)..."

# Get hostname
HOSTNAME=$(hostname)
echo -e "${YELLOW}ℹ️  Using hostname: $HOSTNAME${NC}"

openssl req -new -x509 -key llmui.key -out llmui.crt -days 365 \
    -subj "/C=CA/ST=Quebec/L=Plessisville/O=LLMUI Core/OU=Development/CN=$HOSTNAME" \
    2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Certificate generated${NC}"
else
    echo -e "${RED}❌ Failed to generate certificate${NC}"
    exit 1
fi

# Set permissions
echo -e "${BLUE}[4/5]${NC} Setting secure permissions..."
chmod 600 llmui.key
chmod 644 llmui.crt
chown root:root llmui.key llmui.crt

echo -e "${GREEN}✅ Permissions set${NC}"

# Display certificate info
echo -e "${BLUE}[5/5]${NC} Certificate information:"
echo ""
openssl x509 -in llmui.crt -noout -subject -dates 2>/dev/null | while IFS= read -r line; do
    echo -e "${YELLOW}  $line${NC}"
done

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║          SSL Certificates Generated            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}📁 Location:${NC} $SSL_DIR"
echo -e "${GREEN}🔑 Private key:${NC} llmui.key"
echo -e "${GREEN}📜 Certificate:${NC} llmui.crt"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "   1. Restart services with SSL:"
echo "      ${GREEN}sudo systemctl restart llmui-backend${NC}"
echo "      ${GREEN}sudo systemctl restart llmui-proxy${NC}"
echo ""
echo "   2. Or start manually with SSL:"
echo "      ${GREEN}cd /opt/llmui-core${NC}"
echo "      ${GREEN}python3 src/llmui_backend.py --ssl${NC}"
echo "      ${GREEN}python3 src/llmui_proxy.py --ssl${NC}"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "   - These are self-signed certificates"
echo "   - Your browser will show a security warning"
echo "   - Click 'Advanced' and 'Proceed' to access"
echo "   - For production, use Let's Encrypt or commercial certificates"
echo ""
echo -e "${GREEN}✨ SSL certificates ready!${NC}"
echo ""

exit 0
