#!/bin/bash
# ====================================
# MyPay Wallets API - Deployment Script
# ====================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/opt/mypay-wallets"
REPO_URL="https://github.com/YOUR_USERNAME/mypay-wallets.git"  # Update this
DOMAIN="wallets.mypay.mx"

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}MyPay Wallets API Deployment${NC}"
echo -e "${GREEN}=====================================${NC}"

# ====================================
# Pre-flight checks
# ====================================
echo -e "\n${YELLOW}[1/8] Running pre-flight checks...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed${NC}"
    exit 1
fi

# Check nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}Nginx is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}All pre-flight checks passed!${NC}"

# ====================================
# Create deployment directory
# ====================================
echo -e "\n${YELLOW}[2/8] Setting up deployment directory...${NC}"

if [ -d "$DEPLOY_DIR" ]; then
    echo "Directory exists, pulling latest changes..."
    cd "$DEPLOY_DIR"
    git pull origin main
else
    echo "Cloning repository..."
    git clone "$REPO_URL" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
fi

# ====================================
# Check environment file
# ====================================
echo -e "\n${YELLOW}[3/8] Checking environment configuration...${NC}"

if [ ! -f "$DEPLOY_DIR/deploy/.env.production" ]; then
    echo -e "${RED}Production environment file not found!${NC}"
    echo "Please create $DEPLOY_DIR/deploy/.env.production"
    echo "Use .env.example as a template"
    exit 1
fi

# Copy env file
cp "$DEPLOY_DIR/deploy/.env.production" "$DEPLOY_DIR/deploy/.env"

# Update init-db with actual passwords
echo -e "\n${YELLOW}[4/8] Configuring database initialization...${NC}"

source "$DEPLOY_DIR/deploy/.env"

# Replace placeholder passwords in init-db script
sed -i "s/EASYPAISA_DB_PASSWORD_PLACEHOLDER/$EASYPAISA_DB_PASSWORD/g" "$DEPLOY_DIR/deploy/init-db/01-init.sql"
sed -i "s/JAZZCASH_DB_PASSWORD_PLACEHOLDER/$JAZZCASH_DB_PASSWORD/g" "$DEPLOY_DIR/deploy/init-db/01-init.sql"

# ====================================
# Build and start containers
# ====================================
echo -e "\n${YELLOW}[5/8] Building and starting Docker containers...${NC}"

cd "$DEPLOY_DIR/deploy"

# Stop existing containers if running
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build images
docker compose -f docker-compose.prod.yml build --no-cache

# Start containers
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "Waiting for services to become healthy..."
sleep 30

# ====================================
# Configure Nginx
# ====================================
echo -e "\n${YELLOW}[6/8] Configuring Nginx...${NC}"

# Copy nginx config
cp "$DEPLOY_DIR/deploy/nginx/wallets.mypay.mx.conf" /etc/nginx/sites-available/wallets.mypay.mx

# Create symlink if not exists
if [ ! -L "/etc/nginx/sites-enabled/wallets.mypay.mx" ]; then
    ln -s /etc/nginx/sites-available/wallets.mypay.mx /etc/nginx/sites-enabled/wallets.mypay.mx
fi

# Test nginx config
nginx -t

# ====================================
# SSL Certificate
# ====================================
echo -e "\n${YELLOW}[7/8] Setting up SSL certificate...${NC}"

# Check if certificate already exists
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "Obtaining SSL certificate..."

    # Create temporary config without SSL for initial setup
    cat > /etc/nginx/sites-available/wallets.mypay.mx.temp << 'TEMPCONF'
server {
    listen 80;
    server_name wallets.mypay.mx;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 200 'Setting up SSL...';
        add_header Content-Type text/plain;
    }
}
TEMPCONF

    # Use temp config
    mv /etc/nginx/sites-available/wallets.mypay.mx /etc/nginx/sites-available/wallets.mypay.mx.ssl
    mv /etc/nginx/sites-available/wallets.mypay.mx.temp /etc/nginx/sites-available/wallets.mypay.mx
    nginx -s reload

    # Get certificate
    certbot certonly --webroot -w /var/www/html -d "$DOMAIN" --non-interactive --agree-tos --email admin@mypay.mx

    # Restore SSL config
    mv /etc/nginx/sites-available/wallets.mypay.mx.ssl /etc/nginx/sites-available/wallets.mypay.mx
else
    echo "SSL certificate already exists"
fi

# Reload nginx
nginx -s reload

# ====================================
# Verification
# ====================================
echo -e "\n${YELLOW}[8/8] Verifying deployment...${NC}"

# Check container status
echo -e "\nContainer Status:"
docker compose -f docker-compose.prod.yml ps

# Check health endpoints
echo -e "\nHealth Checks:"

sleep 5

EASYPAISA_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4003/health 2>/dev/null || echo "000")
JAZZCASH_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4004/health 2>/dev/null || echo "000")

if [ "$EASYPAISA_HEALTH" = "200" ]; then
    echo -e "  Easypaisa API: ${GREEN}OK${NC}"
else
    echo -e "  Easypaisa API: ${RED}FAILED (HTTP $EASYPAISA_HEALTH)${NC}"
fi

if [ "$JAZZCASH_HEALTH" = "200" ]; then
    echo -e "  JazzCash API: ${GREEN}OK${NC}"
else
    echo -e "  JazzCash API: ${RED}FAILED (HTTP $JAZZCASH_HEALTH)${NC}"
fi

# ====================================
# Complete
# ====================================
echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e "\nEndpoints:"
echo -e "  Easypaisa: https://$DOMAIN/easypaisa/api/v1/charge"
echo -e "  JazzCash:  https://$DOMAIN/jazzcash/api/v1/charge"
echo -e "\nHealth Checks:"
echo -e "  https://$DOMAIN/easypaisa/health"
echo -e "  https://$DOMAIN/jazzcash/health"
echo -e "\nLogs:"
echo -e "  docker compose -f $DEPLOY_DIR/deploy/docker-compose.prod.yml logs -f"
