# MyPay Wallets API - VPS Deployment Guide

Complete step-by-step guide to deploy the Wallets API on your VPS at `wallets.mycodigital.io`.

---

## Prerequisites

- VPS with Docker and Docker Compose installed
- SSH access to VPS (root@72.60.110.249)
- Nginx already configured (listening on port 8888)
- DNS A record for `wallets.mycodigital.io` pointing to `72.60.110.249`
- Easypaisa production credentials

---

## Step 1: Prepare VPS Directory

SSH into your VPS and create the project directory:

```bash
ssh root@72.60.110.249

# Create directory structure
mkdir -p /opt/mypay-wallets
cd /opt/mypay-wallets
```

---

## Step 2: Upload Project Files

From your local machine, upload the entire project to VPS:

### Option A: Using SCP

```bash
# From your local machine (in project root directory)
scp -r services infrastructure docs tests DEPLOYMENT.md README.md root@72.60.110.249:/opt/mypay-wallets/
```

### Option B: Using Git (recommended)

```bash
# On VPS
cd /opt/mypay-wallets
git clone <your-repo-url> .
```

---

## Step 3: Create Production `.env` File

On the VPS, create the environment file in the infrastructure directory:

```bash
cd /opt/mypay-wallets/infrastructure
nano .env
```

Paste and configure:

```env
# Server Configuration
PORT=4003
NODE_ENV=production

# Wallets API Key (optional, DB-based auth is primary)
WALLETS_API_KEY=production-api-key-change-me

# Easypaisa Production Credentials
EASYPAY_BASE_URL=https://easypay.easypaisa.com.pk
EASYPAY_USERNAME=MYCO
EASYPAY_PASSWORD=5e2ff2e9d26b18e4a0a08dfefd909294
EASYPAY_STORE_ID=1050331
EASYPAY_DEFAULT_EMAIL=noreply@mycodigital.io

# PostgreSQL Database
DB_HOST=wallets-db
DB_PORT=5432
DB_NAME=wallets_db
DB_USER=wallets_user
DB_PASSWORD=CHANGE_THIS_TO_STRONG_PASSWORD
```

**Important**: Change `DB_PASSWORD` to a strong random password!

Save and exit (Ctrl+X, Y, Enter).

---

## Step 4: Configure Nginx

### Add Wallets API server block

```bash
# Copy nginx config to sites-available
cp /opt/mypay-wallets/infrastructure/nginx/wallets.mycodigital.io.conf /etc/nginx/sites-available/

# Create symlink to sites-enabled
ln -s /etc/nginx/sites-available/wallets.mycodigital.io.conf /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# If test passes, reload nginx
systemctl reload nginx
```

---

## Step 5: Create Docker Network (if not exists)

The wallets-api needs to connect to your existing nginx network:

```bash
# Check if nginx-network exists
docker network ls | grep nginx-network

# If it doesn't exist, create it
docker network create nginx-network
```

---

## Step 6: Build and Start Containers

```bash
cd /opt/mypay-wallets/infrastructure

# Build the Docker image
docker compose build

# Start services (easypaisa-api + PostgreSQL)
docker compose up -d

# Check logs
docker compose logs -f
```

You should see:

```
easypaisa-api  | ===============================================
easypaisa-api  |  MyPay Wallets API - Easypaisa Gateway
easypaisa-api  | -----------------------------------------------
easypaisa-api  |  Port:        4003
easypaisa-api  |  Endpoint:    POST /api/v1/easypaisa/charge
easypaisa-api  | ===============================================
easypaisa-api  | [DB] Database connection established
```

Press Ctrl+C to exit logs (containers keep running).

---

## Step 7: Verify Deployment

### Test from VPS (internal)

```bash
# Health check
curl http://localhost:4003/health

# Should return:
# {"status":"ok","service":"wallets-api","provider":"easypaisa","timestamp":"..."}
```

### Test via Nginx (external)

```bash
# From your local machine
curl http://wallets.mycodigital.io:8888/health

# Or with subdomain routing
curl -H "Host: wallets.mycodigital.io" http://72.60.110.249:8888/health
```

---

## Step 8: Test Easypaisa Charge API

From your local machine or Postman:

```bash
curl -X POST http://wallets.mycodigital.io:8888/api/v1/easypaisa/charge \
  -H "X-Api-Key: test-wallets-key" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "PROD-TEST-001",
    "amount": 10.00,
    "mobile": "03097524704"
  }'
```

Expected response:

```json
{
  "success": true,
  "orderId": "PROD-TEST-001",
  "status": "PENDING",
  "provider": "easypaisa",
  "channel": "MA",
  "amount": 10,
  "currency": "PKR",
  "meta": {
    "easypayStatus": "PENDING",
    "easypayResponseCode": "0000",
    "easypayResponseDesc": "Success",
    "easypayTransactionId": "EP123456789",
    "paymentToken": "TOKEN-xyz",
    "paymentTokenExpiryDateTime": "2025-12-31T..."
  }
}
```

---

## Step 9: Add Production Merchant API Keys

### Option A: Direct Database Insert

```bash
# Connect to PostgreSQL container
docker exec -it wallets-db psql -U wallets_user -d wallets_db

# Insert merchant API key
INSERT INTO api_keys (merchant_id, api_key, merchant_name, is_active)
VALUES ('MERCHANT_001', 'mypay_prod_abc123xyz', 'Production Merchant 1', TRUE);

# Exit psql
\q
```

### Option B: Using pgAdmin or another DB client

- Host: `72.60.110.249`
- Port: `5432` (if exposed) or access via SSH tunnel
- Database: `wallets_db`
- User: `wallets_user`
- Password: (from your .env)

---

## Step 10: Enable HTTPS (Optional but Recommended)

### Prerequisites

- Port 80 must be available (currently used by Docker in your setup)
- Or use port 8888 and configure firewall/load balancer to handle HTTPS termination

### Using Certbot (if port 80 is available)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d wallets.mycodigital.io

# Certbot will auto-configure HTTPS in your nginx config
# Your endpoint will become: https://wallets.mycodigital.io/api/v1/easypaisa/charge
```

---

## Maintenance Commands

### View Logs

```bash
cd /opt/mypay-wallets/infrastructure

# All services
docker compose logs -f

# Only easypaisa-api
docker compose logs -f easypaisa-api

# Only database
docker compose logs -f wallets-db
```

### Restart Services

```bash
cd /opt/mypay-wallets/infrastructure

# Restart all
docker compose restart

# Restart only easypaisa-api
docker compose restart easypaisa-api
```

### Update Code

```bash
cd /opt/mypay-wallets

# Pull latest code (if using git)
git pull

# Rebuild and restart
cd infrastructure
docker compose down
docker compose build
docker compose up -d
```

### Database Backup

```bash
# Backup database
docker exec wallets-db pg_dump -U wallets_user wallets_db > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i wallets-db psql -U wallets_user wallets_db < backup_20251216.sql
```

### Check Service Status

```bash
cd /opt/mypay-wallets/infrastructure

# Docker containers
docker compose ps

# Nginx
systemctl status nginx

# View active connections
docker exec easypaisa-api netstat -tulpn | grep 4003
```

---

## Troubleshooting

### Issue: "Connection refused" from Nginx

**Cause**: easypaisa-api container not running or not in nginx-network

**Fix**:

```bash
cd /opt/mypay-wallets/infrastructure

# Check if container is running
docker compose ps

# Check if container is in nginx-network
docker network inspect nginx-network | grep easypaisa-api

# If not, restart docker-compose (it will auto-connect)
docker compose down && docker compose up -d
```

### Issue: "Invalid API key" errors

**Cause**: No API keys in database

**Fix**:

```bash
# Insert test API key
docker exec -it wallets-db psql -U wallets_user -d wallets_db
INSERT INTO api_keys (merchant_id, api_key, merchant_name, is_active)
VALUES ('TEST', 'test-wallets-key', 'Test Merchant', TRUE);
\q
```

### Issue: Database connection errors

**Cause**: PostgreSQL container not healthy

**Fix**:

```bash
cd /opt/mypay-wallets/infrastructure

# Check database health
docker compose ps wallets-db

# View database logs
docker compose logs wallets-db

# Restart database
docker compose restart wallets-db

# Wait 10 seconds, then restart API
sleep 10
docker compose restart easypaisa-api
```

### Issue: Easypaisa timeouts

**Cause**: Network issues or wrong credentials

**Fix**:

1. Check `.env` file has correct Easypaisa credentials
2. Verify VPS can reach Easypaisa API:

```bash
curl -I https://easypay.easypaisa.com.pk
```

3. Check firewall allows outbound HTTPS

---

## Production Checklist

- [ ] Strong `DB_PASSWORD` in `.env`
- [ ] Real Easypaisa production credentials
- [ ] Merchant API keys added to database
- [ ] Nginx rate limiting enabled
- [ ] HTTPS/SSL configured (if possible)
- [ ] Database backups scheduled (cron job)
- [ ] Log rotation configured
- [ ] Monitoring/alerts set up (optional)
- [ ] Firewall rules configured
- [ ] DNS A record for `wallets.mycodigital.io` verified

---

## URLs Summary

### Production Endpoints

- **Base URL**: `http://wallets.mycodigital.io:8888/api/v1`
- **Charge Easypaisa**: `POST /easypaisa/charge`
- **Health Check**: `GET /health`

### Future (Phase 2)

- **Charge JazzCash**: `POST /jazzcash/charge`

---

## Support

For issues:

1. Check logs: `docker compose logs -f`
2. Check Nginx error log: `tail -f /var/log/nginx/wallets-api-error.log`
3. Verify database connectivity: `docker exec wallets-db pg_isready`

**Last Updated**: December 16, 2025

