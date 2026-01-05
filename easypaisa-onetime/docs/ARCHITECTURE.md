# MyPay Wallets API - System Architecture

## Overview

MyPay Wallets API is a payment gateway aggregator that provides a unified REST API for Pakistani mobile wallet services. Phase 1 supports Easypaisa, with JazzCash planned for Phase 2.

---

## High-Level Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌────────────────┐
│  Merchant   │────────▶│  MyPay Wallets   │────────▶│   Easypaisa    │
│  System     │  REST   │      API         │  REST   │   Gateway      │
└─────────────┘         └──────────────────┘         └────────────────┘
      │                         │                            │
      │                         ▼                            │
      │                  ┌─────────────┐                    │
      │                  │ PostgreSQL  │                    │
      │                  │  Database   │                    │
      │                  └─────────────┘                    │
      │                                                      │
      └────────◀ Response (APPROVED/PENDING/FAILED) ◀──────┘
```

---

## Components

### 1. Merchant-Facing API

**Purpose:** Clean REST API for merchants
**Technology:** Node.js + Express
**Endpoint:** `POST /api/v1/easypaisa/charge`

**Features:**
- API key authentication
- Request validation
- Idempotent transactions
- Normalized response format

### 2. Easypaisa Integration Layer

**Purpose:** Communication with Easypaisa REST API
**Technology:** Axios HTTP client
**Protocol:** REST/JSON with Basic Auth

**Responsibilities:**
- Build Easypaisa-specific requests
- Handle authentication (Basic Auth)
- Parse and normalize responses
- Error handling and mapping

### 3. Database Layer

**Purpose:** Transaction persistence and API key management
**Technology:** PostgreSQL 15
**Schema:**
- `transactions` - All payment transactions
- `api_keys` - Merchant API keys

**Features:**
- Transaction history
- Idempotency enforcement (unique orderId)
- API key validation
- Audit trail

### 4. Reverse Proxy

**Purpose:** SSL termination, routing, rate limiting
**Technology:** Nginx
**Configuration:** `infrastructure/nginx/wallets.mycodigital.io.conf`

**Features:**
- Subdomain routing (`wallets.mycodigital.io`)
- SSL/TLS (production)
- Rate limiting (10 req/s)
- Load balancing (future)

### 5. Container Orchestration

**Purpose:** Deployment and scaling
**Technology:** Docker + Docker Compose
**Services:**
- `easypaisa-api` - Node.js application
- `wallets-db` - PostgreSQL database

---

## Transaction Flow

### Step-by-Step Process

```
1. Merchant Request
   ↓
   POST /api/v1/easypaisa/charge
   Headers: X-Api-Key
   Body: { orderId, amount, mobile }

2. API Key Validation
   ↓
   Query: SELECT * FROM api_keys WHERE api_key = ?
   Result: merchant_id

3. Idempotency Check
   ↓
   Query: SELECT * FROM transactions WHERE order_id = ? AND merchant_id = ?
   If exists: Return existing transaction
   If not: Continue

4. Call Easypaisa
   ↓
   POST https://easypay.easypaisa.com.pk/.../initiate-ma-transaction
   Headers: Authorization: Basic <base64>
   Body: { orderId, storeId, transactionAmount, transactionType, mobileAccountNo }

5. Save Transaction
   ↓
   INSERT INTO transactions (order_id, merchant_id, amount, status, ...)

6. Return Response
   ↓
   { success, orderId, status: "APPROVED"|"PENDING"|"FAILED", meta }
```

---

## Data Flow Diagram

```
Merchant                MyPay API              Easypaisa            Customer
   │                        │                       │                    │
   │  1. Charge Request     │                       │                    │
   │───────────────────────▶│                       │                    │
   │                        │                       │                    │
   │                        │  2. Validate API Key  │                    │
   │                        │────┐                  │                    │
   │                        │◀───┘                  │                    │
   │                        │                       │                    │
   │                        │  3. Initiate MA Txn   │                    │
   │                        │──────────────────────▶│                    │
   │                        │                       │                    │
   │                        │                       │  4. Send OTP/PIN   │
   │                        │                       │───────────────────▶│
   │                        │                       │                    │
   │                        │  5. Save to DB        │                    │  5. Confirm
   │                        │────┐                  │                    │     Payment
   │                        │◀───┘                  │◀───────────────────│
   │                        │                       │                    │
   │                        │  6. Get Status        │                    │
   │                        │──────────────────────▶│                    │
   │                        │◀──────────────────────│                    │
   │                        │   Status: PAID        │                    │
   │  7. Response           │                       │                    │
   │◀───────────────────────│                       │                    │
   │  { status: APPROVED }  │                       │                    │
```

---

## Database Schema

### Table: `transactions`

```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) UNIQUE NOT NULL,
    merchant_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(255),
    provider_response_code VARCHAR(20),
    provider_response_desc TEXT,
    provider_payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `api_keys`

```sql
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    merchant_id VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    merchant_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);
```

---

## Security Features

### 1. Authentication
- API key-based authentication
- Database-backed key validation
- Keys tracked with last_used_at

### 2. Authorization
- Each merchant can only access their own transactions
- Scoped by `merchant_id`

### 3. Transport Security
- HTTPS/TLS in production (Nginx + Certbot)
- Easypaisa API calls over HTTPS

### 4. Data Protection
- Sensitive credentials in environment variables
- No plain-text passwords in code
- API keys hashed (future enhancement)

### 5. Rate Limiting
- Nginx: 10 requests/second per IP
- Burst allowance: 20 requests

---

## Scalability Considerations

### Current Setup
- Single Node.js instance
- Single PostgreSQL instance
- Suitable for: ~100 TPS

### Phase 2 Enhancements
- Horizontal scaling: Multiple API instances
- Load balancer: Nginx upstream
- Database: Read replicas
- Caching: Redis for API key validation

---

## Monitoring & Logging

### Application Logs
- Request/response logging (Express middleware)
- Error logging with stack traces
- Easypaisa API call logging

### Database Logs
- Transaction audit trail in `transactions` table
- Query logging (PostgreSQL)

### Infrastructure Logs
- Nginx access logs: `/var/log/nginx/wallets-api-access.log`
- Nginx error logs: `/var/log/nginx/wallets-api-error.log`
- Docker logs: `docker compose logs`

---

## Future Phases

### Phase 2: JazzCash Integration

```
services/
├── easypaisa/       # Existing
└── jazzcash/        # New
    ├── src/
    │   ├── index.js
    │   └── jazzcash-rest-client.js
    ├── Dockerfile
    └── package.json
```

**New endpoint:** `POST /api/v1/jazzcash/charge`

### Phase 3: Advanced Features
- Webhook notifications
- Background polling for PENDING transactions
- Transaction analytics dashboard
- Multi-currency support

---

## Deployment Architecture

### VPS Setup

```
VPS (72.60.110.249)
├── Nginx (Port 8888)
│   └── Routes: wallets.mycodigital.io → Container
├── Docker Network
│   ├── easypaisa-api (Internal: 4003)
│   └── wallets-db (Internal: 5432)
└── DNS: wallets.mycodigital.io → 72.60.110.249
```

### Container Communication

```
Internet
    ↓
Nginx :8888
    ↓
Docker Network: wallets-network
    ├── easypaisa-api :4003 (not exposed to host)
    └── wallets-db :5432 (not exposed to host)
```

---

## Error Handling Strategy

### Layer 1: Input Validation
- Validate request format
- Check required fields
- Validate mobile number format

### Layer 2: Business Logic
- Check idempotency
- Validate API key
- Map to Easypaisa format

### Layer 3: External API
- Handle HTTP errors
- Parse Easypaisa response codes
- Retry logic (future)

### Layer 4: Response Normalization
- Map Easypaisa statuses to our statuses
- Standardize error messages
- Include debug info in `meta`

---

## Performance Metrics

### Target SLAs
- **API Response Time:** < 5s (p95)
- **Uptime:** 99.9%
- **Throughput:** 100 TPS

### Current Performance
- **Database queries:** < 50ms
- **Easypaisa API calls:** 2-5s
- **Total request time:** 2-6s

---

**Last Updated:** December 16, 2025

