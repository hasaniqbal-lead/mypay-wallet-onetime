#!/bin/bash
# MyPay Wallets API - Database Backup Script
# Usage: ./scripts/backup-db.sh

set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/wallets_db_${TIMESTAMP}.sql"

echo "========================================="
echo " MyPay Wallets - Database Backup        "
echo "========================================="
echo ""

# Check if we're in the project root
if [ ! -d "infrastructure" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database container is running
cd infrastructure
if ! docker compose ps wallets-db | grep -q "Up"; then
    echo "❌ Error: Database container is not running"
    echo "Start it with: cd infrastructure && docker compose up -d wallets-db"
    exit 1
fi

echo "📦 Creating database backup..."
docker compose exec -T wallets-db pg_dump -U wallets_user wallets_db > "../${BACKUP_FILE}"

if [ -f "../${BACKUP_FILE}" ]; then
    SIZE=$(du -h "../${BACKUP_FILE}" | cut -f1)
    echo "✅ Backup created successfully"
    echo "   File: ${BACKUP_FILE}"
    echo "   Size: ${SIZE}"
    echo ""
    
    # Keep only last 7 backups
    echo "🧹 Cleaning old backups (keeping last 7)..."
    cd ..
    ls -t ${BACKUP_DIR}/wallets_db_*.sql | tail -n +8 | xargs -r rm
    
    BACKUP_COUNT=$(ls ${BACKUP_DIR}/wallets_db_*.sql 2>/dev/null | wc -l)
    echo "✅ Total backups: ${BACKUP_COUNT}"
    echo ""
    echo "To restore this backup:"
    echo "  cd infrastructure"
    echo "  docker compose exec -T wallets-db psql -U wallets_user wallets_db < ../${BACKUP_FILE}"
else
    echo "❌ Error: Backup failed"
    exit 1
fi

echo ""
echo "========================================="
echo " Backup Complete! 🎉"
echo "========================================="

