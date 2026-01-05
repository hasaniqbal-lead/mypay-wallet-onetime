# MyPay Wallets - One-Time Payments Platform

🚀 **Multi-wallet payment aggregator for one-time transactions in Pakistan**

[![Status](https://img.shields.io/badge/status-production-green)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()
[![Wallets](https://img.shields.io/badge/wallets-2%2F4-orange)]()

---

## 📱 Available Wallets

| Wallet | Status | Port | Endpoint |
|--------|--------|------|----------|
| **Easypaisa** | ✅ Live | 4003 | `POST /api/v1/easypaisa/charge` |
| **JazzCash** | 🚧 Template | 4004 | `POST /api/v1/jazzcash/charge` |
| **SadaPay** | 📋 Planned | 4005 | `POST /api/v1/sadapay/charge` |
| **NayaPay** | 📋 Planned | 4006 | `POST /api/v1/nayapay/charge` |

---

## 🏗️ Monorepo Structure

```
mypay-wallets-onetime/                    # You are here!
│
├── easypaisa-onetime/                    # ✅ Easypaisa service (LIVE)
│   ├── services/easypaisa/               # Service implementation
│   ├── infrastructure/                   # Docker, Nginx configs
│   ├── docs/                             # API docs, architecture
│   ├── tests/                            # Postman collections
│   └── scripts/                          # Deployment scripts
│
├── jazzcash-onetime/                     # 🚧 JazzCash service (TEMPLATE)
│   └── (same structure as easypaisa)     # Ready for implementation
│
├── sadapay-onetime/                      # 📋 Future: SadaPay
├── nayapay-onetime/                      # 📋 Future: NayaPay
│
├── shared/                               # Shared resources
│   ├── docs/
│   │   └── MONOREPO_ARCHITECTURE.md      # System architecture
│   ├── scripts/
│   │   ├── deploy-all.sh                 # Deploy all wallets
│   │   ├── stop-all.sh                   # Stop all wallets
│   │   └── backup-all.sh                 # Backup all databases
│   └── backups/                          # Database backups
│
└── README.md                             # This file
```

---

## 🚀 Quick Start

### Deploy All Wallets

```bash
# One command to deploy everything!
./shared/scripts/deploy-all.sh
```

### Deploy Individual Wallet

```bash
# Easypaisa only
cd easypaisa-onetime/infrastructure
docker compose up -d

# JazzCash only
cd jazzcash-onetime/infrastructure
docker compose up -d
```

---

## 📊 Service Status

```bash
# Check all running services
docker ps

# Health checks
curl http://localhost:4003/health  # Easypaisa
curl http://localhost:4004/health  # JazzCash
```

---

## 🔧 Management Commands

### Deploy & Stop

```bash
# Deploy all wallets
./shared/scripts/deploy-all.sh

# Stop all wallets
./shared/scripts/stop-all.sh
```

### Backup & Restore

```bash
# Backup all databases
./shared/scripts/backup-all.sh

# Backups saved to: shared/backups/
```

### Logs & Monitoring

```bash
# View logs for specific wallet
cd easypaisa-onetime/infrastructure
docker compose logs -f

# Or for JazzCash
cd jazzcash-onetime/infrastructure
docker compose logs -f
```

---

## 📚 Documentation

### 🚀 Getting Started

- **[Developer Guide](DEVELOPER_GUIDE.md)** ⭐ **START HERE** - Complete guide for developers
  - Prerequisites & setup
  - Making your first edit
  - Development workflow
  - Testing & debugging
  - Common tasks & troubleshooting

### Monorepo Documentation

- **[Monorepo Architecture](shared/docs/MONOREPO_ARCHITECTURE.md)** - System design & structure
- **[Project Structure](PROJECT_STRUCTURE.md)** - Directory layout & file organization
- **[This README](README.md)** - Quick start & overview

### Service-Specific Documentation

- **[Easypaisa Docs](easypaisa-onetime/README.md)** - Easypaisa implementation
  - [API Reference](easypaisa-onetime/docs/API.md)
  - [Architecture](easypaisa-onetime/docs/ARCHITECTURE.md)
  - [Deployment Guide](easypaisa-onetime/DEPLOYMENT.md)

- **[JazzCash Docs](jazzcash-onetime/README.md)** - JazzCash template
  - [API Reference](jazzcash-onetime/docs/API.md)
  - [Architecture](jazzcash-onetime/docs/ARCHITECTURE.md)
  - [Quick Start](jazzcash-onetime/QUICKSTART.md)

---

## 🔌 API Usage

### Unified API Format

All wallets follow the **same API structure**:

**Request:**
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

**Response:**
```json
{
  "success": true,
  "orderId": "ORDER-12345",
  "status": "APPROVED",
  "provider": "easypaisa",
  "channel": "MA",
  "amount": 100.00,
  "currency": "PKR",
  "meta": {
    "providerTransactionId": "EP123456789",
    "providerStatus": "PAID"
  }
}
```

### Status Codes

| Status | Description |
|--------|-------------|
| `APPROVED` | Payment completed successfully |
| `PENDING` | Waiting for customer confirmation |
| `FAILED` | Payment failed |

---

## 🏢 Production Endpoints

### Easypaisa (Live)

```
Base URL: http://wallets.mycodigital.io:8888/api/v1
Endpoint: POST /easypaisa/charge
Health:   GET /health
```

### JazzCash (When Ready)

```
Base URL: http://wallets.mycodigital.io:8889/api/v1
Endpoint: POST /jazzcash/charge
Health:   GET /health
```

---

## 🔐 Configuration

### Environment Setup

Each wallet requires its own `.env` file:

**Easypaisa:**
```bash
cd easypaisa-onetime/infrastructure
cp .env.example .env
# Edit .env with Easypaisa credentials
```

**JazzCash:**
```bash
cd jazzcash-onetime/infrastructure
cp .env.example .env
# Edit .env with JazzCash credentials
```

### Required Environment Variables

See individual service READMEs for specific variables:
- [Easypaisa .env](easypaisa-onetime/README.md#configuration)
- [JazzCash .env](jazzcash-onetime/README.md#configuration)

---

## 🏗️ Architecture Highlights

### Complete Independence

Each wallet service is **completely independent**:
- ✅ Own database (PostgreSQL)
- ✅ Own Docker containers
- ✅ Own API port
- ✅ Own deployment cycle
- ✅ Own documentation

### Benefits

1. **Isolation**: One service down ≠ all services down
2. **Scalability**: Scale high-traffic wallets independently
3. **Team Autonomy**: Different teams, different wallets
4. **Flexibility**: Add new wallets without affecting existing ones

### Network Architecture

```
Internet
    ↓
Nginx (Reverse Proxy)
    ├── :8888 → Easypaisa (Port 4003)
    ├── :8889 → JazzCash (Port 4004)
    ├── :8890 → SadaPay (Port 4005)
    └── :8891 → NayaPay (Port 4006)
```

---

## 🧪 Testing

### Local Testing

```bash
# Import Postman collections
easypaisa-onetime/tests/postman/*.json
jazzcash-onetime/tests/postman/*.json

# Or use curl
curl http://localhost:4003/health
curl -X POST http://localhost:4003/api/v1/easypaisa/charge \
  -H "X-Api-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"TEST-001","amount":10,"mobile":"03097524704"}'
```

---

## 📈 Adding a New Wallet

### Step-by-Step Guide

1. **Copy existing structure:**
   ```bash
   cp -r easypaisa-onetime newwallet-onetime
   ```

2. **Rename service folder:**
   ```bash
   cd newwallet-onetime/services
   mv easypaisa newwallet
   ```

3. **Update configs:**
   - `infrastructure/docker-compose.yml` (ports, names, env vars)
   - `infrastructure/nginx/*.conf` (port, proxy_pass)
   - `services/newwallet/src/config.js` (provider config)
   - `services/newwallet/src/*-client.js` (API implementation)

4. **Test locally:**
   ```bash
   cd newwallet-onetime/infrastructure
   docker compose up -d
   ```

5. **Add to deploy script:**
   Update `shared/scripts/deploy-all.sh` to include new wallet

**See**: [Monorepo Architecture](shared/docs/MONOREPO_ARCHITECTURE.md#adding-a-new-wallet) for detailed guide

---

## 🔄 Development Workflow

### Working on Easypaisa

```bash
cd easypaisa-onetime/services/easypaisa
# Make changes to src/
cd ../../infrastructure
docker compose down && docker compose build && docker compose up -d
docker compose logs -f
```

### Working on JazzCash

```bash
cd jazzcash-onetime/services/jazzcash
# Implement JazzCash API client
cd ../../infrastructure
docker compose down && docker compose build && docker compose up -d
docker compose logs -f
```

---

## 📦 Technology Stack

| Component | Technology |
|-----------|------------|
| **Language** | Node.js 18+ |
| **Framework** | Express.js |
| **Database** | PostgreSQL 15 (per service) |
| **Container** | Docker + Docker Compose |
| **Reverse Proxy** | Nginx |
| **HTTP Client** | Axios |

---

## 🛡️ Security

- **API Key Authentication**: Per-service API keys
- **Network Isolation**: Services can't access each other
- **Database Isolation**: Separate databases per wallet
- **HTTPS**: SSL/TLS in production (Nginx + Certbot)
- **Rate Limiting**: Nginx rate limiting per service

---

## 📊 Monitoring

### Health Checks

```bash
# All services
docker ps

# Individual health endpoints
curl http://localhost:4003/health  # Easypaisa
curl http://localhost:4004/health  # JazzCash
```

### Logs

```bash
# All services
docker ps

# Specific service
cd {wallet}-onetime/infrastructure
docker compose logs -f {wallet}-api
docker compose logs -f {wallet}-db
```

### Database Access

```bash
# Easypaisa DB
cd easypaisa-onetime/infrastructure
docker compose exec easypaisa-db psql -U wallets_user wallets_db

# JazzCash DB
cd jazzcash-onetime/infrastructure
docker compose exec jazzcash-db psql -U jazzcash_user jazzcash_db
```

---

## 🚀 Roadmap

### Phase 1 ✅ (Current)
- [x] Easypaisa integration
- [x] JazzCash template structure
- [x] Monorepo setup
- [x] Shared deployment scripts

### Phase 2 🚧 (In Progress)
- [ ] JazzCash API implementation
- [ ] SadaPay integration
- [ ] NayaPay integration

### Phase 3 📋 (Planned)
- [ ] API Gateway (unified entry point)
- [ ] Webhook hub
- [ ] Analytics dashboard
- [ ] Multi-region deployment

### Phase 4 (Future)
- [ ] Subscription payments (separate monorepo)
- [ ] Kubernetes migration
- [ ] Active-active HA

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/{wallet}/feature-name`
3. Work on specific wallet: `cd {wallet}-onetime/`
4. Commit changes: `git commit -m 'Add feature'`
5. Push to branch: `git push origin feature/{wallet}/feature-name`
6. Submit Pull Request

---

## 📞 Support

### Documentation
- [Monorepo Architecture](shared/docs/MONOREPO_ARCHITECTURE.md)
- [Easypaisa Docs](easypaisa-onetime/README.md)
- [JazzCash Docs](jazzcash-onetime/README.md)

### Issues
For bugs or feature requests, open an issue in the repository.

### Contact
- **Technical Support**: tech@myco.io
- **Merchant Onboarding**: support@myco.io

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎯 Quick Reference

```bash
# Deploy everything
./shared/scripts/deploy-all.sh

# Stop everything
./shared/scripts/stop-all.sh

# Backup databases
./shared/scripts/backup-all.sh

# Deploy single wallet
cd {wallet}-onetime/infrastructure && docker compose up -d

# View logs
cd {wallet}-onetime/infrastructure && docker compose logs -f

# Health check
curl http://localhost:400X/health
```

---

**Built with ❤️ by MyPay Team**

*Last Updated: December 16, 2025*

