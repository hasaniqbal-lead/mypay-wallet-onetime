#!/bin/bash
# MyPay Wallets API - Quick Deploy Script
# Usage: ./scripts/deploy.sh

set -e

echo "========================================="
echo " MyPay Wallets API - Deployment Script  "
echo "========================================="
echo ""

# Check if we're in the project root
if [ ! -d "infrastructure" ] || [ ! -d "services" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env exists
if [ ! -f "infrastructure/.env" ]; then
    echo "⚠️  Warning: infrastructure/.env not found"
    echo "📝 Creating .env from template..."
    cat > infrastructure/.env << 'EOF'
# Easypaisa Credentials
EASYPAY_USERNAME=your-username
EASYPAY_PASSWORD=your-encrypted-password
EASYPAY_STORE_ID=your-store-id
EASYPAY_DEFAULT_EMAIL=noreply@yourdomain.com

# Database
DB_PASSWORD=change-this-password

# API Key (fallback)
WALLETS_API_KEY=your-api-key
EOF
    echo "✅ Created infrastructure/.env"
    echo "⚠️  Please edit infrastructure/.env with your credentials before continuing"
    echo ""
    read -p "Press Enter after you've configured .env, or Ctrl+C to exit..."
fi

echo "🔧 Checking environment configuration..."
cd infrastructure

# Check required env vars
if grep -q "your-username" .env || grep -q "change-this-password" .env; then
    echo "⚠️  Warning: Default values found in .env file"
    echo "Please update with real credentials"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🏗️  Building Docker images..."
docker compose build

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Waiting for services to start..."
sleep 5

echo "🔍 Checking service health..."
if docker compose ps | grep -q "Up"; then
    echo "✅ Services are running"
    docker compose ps
else
    echo "❌ Error: Services failed to start"
    echo "Logs:"
    docker compose logs
    exit 1
fi

echo ""
echo "========================================="
echo " Deployment Complete! 🎉"
echo "========================================="
echo ""
echo "📍 Health check: http://localhost:4003/health"
echo "📍 API endpoint: http://localhost:4003/api/v1/easypaisa/charge"
echo ""
echo "📊 View logs: docker compose logs -f"
echo "🛑 Stop services: docker compose down"
echo ""
echo "📚 Documentation:"
echo "   - API Reference: docs/API.md"
echo "   - Architecture: docs/ARCHITECTURE.md"
echo "   - Deployment: DEPLOYMENT.md"
echo ""

