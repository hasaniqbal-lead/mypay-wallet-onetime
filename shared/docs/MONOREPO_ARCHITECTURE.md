# MyPay Wallets - Monorepo Architecture

**One-Time Payments Platform**

Last Updated: December 16, 2025

---

## Overview

MyPay Wallets is a monorepo containing multiple independent wallet services for one-time payment transactions in Pakistan. Each wallet provider (Easypaisa, JazzCash, etc.) is a complete, self-contained microservice.

---

## Monorepo Structure

```
mypay-wallets-onetime/                          # Monorepo root
│
├── easypaisa-onetime/                          # Easypaisa service
│   ├── services/easypaisa/                     # Service code
│   ├── infrastructure/                         # Docker, Nginx
│   ├── docs/                                   # Service docs
│   ├── tests/                                  # Service tests
│   └── scripts/                                # Service scripts
│
├── jazzcash-onetime/                           # JazzCash service
│   ├── services/jazzcash/                      # Service code
│   ├── infrastructure/                         # Docker, Nginx
│   ├── docs/                                   # Service docs
│   ├── tests/                                  # Service tests
│   └── scripts/                                # Service scripts
│
├── sadapay-onetime/                            # Future: SadaPay
├── nayapay-onetime/                            # Future: NayaPay
│
└── shared/                                     # Shared resources
    ├── docs/                                   # Monorepo docs
    │   └── MONOREPO_ARCHITECTURE.md            # This file
    ├── scripts/                                # Cross-service scripts
    │   ├── deploy-all.sh                       # Deploy all services
    │   ├── stop-all.sh                         # Stop all services
    │   └── backup-all.sh                       # Backup all databases
    └── backups/                                # Database backups
        ├── easypaisa_*.sql
        └── jazzcash_*.sql
```

---

## Design Principles

### 1. **Complete Independence**

Each wallet service is **completely independent**:
- Own codebase
- Own database (PostgreSQL)
- Own Docker setup
- Own API port
- Own documentation
- Own deployment cycle

**Why?**
- Failure isolation: JazzCash down ≠ Easypaisa down
- Independent scaling: Scale high-traffic wallets separately
- Team autonomy: Different teams can own different wallets
- Technology flexibility: Can use different stacks if needed

### 2. **Consistent Structure**

All wallet services follow the **same structure**:

```
{wallet}-onetime/
├── services/{wallet}/      # Service implementation
├── infrastructure/         # Deployment configs
├── docs/                   # Documentation
├── tests/                  # Testing
└── scripts/               # Automation
```

**Why?**
- Easy onboarding: Developers know where to find things
- Reusability: Copy structure for new wallets
- Maintainability: Consistent patterns across services

### 3. **Shared Resources**

Common cross-service resources in `shared/`:
- **Scripts**: Deploy, stop, backup all services
- **Docs**: Monorepo architecture, conventions
- **Backups**: Centralized backup location

**Why?**
- DRY: Don't repeat deployment scripts
- Centralized management: One command to rule them all
- Consistency: Same process for all services

---

## Service Isolation

### Port Allocation

| Service | API Port | Nginx Port | Database Port |
|---------|----------|------------|---------------|
| **Easypaisa** | 4003 | 8888 | 5432 (internal) |
| **JazzCash** | 4004 | 8889 | 5432 (internal) |
| **SadaPay** | 4005 | 8890 | 5432 (internal) |
| **NayaPay** | 4006 | 8891 | 5432 (internal) |

### Network Isolation

Each service has its own **Docker network**:

```
easypaisa-network:
  - easypaisa-api
  - easypaisa-db

jazzcash-network:
  - jazzcash-api
  - jazzcash-db

nginx-network (shared):
  - easypaisa-api
  - jazzcash-api
  - (connects to Nginx for routing)
```

**Why?**
- Security: Services can't access each other's databases
- Isolation: Network issues in one service don't affect others
- Flexibility: Can move services to separate hosts easily

### Database Isolation

Each service has its own **PostgreSQL database**:

```
easypaisa-db:
  - Container: easypaisa-db
  - Database: wallets_db / easypaisa_db
  - User: wallets_user / easypaisa_user
  - Volume: easypaisa-db-data

jazzcash-db:
  - Container: jazzcash-db
  - Database: jazzcash_db
  - User: jazzcash_user
  - Volume: jazzcash-db-data
```

**Why?**
- Data isolation: No cross-contamination
- Independent backups: Backup/restore individually
- Performance: No resource contention
- Schema freedom: Different schemas per wallet

---

## Deployment Models

### Model 1: Single VPS (Current)

All services on one VPS:

```
VPS (72.60.110.249)
├── Nginx (Ports: 8888, 8889, 8890, 8891)
│   ├── wallets.mycodigital.io:8888 → easypaisa-api
│   ├── wallets.mycodigital.io:8889 → jazzcash-api
│   ├── wallets.mycodigital.io:8890 → sadapay-api
│   └── wallets.mycodigital.io:8891 → nayapay-api
└── Docker Containers
    ├── easypaisa-api + easypaisa-db
    ├── jazzcash-api + jazzcash-db
    ├── sadapay-api + sadapay-db
    └── nayapay-api + nayapay-db
```

**Pros:**
- Simple management
- Lower cost
- Shared Nginx

**Cons:**
- Single point of failure
- Resource contention
- Limited scaling

### Model 2: Separate VPS per Wallet (Future)

Each wallet on its own VPS:

```
VPS 1 (Easypaisa)     → easypaisa-onetime/
VPS 2 (JazzCash)      → jazzcash-onetime/
VPS 3 (SadaPay)       → sadapay-onetime/
VPS 4 (NayaPay)       → nayapay-onetime/
```

**Pros:**
- Complete isolation
- Independent scaling
- Better performance

**Cons:**
- Higher cost
- More complex management

### Model 3: Kubernetes (Future Phase 3)

All services in Kubernetes cluster:

```
Kubernetes Cluster
├── Namespace: easypaisa
├── Namespace: jazzcash
├── Namespace: sadapay
└── Namespace: nayapay
```

**Pros:**
- Auto-scaling
- High availability
- Load balancing
- Centralized orchestration

---

## API Architecture

### Unified API Endpoints

All wallets follow the **same API pattern**:

```
POST /api/v1/{wallet}/charge
```

**Examples:**
- `POST /api/v1/easypaisa/charge`
- `POST /api/v1/jazzcash/charge`
- `POST /api/v1/sadapay/charge`
- `POST /api/v1/nayapay/charge`

**Request (Consistent across all wallets):**
```json
{
  "orderId": "ORDER-12345",
  "amount": 100.00,
  "mobile": "03XXXXXXXXX"
}
```

**Response (Normalized):**
```json
{
  "success": true,
  "orderId": "ORDER-12345",
  "status": "APPROVED|PENDING|FAILED",
  "provider": "easypaisa|jazzcash|sadapay|nayapay",
  "channel": "MA",
  "amount": 100.00,
  "currency": "PKR",
  "meta": {
    // Provider-specific details
  }
}
```

**Why consistent API?**
- Easy merchant integration: Same format for all wallets
- API gateway ready: Can add unified gateway layer
- Testing: Same test suite for all wallets

---

## Development Workflow

### Adding a New Wallet

1. **Copy existing structure:**
   ```bash
   cp -r easypaisa-onetime newwallet-onetime
   ```

2. **Rename service:**
   ```bash
   cd newwallet-onetime/services
   mv easypaisa newwallet
   ```

3. **Update configs:**
   - `infrastructure/docker-compose.yml` (ports, names, env vars)
   - `infrastructure/nginx/*.conf` (port, proxy)
   - `services/newwallet/src/config.js` (provider config)
   - `services/newwallet/src/*-client.js` (API implementation)

4. **Test locally:**
   ```bash
   cd newwallet-onetime/infrastructure
   docker compose up -d
   curl http://localhost:400X/health
   ```

5. **Deploy:**
   ```bash
   ./shared/scripts/deploy-all.sh
   ```

### Working on Existing Wallet

1. **Navigate to wallet:**
   ```bash
   cd easypaisa-onetime/
   ```

2. **Make changes:**
   ```bash
   cd services/easypaisa/src
   # Edit files
   ```

3. **Test locally:**
   ```bash
   cd ../../infrastructure
   docker compose down
   docker compose build
   docker compose up -d
   ```

4. **Check logs:**
   ```bash
   docker compose logs -f easypaisa-api
   ```

---

## Maintenance

### Daily Operations

```bash
# Deploy all services
./shared/scripts/deploy-all.sh

# Stop all services
./shared/scripts/stop-all.sh

# Backup all databases
./shared/scripts/backup-all.sh

# View all services
docker ps

# View logs for specific wallet
cd easypaisa-onetime/infrastructure
docker compose logs -f
```

### Monitoring

Each service has its own:
- Health endpoint: `GET /health`
- Logs: `docker compose logs -f {wallet}-api`
- Database: Can query directly via pgAdmin

### Scaling

**Horizontal scaling per wallet:**

```yaml
# easypaisa-onetime/infrastructure/docker-compose.yml
services:
  easypaisa-api:
    deploy:
      replicas: 3  # Run 3 instances
```

**Nginx load balancing:**

```nginx
upstream easypaisa_backend {
    server easypaisa-api-1:4003;
    server easypaisa-api-2:4003;
    server easypaisa-api-3:4003;
}
```

---

## Security

### Per-Service Security

- **API Keys**: Stored in each service's database
- **Environment Variables**: Separate `.env` per service
- **Network Isolation**: Services can't access each other
- **Rate Limiting**: Nginx per-service rate limits

### Shared Security

- **Nginx SSL**: One SSL cert for `wallets.mycodigital.io`
- **Firewall**: VPS firewall applies to all services
- **Backups**: Encrypted backups in `shared/backups/`

---

## Future Phases

### Phase 2: Additional Wallets
- ✅ Easypaisa (Done)
- ✅ JazzCash (Template ready)
- 🚧 SadaPay
- 🚧 NayaPay

### Phase 3: Advanced Features
- API Gateway (single entry point)
- Webhook hub (centralized webhooks)
- Analytics dashboard (cross-wallet)
- Subscription payments (separate monorepo)

### Phase 4: Enterprise
- Kubernetes migration
- Multi-region deployment
- Active-active high availability
- Disaster recovery

---

## Best Practices

1. **Keep services independent** - No shared code between wallets
2. **Use consistent structure** - Same folder layout for all
3. **Version control** - Each wallet has semantic versioning
4. **Document everything** - README in each service
5. **Test in isolation** - Don't rely on other services
6. **Deploy independently** - Can deploy one without others
7. **Monitor separately** - Per-service health checks

---

## Support & Contribution

### Getting Help

1. Check service-specific README: `{wallet}-onetime/README.md`
2. Check monorepo architecture: `shared/docs/MONOREPO_ARCHITECTURE.md`
3. View logs: `cd {wallet}-onetime/infrastructure && docker compose logs`

### Contributing

1. Fork monorepo
2. Create feature branch: `feature/{wallet}/feature-name`
3. Work on specific wallet: `cd {wallet}-onetime/`
4. Test thoroughly
5. Submit PR

---

**Maintained by MyPay Team**  
**Questions? tech@myco.io**

