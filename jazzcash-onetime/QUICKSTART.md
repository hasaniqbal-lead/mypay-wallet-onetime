# JazzCash Wallets API - Quick Start Guide

Get your JazzCash MWALLET API running in 5 minutes.

---

## Prerequisites

- Docker & Docker Compose installed
- JazzCash merchant credentials (already configured in the project)

---

## Local Development Setup

### 1. Navigate to Service Directory

```bash
cd services/jazzcash
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create `.env` File

```bash
cat > .env << 'EOF'
# Server
PORT=4004
NODE_ENV=development

# JazzCash Production Credentials
JAZZCASH_MERCHANT_ID=MYCONTENT5
JAZZCASH_PASSWORD=h2x1yxctww
JAZZCASH_INTEGRITY_SALT=440982v92s
JAZZCASH_BASE_URL=https://payments.jazzcash.com.pk
JAZZCASH_RETURN_URL=http://localhost:4004/api/v1/jazzcash/callback

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jazzcash_db
DB_USER=jazzcash_user
DB_PASSWORD=jazzcash_password

# API Authentication
WALLETS_API_KEY=test-api-key
EOF
```

### 4. Start PostgreSQL Database

```bash
docker run -d --name jazzcash-db-local \
  -e POSTGRES_DB=jazzcash_db \
  -e POSTGRES_USER=jazzcash_user \
  -e POSTGRES_PASSWORD=jazzcash_password \
  -p 5432:5432 \
  postgres:15-alpine
```

### 5. Initialize Database Schema

```bash
docker exec -i jazzcash-db-local psql -U jazzcash_user -d jazzcash_db < db/init.sql
```

### 6. Start the Service

```bash
npm start
```

Expected output:

```
===============================================
 MyPay Wallets API - JazzCash Gateway (local)
-----------------------------------------------
 Port:        4004
 Endpoint:    POST /api/v1/jazzcash/charge
 Health:      GET  /health
 Auth header: X-Api-Key: <WALLETS_API_KEY>
===============================================
```

---

## Production Deployment (Docker Compose)

### 1. Navigate to Infrastructure

```bash
cd infrastructure
```

### 2. Create `.env` File

```bash
cat > .env << 'EOF'
# JazzCash Credentials
JAZZCASH_MERCHANT_ID=MYCONTENT5
JAZZCASH_PASSWORD=h2x1yxctww
JAZZCASH_INTEGRITY_SALT=440982v92s
JAZZCASH_RETURN_URL=https://wallets.mycodigital.io/api/v1/jazzcash/callback

# Database
DB_NAME=jazzcash_db
DB_USER=jazzcash_user
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD_HERE

# API Key
WALLETS_API_KEY=YOUR_SECURE_API_KEY_HERE
EOF
```

### 3. Start All Services

```bash
docker compose up -d
```

### 4. Verify Deployment

```bash
# Check containers
docker compose ps

# View logs
docker compose logs -f jazzcash-api

# Health check
curl http://localhost:4004/health
```

---

## Testing the API

### 1. Import Postman Collection

Import the collection from:

```
tests/postman/JazzCash_Wallets_API.postman_collection.json
```

### 2. Set Environment Variables

In Postman, create environment with:

```
base_url = http://localhost:4004
api_key = test-api-key
```

### 3. Test Health Check

```bash
curl http://localhost:4004/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "wallets-api",
  "provider": "jazzcash",
  "timestamp": "2025-12-17T10:30:00.000Z"
}
```

### 4. Test Charge API

```bash
curl -X POST http://localhost:4004/api/v1/jazzcash/charge \
  -H "X-Api-Key: test-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "JC-TEST-001",
    "amount": 100.00,
    "mobile": "03123456789"
  }'
```

Expected response (success):

```json
{
  "success": true,
  "orderId": "JC-TEST-001",
  "status": "APPROVED",
  "provider": "jazzcash",
  "channel": "MWALLET",
  "amount": 100,
  "currency": "PKR",
  "meta": {
    "jazzCashResponseCode": "000",
    "jazzCashResponseMessage": "Success",
    "jazzCashTxnRefNo": "T20251217103000",
    "jazzCashAmount": "10000"
  }
}
```

---

## API Request Format

### Endpoint

```
POST /api/v1/jazzcash/charge
```

### Headers

```
X-Api-Key: your-api-key
Content-Type: application/json
```

### Request Body

```json
{
  "orderId": "JC-ORDER-123",    // Required: Your unique order ID
  "amount": 100.00,              // Required: Amount in PKR (will be converted to paisa)
  "mobile": "03123456789"        // Required: Customer mobile (03XXXXXXXXX format)
}
```

### Response (Success)

```json
{
  "success": true,
  "orderId": "JC-ORDER-123",
  "status": "APPROVED",          // APPROVED, PENDING, or FAILED
  "provider": "jazzcash",
  "channel": "MWALLET",
  "amount": 100.0,
  "currency": "PKR",
  "meta": {
    "jazzCashResponseCode": "000",
    "jazzCashResponseMessage": "Success",
    "jazzCashTxnRefNo": "T20251217103000",
    "jazzCashAmount": "10000"
  }
}
```

### Response (Error)

```json
{
  "success": false,
  "orderId": "JC-ORDER-123",
  "status": "FAILED",
  "errorCode": "JAZZCASH_157",
  "errorMessage": "Invalid hash",
  "meta": {
    "jazzCashResponseCode": "157",
    "jazzCashResponseMessage": "Invalid hash"
  }
}
```

---

## Database Access

### View Transactions

```bash
docker exec -it jazzcash-db psql -U jazzcash_user -d jazzcash_db
```

```sql
-- View all transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;

-- View API keys
SELECT * FROM api_keys;

-- Count transactions by status
SELECT status, COUNT(*) FROM transactions GROUP BY status;
```

---

## Monitoring

### Application Logs

```bash
# Docker Compose
docker compose logs -f jazzcash-api

# Standalone Node
npm start  # logs to console
```

### Database Logs

```bash
docker compose logs -f jazzcash-db
```

### Health Check Monitoring

```bash
# Continuous health monitoring
watch -n 5 'curl -s http://localhost:4004/health | jq .'
```

---

## Common Issues & Solutions

### Issue: "Missing required environment variable"

**Solution:** Ensure `.env` file exists with all required variables:

```bash
# Verify .env file
cat .env

# Check service logs for specific missing variable
docker compose logs jazzcash-api
```

### Issue: "Database connection failed"

**Solution:** Verify PostgreSQL is running:

```bash
# Check database container
docker ps | grep jazzcash-db

# Test connection
docker exec jazzcash-db pg_isready -U jazzcash_user
```

### Issue: "Invalid API key"

**Solution:** Ensure API key is in database:

```bash
docker exec -it jazzcash-db psql -U jazzcash_user -d jazzcash_db -c "SELECT * FROM api_keys;"
```

If no keys exist, insert one:

```sql
INSERT INTO api_keys (api_key, merchant_id, merchant_name, is_active)
VALUES ('test-api-key', 'MERCHANT001', 'Test Merchant', true);
```

### Issue: JazzCash returns "Invalid hash"

**Solution:** Check these common issues:

1. Verify integrity salt is correct
2. Check date-time format (must be YYYYMMDDHHmmss)
3. Ensure amount is in paisa (PKR × 100)
4. Verify ReturnURL matches exactly

See `docs/JAZZCASH_HMAC_GUIDE.md` for detailed hashing guide.

---

## Next Steps

1. ✅ Test all API endpoints using Postman collection
2. ✅ Review logs to ensure no errors
3. ✅ Test with real JazzCash mobile numbers
4. ✅ Set up monitoring and alerting
5. ✅ Configure production environment variables
6. ✅ Deploy to VPS (see `DEPLOYMENT.md`)

---

## Documentation

- **[JAZZCASH_HMAC_GUIDE.md](docs/JAZZCASH_HMAC_GUIDE.md)** - Complete HMAC-SHA256 hashing guide
- **[README.md](README.md)** - Full project documentation
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - VPS deployment guide

---

## Support

- **Technical Issues:** tech@myco.io
- **JazzCash API Issues:** jazzcash-support@jazzcash.com.pk

---

**Built with ❤️ by MyPay Team**

Last Updated: December 17, 2025

