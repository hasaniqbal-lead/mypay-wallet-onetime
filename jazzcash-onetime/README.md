# MyPay Wallets API - JazzCash

Production-ready JazzCash MWALLET payment gateway.

[![Status](https://img.shields.io/badge/status-production-green)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()

---

## Overview

MyPay JazzCash API provides a clean, unified REST API for integrating JazzCash Mobile Wallet (MWALLET) payments into your platform. Uses JazzCash DoTransaction API with HMAC-SHA256 secure hash.

### Key Features

- ✅ **Single Clean Endpoint** - No redirects, one API call
- ✅ **Production Ready** - Docker containerized with PostgreSQL
- ✅ **Secure** - API key authentication + HMAC-SHA256 hashing
- ✅ **Idempotent** - Duplicate prevention built-in
- ✅ **JazzCash Certified** - Implements official MWALLET REST API v1.1

---

## Service

| Service | Status | Endpoint |
|---------|--------|----------|
| **JazzCash MWALLET** | ✅ Live | `POST /api/v1/jazzcash/charge` |

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- JazzCash merchant credentials (Merchant ID, Password, Integrity Salt)
- Domain/subdomain configured (e.g., `wallets.mycodigital.io`)

### 1. Clone Repository

```bash
git clone <repository-url>
cd jazzcash-onetime
```

### 2. Configure Environment

Create `.env` file in `infrastructure/` directory:

```env
# JazzCash Credentials (Production)
JAZZCASH_MERCHANT_ID=MYCONTENT5
JAZZCASH_PASSWORD=h2x1yxctww
JAZZCASH_INTEGRITY_SALT=440982v92s
JAZZCASH_RETURN_URL=https://wallets.mycodigital.io/api/v1/jazzcash/callback

# Database
DB_PASSWORD=your-secure-db-password

# API Key (fallback)
WALLETS_API_KEY=your-api-key
```

### 3. Start Services

```bash
cd infrastructure
docker compose up -d
```

### 4. Verify Deployment

```bash
# Health check
curl http://localhost:4004/health

# Or via Nginx (if configured)
curl http://wallets.mycodigital.io:8889/health
```

---

## Project Structure

```
jazzcash-onetime/
├── services/
│   └── jazzcash/                    # JazzCash gateway service
│       ├── src/
│       │   ├── index.js              # Express API server
│       │   ├── config.js             # Environment configuration
│       │   ├── jazzcash-rest-client.js  # JazzCash REST client with HMAC-SHA256
│       │   └── db.js                 # PostgreSQL data layer
│       ├── db/
│       │   └── init.sql              # Database schema
│       ├── Dockerfile                # Container build
│       ├── package.json              # Dependencies
│       └── README.md                 # Service documentation
│
├── infrastructure/
│   ├── nginx/
│   │   └── wallets.mycodigital.io.conf  # Nginx reverse proxy config
│   ├── docker-compose.yml            # Multi-container orchestration
│   └── .env.example                  # Environment template
│
├── docs/
│   ├── API.md                        # API documentation for merchants
│   └── ARCHITECTURE.md               # System design & architecture
│
├── tests/
│   └── postman/
│       └── JazzCash_Wallets_API.postman_collection.json  # API testing
│
├── scripts/
│   ├── deploy.sh                     # Deployment automation
│   └── backup-db.sh                  # Database backup
│
├── env.example                       # Environment variables template
├── DEPLOYMENT.md                     # VPS deployment guide
└── README.md                         # This file
```

---

## API Usage

### Authentication

All requests require an API key:

```http
X-Api-Key: your-api-key
```

### JazzCash Charge Example

```bash
curl -X POST http://wallets.mycodigital.io:8889/api/v1/jazzcash/charge \
  -H "X-Api-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "JC-ORDER-12345",
    "amount": 100.00,
    "mobile": "03123456789"
  }'
```

### Response

```json
{
  "success": true,
  "orderId": "JC-ORDER-12345",
  "status": "APPROVED",
  "provider": "jazzcash",
  "channel": "MWALLET",
  "amount": 100.0,
  "currency": "PKR",
  "meta": {
    "jazzCashResponseCode": "000",
    "jazzCashResponseMessage": "Success",
    "jazzCashTxnRefNo": "T20251217123456",
    "jazzCashAmount": "10000"
  }
}
```

---

## Documentation

- **[API Documentation](docs/API.md)** - Complete merchant API reference
- **[Architecture](docs/ARCHITECTURE.md)** - System design and data flow
- **[Deployment Guide](DEPLOYMENT.md)** - Step-by-step VPS deployment

---

## Development

### Local Development Setup

```bash
# Navigate to service
cd services/jazzcash

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
PORT=4004
JAZZCASH_MERCHANT_ID=MYCONTENT5
JAZZCASH_PASSWORD=h2x1yxctww
JAZZCASH_INTEGRITY_SALT=440982v92s
JAZZCASH_RETURN_URL=http://localhost:4004/api/v1/jazzcash/callback
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jazzcash_db
DB_USER=jazzcash_user
DB_PASSWORD=jazzcash_password
WALLETS_API_KEY=test-api-key
EOF

# Start PostgreSQL (Docker)
docker run -d --name jazzcash-db-local \
  -e POSTGRES_DB=jazzcash_db \
  -e POSTGRES_USER=jazzcash_user \
  -e POSTGRES_PASSWORD=jazzcash_password \
  -p 5432:5432 \
  postgres:15-alpine

# Initialize database
docker exec -i jazzcash-db-local psql -U jazzcash_user -d jazzcash_db < db/init.sql

# Start service
npm start
```

### Testing

Import Postman collection from `tests/postman/` for easy API testing.

---

## Deployment

### Production Deployment (VPS)

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete VPS deployment instructions including:

- Docker setup
- Nginx configuration
- SSL/HTTPS with Certbot
- Database initialization
- Merchant API key management

### Quick Production Deploy

```bash
# On VPS
cd /opt/jazzcash-onetime/infrastructure
docker compose up -d

# Verify
docker compose ps
docker compose logs -f jazzcash-api
```

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js |
| **Database** | PostgreSQL 15 |
| **Container** | Docker + Docker Compose |
| **Reverse Proxy** | Nginx |
| **HTTP Client** | Axios |

---

## Architecture Highlights

### Microservices Design

Each payment gateway (Easypaisa, JazzCash) is isolated as its own service, making it easy to:
- Add new gateways without affecting existing ones
- Scale individual services independently
- Maintain and debug specific integrations

### Data Flow

```
Merchant → API (Auth) → JazzCash Gateway (HMAC-SHA256) → JazzCash API → PostgreSQL → Response
```

### HMAC-SHA256 Hash Generation

JazzCash requires secure hash generation for all requests:

1. Collect all `pp_` fields (except `pp_SecureHash`)
2. Sort alphabetically by parameter name
3. Concatenate values with `&`
4. Prepend integrity salt + `&`
5. Apply HMAC-SHA256 with integrity salt as key
6. Return lowercase hex output

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed diagrams and flow.

---

## Roadmap

### Phase 1 (Current) ✅
- [x] JazzCash MWALLET integration
- [x] HMAC-SHA256 secure hash implementation
- [x] PostgreSQL transaction storage
- [x] API key authentication
- [x] Docker containerization
- [x] Nginx reverse proxy
- [x] Complete documentation

### Phase 2 (Planned) 🚧
- [ ] JazzCash callback handling
- [ ] Transaction status inquiry API
- [ ] Webhook notifications for merchants
- [ ] Background polling for pending transactions
- [ ] Transaction analytics dashboard

### Phase 3 (Future) 📋
- [ ] Refunds API
- [ ] Recurring payment subscriptions (separate service)
- [ ] Transaction monitoring dashboard
- [ ] Multi-merchant dashboard

---

## Monitoring

### Logs

```bash
# Application logs
cd infrastructure
docker compose logs -f jazzcash-api

# Database logs
docker compose logs -f jazzcash-db

# Nginx logs (on VPS)
tail -f /var/log/nginx/jazzcash-api-access.log
tail -f /var/log/nginx/jazzcash-api-error.log
```

### Health Checks

```bash
# Service health
curl http://wallets.mycodigital.io:8889/health

# Database connection
docker exec jazzcash-db pg_isready -U jazzcash_user
```

---

## Security

- **Authentication:** API key-based with database validation
- **Transport:** HTTPS/TLS (production with Certbot)
- **Data:** Encrypted at rest (PostgreSQL)
- **Credentials:** Environment variables only, never hardcoded
- **Rate Limiting:** Nginx (10 req/s per IP)

---

## Support

### Documentation
- [API Reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment Guide](DEPLOYMENT.md)

### Issues
For bugs or feature requests, please open an issue in the repository.

### Contact
- Technical Support: tech@myco.io
- Merchant Onboarding: support@myco.io

---

## License

MIT License - See LICENSE file for details

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built with ❤️ by MyPay Team**

Last Updated: December 17, 2025

