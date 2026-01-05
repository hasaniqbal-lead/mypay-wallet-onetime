# MyPay Wallets API – Easypaisa Gateway

Production-ready REST API gateway for Easypaisa wallet payments. Exposes a clean merchant-facing API that internally calls Easypaisa REST endpoints.

**Architecture**: Node.js + PostgreSQL + Docker + Nginx

**Public Endpoint**: `http://wallets.mycodigital.io:8888/api/v1`

---

## Features

- ✅ Clean merchant API (no redirect, single call)
- ✅ PostgreSQL transaction storage
- ✅ Database-backed API key management
- ✅ Docker containerized with health checks
- ✅ Nginx reverse proxy ready
- ✅ Idempotent transaction handling
- ✅ Production-ready error handling

---

## Project Structure

```
wallets-api/
├── src/
│   ├── index.js                 # Express server + API routes
│   ├── config.js                # Environment configuration
│   ├── easypaisa-rest-client.js # Easypaisa REST client
│   └── db.js                    # PostgreSQL database layer
├── db/
│   └── init.sql                 # Database schema initialization
├── nginx/
│   └── wallets.mycodigital.io.conf  # Nginx configuration
├── Dockerfile                   # Container build instructions
├── docker-compose.yml           # Multi-container orchestration
├── DEPLOYMENT.md                # Complete VPS deployment guide
└── README.md                    # This file
```

---

## Quick Start (Local Development)

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or use Docker)
- Easypaisa REST credentials

### 2. Install Dependencies

```bash
cd wallets-api
npm install
```

### 3. Configure Environment

Create a `.env` file in the `wallets-api` directory:

```env
# Server Configuration
PORT=4003
NODE_ENV=development

# Wallets API Authentication
WALLETS_API_KEY=test-wallets-key

# Easypaisa Credentials
EASYPAY_BASE_URL=https://easypay.easypaisa.com.pk
EASYPAY_USERNAME=MYCO
EASYPAY_PASSWORD=5e2ff2e9d26b18e4a0a08dfefd909294
EASYPAY_STORE_ID=1050331
EASYPAY_DEFAULT_EMAIL=noreply@mycodigital.io

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wallets_db
DB_USER=wallets_user
DB_PASSWORD=wallets_password
```

### 4. Start PostgreSQL (using Docker)

```bash
# Start PostgreSQL container
docker run -d \
  --name wallets-db-local \
  -e POSTGRES_DB=wallets_db \
  -e POSTGRES_USER=wallets_user \
  -e POSTGRES_PASSWORD=wallets_password \
  -p 5432:5432 \
  postgres:15-alpine

# Initialize database schema
docker exec -i wallets-db-local psql -U wallets_user -d wallets_db < db/init.sql
```

### 5. Start the Service

```bash
npm start
```

Expected output:

```
===============================================
 MyPay Wallets API - Easypaisa Gateway (local)
-----------------------------------------------
 Port:        4003
 Endpoint:    POST /api/v1/easypaisa/charge
 Health:      GET  /health
===============================================
[DB] Database connection established
```

### 6. Test

```bash
# Health check
curl http://localhost:4003/health

# Easypaisa charge (requires valid API key)
curl -X POST http://localhost:4003/api/v1/easypaisa/charge \
  -H "X-Api-Key: test-wallets-key" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-001",
    "amount": 100.00,
    "mobile": "03097524704"
  }'
```

---

## API Documentation

### Endpoint: `POST /api/v1/easypaisa/charge`

Initiate an Easypaisa MA (Mobile Account) charge.

**Headers:**
- `X-Api-Key`: Your wallet API key (required)
- `Content-Type`: application/json

**Request Body:**

```json
{
  "orderId": "ORDER-123",
  "amount": 100.00,
  "mobile": "03097524704"
}
```

**Response (Success - Approved):**

```json
{
  "success": true,
  "orderId": "ORDER-123",
  "status": "APPROVED",
  "provider": "easypaisa",
  "channel": "MA",
  "amount": 100,
  "currency": "PKR",
  "meta": {
    "easypayStatus": "PAID",
    "easypayResponseCode": "0000",
    "easypayResponseDesc": "Success",
    "easypayTransactionId": "EP123456789",
    "paymentToken": "TOKEN-xyz",
    "paymentTokenExpiryDateTime": "2025-12-31T12:00:00Z"
  }
}
```

**Response (Pending):**

```json
{
  "success": true,
  "orderId": "ORDER-123",
  "status": "PENDING",
  "provider": "easypaisa",
  "channel": "MA",
  "amount": 100,
  "currency": "PKR",
  "meta": {
    "easypayStatus": "PENDING",
    "easypayResponseCode": "0000"
  }
}
```

**Response (Failed):**

```json
{
  "success": false,
  "orderId": "ORDER-123",
  "status": "FAILED",
  "errorCode": "EASYPAY_0020",
  "errorMessage": "Insufficient balance",
  "meta": {
    "easypayResponseCode": "0020",
    "easypayResponseDesc": "Insufficient balance"
  }
}
```

### Status Codes

- `200`: Transaction approved
- `202`: Transaction pending (customer needs to confirm)
- `400`: Transaction failed or invalid request
- `401`: Invalid API key
- `500`: Internal server error

---

## Production Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete VPS deployment instructions including:

- Docker container setup
- Nginx reverse proxy configuration
- Database initialization
- SSL/HTTPS setup with Certbot
- Merchant API key management
- Maintenance and troubleshooting

### Quick Production Start

```bash
# On VPS
cd /opt/mypay-wallets
docker compose up -d

# Check logs
docker compose logs -f

# Test
curl http://wallets.mycodigital.io:8888/health
```

---

## Database Schema

### Table: `transactions`

Stores all Easypaisa charge transactions:

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| order_id | VARCHAR(255) | Merchant order ID (unique) |
| merchant_id | VARCHAR(255) | Merchant identifier |
| provider | VARCHAR(50) | Payment provider (easypaisa) |
| channel | VARCHAR(50) | Payment channel (MA) |
| amount | DECIMAL(10,2) | Transaction amount |
| currency | VARCHAR(3) | Currency code (PKR) |
| mobile | VARCHAR(20) | Customer mobile number |
| status | VARCHAR(50) | Transaction status |
| provider_transaction_id | VARCHAR(255) | Easypaisa transaction ID |
| provider_response_code | VARCHAR(20) | Easypaisa response code |
| provider_payload | JSONB | Full Easypaisa response |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Table: `api_keys`

Manages merchant API keys:

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| merchant_id | VARCHAR(255) | Merchant identifier (unique) |
| api_key | VARCHAR(255) | API key (unique) |
| merchant_name | VARCHAR(255) | Merchant display name |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Creation timestamp |
| last_used_at | TIMESTAMP | Last usage timestamp |

---

## Security Notes

- ✅ API keys stored in database with indexes
- ✅ Sensitive credentials in environment variables only
- ✅ Non-root container user
- ✅ Health checks for container orchestration
- ✅ Nginx rate limiting recommended
- ✅ HTTPS via Certbot (optional)

---

## Development Scripts

```bash
# Start in development mode with auto-reload
npm run dev

# Start in production mode
npm start
```

---

## Maintenance

### View Logs

```bash
docker compose logs -f wallets-api
```

### Database Backup

```bash
docker exec wallets-db pg_dump -U wallets_user wallets_db > backup.sql
```

### Add Merchant API Key

```bash
docker exec -it wallets-db psql -U wallets_user -d wallets_db

INSERT INTO api_keys (merchant_id, api_key, merchant_name, is_active)
VALUES ('MERCHANT_001', 'mypay_prod_key_123', 'My Merchant', TRUE);
```

---

## Future Enhancements (Phase 2)

- **JazzCash integration**: `POST /api/v1/jazzcash/charge`
- **Transaction status webhook**: Push updates to merchant URLs
- **Background polling**: Auto-update pending transactions
- **Analytics dashboard**: Transaction metrics and reporting

---

## Support

For issues or questions:
1. Check logs: `docker compose logs -f`
2. Review [DEPLOYMENT.md](./DEPLOYMENT.md)
3. Verify Easypaisa credentials in `.env`

---

**Last Updated**: December 16, 2025
