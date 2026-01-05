# Deployment Plan: MyPay Wallet Onetime API

## Overview
Deploy Easypaisa and JazzCash wallet services to VPS with domain `wallets.mypay.mx`

## Target Infrastructure
- **VPS IP**: 72.60.110.249
- **Domain**: wallets.mypay.mx
- **Easypaisa Port**: 4003 (internal)
- **JazzCash Port**: 4004 (internal)
- **PostgreSQL**: Shared database container with separate databases

---

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │               INTERNET                       │
                    └─────────────────┬───────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────────────┐
                    │           wallets.mypay.mx:443              │
                    │              (NGINX + SSL)                   │
                    └─────────────────┬───────────────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
              ▼                                               ▼
    POST /api/v1/charge                           POST /api/v1/charge
    paymentMethod: "easypaisa"                    paymentMethod: "jazzcash"
              │                                               │
              ▼                                               ▼
┌─────────────────────────┐                   ┌─────────────────────────┐
│    easypaisa-api:4003   │                   │    jazzcash-api:4004    │
│    (Docker Container)    │                   │    (Docker Container)   │
└───────────┬─────────────┘                   └───────────┬─────────────┘
            │                                             │
            └──────────────────┬──────────────────────────┘
                               │
                               ▼
            ┌─────────────────────────────────────────────┐
            │           wallets-postgres:5432              │
            │           (Docker Container)                 │
            │  ┌─────────────┐  ┌─────────────────────┐   │
            │  │ easypaisa_db│  │    jazzcash_db      │   │
            │  └─────────────┘  └─────────────────────┘   │
            └─────────────────────────────────────────────┘
```

---

## Pre-Deployment Tasks

### 1. Initialize Git Repository
```bash
cd /path/to/MYPAY-ONETIME-WALLETS
git init
git add .
git commit -m "Initial commit: Easypaisa and JazzCash wallet services"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Create Production Files
- Unified `docker-compose.prod.yml`
- Production `.env.production` with strong passwords
- Nginx configuration file
- Deployment script

---

## Files to Create

### 1. `deploy/docker-compose.prod.yml`
Unified Docker Compose for all wallet services with:
- Shared PostgreSQL database
- Isolated networks
- Health checks
- Log rotation
- Resource limits

### 2. `deploy/.env.production`
Strong passwords generated for:
- Database root password
- Easypaisa DB password
- JazzCash DB password
- Wallets API key

### 3. `deploy/nginx/wallets.mypay.mx.conf`
Nginx configuration with:
- SSL termination (Let's Encrypt)
- Reverse proxy to services
- Request routing based on paymentMethod
- Rate limiting
- Security headers

### 4. `deploy/deploy.sh`
Deployment script that:
- Clones/pulls from git
- Builds Docker images
- Starts containers
- Configures nginx
- Obtains SSL certificate

---

## Deployment Steps

### Phase 1: Git Setup (Local)
1. Initialize git repository
2. Add .gitignore for sensitive files
3. Commit all changes
4. Push to GitHub/GitLab

### Phase 2: VPS Preparation
1. Create deployment directory: `/opt/mypay-wallets`
2. Clone repository
3. Copy production environment file
4. Create Docker network

### Phase 3: Container Deployment
1. Build Docker images
2. Start PostgreSQL
3. Wait for database health
4. Start API services
5. Verify health endpoints

### Phase 4: Nginx Configuration
1. Add wallets.mypay.mx server block
2. Obtain SSL certificate via certbot
3. Test nginx configuration
4. Reload nginx

### Phase 5: Verification
1. Test health endpoints
2. Test charge endpoint (both Easypaisa and JazzCash)
3. Monitor logs
4. Set up monitoring (optional)

---

## Security Considerations

1. **Database Passwords**: 32-character random strings
2. **API Keys**: Cryptographically secure tokens
3. **Network Isolation**: Services on internal Docker network
4. **No Port Exposure**: Database not exposed to host
5. **SSL/TLS**: All traffic encrypted
6. **Rate Limiting**: Prevent abuse
7. **Security Headers**: HSTS, X-Frame-Options, etc.

---

## Rollback Plan

If deployment fails:
1. Stop new containers: `docker compose -f docker-compose.prod.yml down`
2. Remove nginx config: `rm /etc/nginx/sites-enabled/wallets.mypay.mx`
3. Reload nginx: `nginx -s reload`
4. Previous services remain unaffected

---

## Monitoring

### Health Check URLs
- Easypaisa: `https://wallets.mypay.mx/easypaisa/health`
- JazzCash: `https://wallets.mypay.mx/jazzcash/health`

### Log Commands
```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service
docker compose -f docker-compose.prod.yml logs -f easypaisa-api
docker compose -f docker-compose.prod.yml logs -f jazzcash-api
```

---

## Expected Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/charge | Process payment (paymentMethod in body) |
| GET | /health | Service health check |
| GET | /api/v1/transaction/:reference | Get transaction status |

---

## DNS Configuration Required

Add A record for `wallets.mypay.mx` pointing to `72.60.110.249`
