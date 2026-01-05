#!/bin/bash
# MyPay Wallets - Backup All Databases
# Usage: ./shared/scripts/backup-all.sh

set -e

BACKUP_DIR="shared/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "========================================"
echo " MyPay Wallets - Backup All Databases  "
echo "========================================"
echo ""

# Check if we're in the project root
if [ ! -d "easypaisa-onetime" ] || [ ! -d "jazzcash-onetime" ]; then
    echo "❌ Error: Please run this script from the project root (mypay-wallets-onetime/)"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup Easypaisa
echo "📦 Backing up Easypaisa database..."
cd easypaisa-onetime/infrastructure

if docker compose ps easypaisa-db | grep -q "Up"; then
    docker compose exec -T easypaisa-db pg_dump -U ${DB_USER:-wallets_user} ${DB_NAME:-wallets_db} > "../../${BACKUP_DIR}/easypaisa_${TIMESTAMP}.sql"
    EASYPAISA_SIZE=$(du -h "../../${BACKUP_DIR}/easypaisa_${TIMESTAMP}.sql" | cut -f1)
    echo "✅ Easypaisa backup: ${BACKUP_DIR}/easypaisa_${TIMESTAMP}.sql (${EASYPAISA_SIZE})"
else
    echo "⚠️  Easypaisa database not running, skipping..."
fi

cd ../..

echo ""

# Backup JazzCash
echo "📦 Backing up JazzCash database..."
cd jazzcash-onetime/infrastructure

if docker compose ps jazzcash-db | grep -q "Up"; then
    docker compose exec -T jazzcash-db pg_dump -U ${DB_USER:-jazzcash_user} ${DB_NAME:-jazzcash_db} > "../../${BACKUP_DIR}/jazzcash_${TIMESTAMP}.sql"
    JAZZCASH_SIZE=$(du -h "../../${BACKUP_DIR}/jazzcash_${TIMESTAMP}.sql" | cut -f1)
    echo "✅ JazzCash backup: ${BACKUP_DIR}/jazzcash_${TIMESTAMP}.sql (${JAZZCASH_SIZE})"
else
    echo "⚠️  JazzCash database not running, skipping..."
fi

cd ../..

echo ""
echo "========================================"
echo " Backup Complete! 🎉"
echo "========================================"
echo ""
echo "Backup location: ${BACKUP_DIR}/"
echo ""
echo "🧹 Cleaning old backups (keeping last 7)..."
cd "$BACKUP_DIR"
ls -t easypaisa_*.sql 2>/dev/null | tail -n +8 | xargs -r rm
ls -t jazzcash_*.sql 2>/dev/null | tail -n +8 | xargs -r rm

EASYPAISA_COUNT=$(ls easypaisa_*.sql 2>/dev/null | wc -l)
JAZZCASH_COUNT=$(ls jazzcash_*.sql 2>/dev/null | wc -l)

echo "✅ Easypaisa backups: ${EASYPAISA_COUNT}"
echo "✅ JazzCash backups: ${JAZZCASH_COUNT}"
echo ""
echo "To restore:"
echo "  Easypaisa: cd easypaisa-onetime/infrastructure && docker compose exec -T easypaisa-db psql -U wallets_user wallets_db < ../../${BACKUP_DIR}/easypaisa_${TIMESTAMP}.sql"
echo "  JazzCash:  cd jazzcash-onetime/infrastructure && docker compose exec -T jazzcash-db psql -U jazzcash_user jazzcash_db < ../../${BACKUP_DIR}/jazzcash_${TIMESTAMP}.sql"
echo ""

