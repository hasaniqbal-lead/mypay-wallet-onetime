# MyPay Wallets - Project Structure

Last Updated: December 16, 2025

---

## Directory Tree

```
mypay-wallets/
│
├── services/                           # Microservices (payment gateways)
│   └── easypaisa/                      # Easypaisa gateway service
│       ├── src/
│       │   ├── index.js                # Express API server
│       │   ├── config.js               # Environment configuration
│       │   ├── easypaisa-rest-client.js  # Easypaisa REST client
│       │   └── db.js                   # PostgreSQL data layer
│       ├── db/
│       │   └── init.sql                # Database schema
│       ├── Dockerfile                  # Container build
│       ├── package.json                # Dependencies
│       ├── package-lock.json           # Locked dependencies
│       └── README.md                   # Service-specific docs
│
├── infrastructure/                     # Deployment & orchestration
│   ├── docker-compose.yml              # Multi-container orchestration
│   ├── nginx/
│   │   └── wallets.mycodigital.io.conf # Nginx reverse proxy config
│   └── .env (gitignored)               # Environment variables
│
├── docs/                               # Documentation
│   ├── API.md                          # Merchant API reference
│   ├── ARCHITECTURE.md                 # System design & architecture
│   └── easypaisa-integration-guide.pdf # Easypaisa reference docs
│
├── tests/                              # Testing resources
│   └── postman/
│       └── MyPay_Wallets_API.postman_collection.json  # API tests
│
├── scripts/                            # Automation scripts
│   ├── deploy.sh                       # Quick deployment script
│   └── backup-db.sh                    # Database backup script
│
├── _archived_easypaisa-ma-service/     # Old SOAP service (archived)
│
├── DEPLOYMENT.md                       # VPS deployment guide
├── PROJECT_STRUCTURE.md                # This file
├── README.md                           # Main project documentation
└── .gitignore                          # Git ignore rules
```

---

## Key Components

### Services Layer (`services/`)

Each payment gateway is an isolated microservice with its own:
- Source code
- Database schema
- Dockerfile
- Dependencies
- Documentation

**Current:**
- ✅ Easypaisa (REST API)

**Planned (Phase 2):**
- 🚧 JazzCash

---

### Infrastructure Layer (`infrastructure/`)

Centralized deployment configuration:

- **`docker-compose.yml`**: Orchestrates all services and databases
- **`nginx/`**: Reverse proxy configuration for production
- **`.env`**: Environment variables (not in git)

---

### Documentation (`docs/`)

Comprehensive documentation for:

- **`API.md`**: Merchant-facing API reference
- **`ARCHITECTURE.md`**: System design, data flow, schemas
- **`easypaisa-integration-guide.pdf`**: Provider reference docs

---

### Testing (`tests/`)

- **Postman Collections**: Ready-to-import API tests
- Future: Integration tests, load tests

---

### Scripts (`scripts/`)

Automation helpers:

- **`deploy.sh`**: One-command deployment
- **`backup-db.sh`**: Automated database backups

---

## Development Workflow

### Local Development

```bash
# 1. Navigate to service
cd services/easypaisa

# 2. Install dependencies
npm install

# 3. Configure environment
cp ../../infrastructure/.env.example ../../infrastructure/.env
# Edit .env with your credentials

# 4. Start PostgreSQL
docker run -d --name wallets-db-local \
  -e POSTGRES_DB=wallets_db \
  -e POSTGRES_USER=wallets_user \
  -e POSTGRES_PASSWORD=wallets_password \
  -p 5432:5432 postgres:15-alpine

# 5. Initialize database
docker exec -i wallets-db-local psql -U wallets_user -d wallets_db < db/init.sql

# 6. Start service
npm start
```

### Docker Development

```bash
# 1. Configure environment
cd infrastructure
cp .env.example .env
# Edit .env

# 2. Build and start
docker compose up -d

# 3. View logs
docker compose logs -f

# 4. Test
curl http://localhost:4003/health
```

### Production Deployment

```bash
# Use the quick deploy script
./scripts/deploy.sh

# Or follow the detailed guide
cat DEPLOYMENT.md
```

---

## Adding a New Gateway (Phase 2 Example: JazzCash)

### Step 1: Create Service Structure

```bash
mkdir -p services/jazzcash/{src,db}
```

### Step 2: Implement Service

```
services/jazzcash/
├── src/
│   ├── index.js                # Express server
│   ├── config.js               # Config (copy from easypaisa)
│   ├── jazzcash-rest-client.js # JazzCash API client
│   └── db.js                   # Database layer (copy from easypaisa)
├── db/
│   └── init.sql                # Schema (similar to easypaisa)
├── Dockerfile                  # (copy from easypaisa)
├── package.json                # Dependencies
└── README.md                   # Service docs
```

### Step 3: Update Infrastructure

Add to `infrastructure/docker-compose.yml`:

```yaml
services:
  jazzcash-api:
    build:
      context: ../services/jazzcash
      dockerfile: Dockerfile
    container_name: jazzcash-api
    # ... similar to easypaisa-api
```

### Step 4: Update Nginx

Add to `infrastructure/nginx/wallets.mycodigital.io.conf`:

```nginx
location /api/v1/jazzcash/ {
    proxy_pass http://jazzcash-api:4004;
    # ... proxy settings
}
```

### Step 5: Deploy

```bash
cd infrastructure
docker compose up -d jazzcash-api
```

---

## File Ownership

| Component | Managed By | Purpose |
|-----------|------------|---------|
| `services/*` | Development Team | Business logic, API integration |
| `infrastructure/*` | DevOps/Infrastructure | Deployment, networking, scaling |
| `docs/*` | Product/Tech Team | API documentation, architecture |
| `tests/*` | QA/Development | Testing, validation |
| `scripts/*` | DevOps | Automation, maintenance |

---

## Git Strategy

### Branches

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `hotfix/*`: Production fixes

### What to Commit

✅ Commit:
- Source code
- Configuration templates (`.env.example`)
- Documentation
- Database schemas
- Dockerfiles
- Scripts

❌ Don't Commit:
- `.env` files
- `node_modules/`
- Logs
- Database backups
- IDE config (`.vscode/`, `.idea/`)

---

## Monitoring

### Logs Location

**Docker:**
```bash
cd infrastructure
docker compose logs -f easypaisa-api
docker compose logs -f wallets-db
```

**Nginx (Production):**
```bash
tail -f /var/log/nginx/wallets-api-access.log
tail -f /var/log/nginx/wallets-api-error.log
```

### Health Checks

```bash
# Service health
curl http://localhost:4003/health

# Database health
docker exec wallets-db pg_isready -U wallets_user
```

---

## Backup & Recovery

### Manual Backup

```bash
./scripts/backup-db.sh
```

### Scheduled Backups (Cron)

```cron
# Daily backup at 2 AM
0 2 * * * /opt/mypay-wallets/scripts/backup-db.sh
```

### Restore from Backup

```bash
cd infrastructure
docker compose exec -T wallets-db psql -U wallets_user wallets_db < ../backups/wallets_db_20251216_020000.sql
```

---

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Store in database, not code
3. **Database**: Strong passwords, regular backups
4. **Transport**: HTTPS in production (Nginx + Certbot)
5. **Rate Limiting**: Configured in Nginx (10 req/s)
6. **Container Isolation**: Services run in isolated Docker network
7. **Secrets Management**: Consider HashiCorp Vault for Phase 2

---

## Scalability Path

### Phase 1 (Current)
- Single instance of each service
- Single PostgreSQL database
- Direct container-to-container communication

### Phase 2 (Next)
- Multiple API instances (horizontal scaling)
- Load balancer (Nginx upstream)
- Redis for caching (API keys, rate limits)
- Database read replicas

### Phase 3 (Future)
- Kubernetes deployment
- Service mesh (Istio)
- Distributed tracing (Jaeger)
- Centralized logging (ELK stack)

---

## Support & Contribution

### Getting Help

1. Check documentation in `docs/`
2. Review logs: `docker compose logs`
3. Check GitHub issues
4. Contact: tech@myco.io

### Contributing

1. Fork repository
2. Create feature branch
3. Follow coding standards
4. Add tests
5. Update documentation
6. Submit PR

---

**Built with ❤️ by MyPay Team**

