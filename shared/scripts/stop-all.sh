#!/bin/bash
# MyPay Wallets - Stop All Services
# Usage: ./shared/scripts/stop-all.sh

set -e

echo "========================================"
echo " MyPay Wallets - Stop All Services     "
echo "========================================"
echo ""

# Check if we're in the project root
if [ ! -d "easypaisa-onetime" ] || [ ! -d "jazzcash-onetime" ]; then
    echo "❌ Error: Please run this script from the project root (mypay-wallets-onetime/)"
    exit 1
fi

# Stop Easypaisa
echo "🛑 Stopping Easypaisa..."
cd easypaisa-onetime/infrastructure
docker compose down
cd ../..
echo "✅ Easypaisa stopped"

echo ""

# Stop JazzCash
echo "🛑 Stopping JazzCash..."
cd jazzcash-onetime/infrastructure
docker compose down
cd ../..
echo "✅ JazzCash stopped"

echo ""
echo "========================================"
echo " All Services Stopped! 🛑"
echo "========================================"
echo ""
echo "To restart: ./shared/scripts/deploy-all.sh"
echo ""

