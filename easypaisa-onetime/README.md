# MyPay Wallets API

Production-ready payment gateway aggregator for Pakistani mobile wallet services.

[![Status](https://img.shields.io/badge/status-production-green)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()

---

## Overview

MyPay Wallets API provides a unified, clean REST API for integrating Pakistani mobile wallet payments into your platform. Currently supports Easypaisa, with JazzCash coming in Phase 2.

### Key Features

- ✅ **Single Clean Endpoint** - No redirects, one API call
- ✅ **Production Ready** - Docker containerized with PostgreSQL
- ✅ **Secure** - API key authentication, transaction persistence
- ✅ **Idempotent** - Duplicate prevention built-in
- ✅ **Scalable** - Microservices architecture ready for multi-gateway support

---

## Services

| Service | Status | Endpoint |
|---------|--------|----------|
| **Easypaisa** | ✅ Live | `POST /api/v1/easypaisa/charge` |
| **JazzCash** | 🚧 Phase 2 | `POST /api/v1/jazzcash/charge` |

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Easypaisa merchant credentials
- Domain/subdomain configured (e.g., `wallets.mycodigital.io`)

### 1. Clone Repository

```bash
git clone <repository-url>
cd mypay-wallets
```

### 2. Configure Environment

Create `.env` file in `infrastructure/` directory:

```env
# Easypaisa Credentials
EASYPAY_USERNAME=your-username
EASYPAY_PASSWORD=your-encrypted-password
EASYPAY_STORE_ID=your-store-id
EASYPAY_DEFAULT_EMAIL=noreply@yourdomain.com

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
curl http://localhost:4003/health

# Or via Nginx (if configured)
curl http://wallets.mycodigital.io:8888/health
```

---

## Project Structure

```
mypay-wallets/
├── services/
│   └── easypaisa/                    # Easypaisa gateway service
│       ├── src/
│       │   ├── index.js              # Express API server
│       │   ├── config.js             # Environment configuration
│       │   ├── easypaisa-rest-client.js  # Easypaisa REST client
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
│   ├── ARCHITECTURE.md               # System design & architecture
│   └── easypaisa-integration-guide.pdf  # Easypaisa reference docs
│
├── tests/
│   └── postman/
│       └── MyPay_Wallets_API.postman_collection.json  # API testing
│
├── scripts/
│   ├── deploy.sh                     # Deployment automation (future)
│   └── backup-db.sh                  # Database backup (future)
│
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

### Easypaisa Charge Example

```bash
curl -X POST http://wallets.mycodigital.io:8888/api/v1/easypaisa/charge \
  -H "X-Api-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER-12345",
    "amount": 100.00,
    "mobile": "03097524704"
  }'
```

### Response

```json
{
  "success": true,
  "orderId": "ORDER-12345",
  "status": "APPROVED",
  "provider": "easypaisa",
  "channel": "MA",
  "amount": 100.0,
  "currency": "PKR",
  "meta": {
    "easypayStatus": "PAID",
    "easypayResponseCode": "0000",
    "easypayTransactionId": "EP123456789"
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
cd services/easypaisa

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
PORT=4003
EASYPAY_USERNAME=your-username
EASYPAY_PASSWORD=your-password
EASYPAY_STORE_ID=your-store-id
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wallets_db
DB_USER=wallets_user
DB_PASSWORD=wallets_password
EOF

# Start PostgreSQL (Docker)
docker run -d --name wallets-db-local \
  -e POSTGRES_DB=wallets_db \
  -e POSTGRES_USER=wallets_user \
  -e POSTGRES_PASSWORD=wallets_password \
  -p 5432:5432 \
  postgres:15-alpine

# Initialize database
docker exec -i wallets-db-local psql -U wallets_user -d wallets_db < db/init.sql

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
cd /opt/mypay-wallets/infrastructure
docker compose up -d

# Verify
docker compose ps
docker compose logs -f
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
Merchant → API (Auth) → Easypaisa Gateway → PostgreSQL → Response
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed diagrams and flow.

---

## Roadmap

### Phase 1 (Current) ✅
- [x] Easypaisa MA integration
- [x] PostgreSQL transaction storage
- [x] API key authentication
- [x] Docker containerization
- [x] Nginx reverse proxy
- [x] Complete documentation

### Phase 2 (Planned) 🚧
- [ ] JazzCash integration
- [ ] Webhook notifications
- [ ] Background polling for pending transactions
- [ ] Transaction analytics dashboard
- [ ] Multi-currency support

### Phase 3 (Future) 📋
- [ ] Refunds API
- [ ] Recurring payment subscriptions
- [ ] Bank transfer integration
- [ ] Real-time transaction monitoring

---

## Monitoring

### Logs

```bash
# Application logs
cd infrastructure
docker compose logs -f easypaisa-api

# Database logs
docker compose logs -f wallets-db

# Nginx logs (on VPS)
tail -f /var/log/nginx/wallets-api-access.log
tail -f /var/log/nginx/wallets-api-error.log
```

### Health Checks

```bash
# Service health
curl http://wallets.mycodigital.io:8888/health

# Database connection
docker exec wallets-db pg_isready -U wallets_user
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

Last Updated: December 16, 2025

