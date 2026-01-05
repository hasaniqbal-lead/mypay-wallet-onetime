#!/bin/bash
# MyPay Wallets - Deploy All Services
# Usage: ./shared/scripts/deploy-all.sh

set -e

echo "========================================"
echo " MyPay Wallets - One-Time Platform     "
echo " Deploy All Services                    "
echo "========================================"
echo ""

# Check if we're in the project root
if [ ! -d "easypaisa-onetime" ] || [ ! -d "jazzcash-onetime" ]; then
    echo "❌ Error: Please run this script from the project root (mypay-wallets-onetime/)"
    exit 1
fi

# Deploy Easypaisa
echo "📱 Deploying Easypaisa..."
echo "────────────────────────────────────────"
cd easypaisa-onetime/infrastructure

if [ ! -f ".env" ]; then
    echo "⚠️  Warning: easypaisa-onetime/infrastructure/.env not found"
    echo "Please create .env file with Easypaisa credentials"
    cd ../..
else
    docker compose up -d
    echo "✅ Easypaisa deployed"
    cd ../..
fi

echo ""

# Deploy JazzCash
echo "📱 Deploying JazzCash..."
echo "────────────────────────────────────────"
cd jazzcash-onetime/infrastructure

if [ ! -f ".env" ]; then
    echo "⚠️  Warning: jazzcash-onetime/infrastructure/.env not found"
    echo "Please create .env file with JazzCash credentials"
    cd ../..
else
    docker compose up -d
    echo "✅ JazzCash deployed"
    cd ../..
fi

echo ""
echo "========================================"
echo " Deployment Complete! 🎉"
echo "========================================"
echo ""
echo "📊 Service Status:"
docker ps --filter "name=easypaisa-api" --filter "name=jazzcash-api" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔍 Health Checks:"
echo "  Easypaisa: http://localhost:4003/health"
echo "  JazzCash:  http://localhost:4004/health"

echo ""
echo "📝 View Logs:"
echo "  All services:  docker ps"
echo "  Easypaisa:     cd easypaisa-onetime/infrastructure && docker compose logs -f"
echo "  JazzCash:      cd jazzcash-onetime/infrastructure && docker compose logs -f"

echo ""
echo "🛑 Stop All Services:"
echo "  ./shared/scripts/stop-all.sh"
echo ""

