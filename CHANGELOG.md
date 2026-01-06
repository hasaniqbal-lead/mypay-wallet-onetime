# Changelog

All notable changes to the MyPay Wallets API project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-01-06

### Added
- **Transaction Inquiry API** (`POST /api/v1/inquire`)
  - New endpoint for both Easypaisa and JazzCash services
  - Merchants can check transaction status using `transactionId`
  - If status is PENDING, automatically calls provider inquiry API
  - Updates database if status has changed

- **Background Retry Scheduler**
  - Automatically retries PENDING transactions
  - Retry schedule: 20s → 40s → 120s → 5min → 10min (max 5 attempts)
  - Marks transaction as FAILED after max retries exhausted
  - Runs every 10 seconds checking for stale PENDING transactions

- **Easypaisa Inquiry API Integration**
  - Added `inquireTransaction()` method to `EasypaisaRestClient`
  - Endpoint: `/easypay-service/rest/v4/inquire-transaction`
  - Requires `EASYPAY_ACCOUNT_NUM` environment variable

- **JazzCash Inquiry API Integration**
  - Added `inquireTransaction()` method to `JazzCashRestClient`
  - Endpoint: `/ApplicationAPI/API/PaymentInquiry/Inquire`

- **New Database Methods**
  - `getTransactionByProviderTxnId()` - lookup by provider transaction ID
  - `getPendingTransactionsForRetry()` - get stale PENDING transactions
  - `updateTransactionByProviderTxnId()` - update transaction by provider ID

### Changed
- Updated startup messages to show both `/charge` and `/inquire` endpoints

---

## [1.0.1] - 2026-01-05

### Fixed
- **Alpine Docker CA Certificates Issue**
  - Added `ca-certificates` package to both Dockerfiles
  - Fixed HTTPS connection timeouts to Easypaisa and JazzCash production APIs
  - Root cause: Alpine Linux minimal image missing CA bundle for TLS verification

---

## [1.0.0] - 2026-01-05

### Added
- **Initial Production Release**

- **Easypaisa Service** (Port 4003)
  - `POST /api/v1/charge` - Initiate MA (Mobile Account) transactions
  - Uses Easypaisa REST API v4
  - Custom `Credentials` header authentication (Base64)
  - PostgreSQL persistence for transactions

- **JazzCash Service** (Port 4004)
  - `POST /api/v1/charge` - Initiate MWALLET transactions
  - Uses JazzCash DoTransaction API
  - HMAC-SHA256 secure hash authentication
  - PostgreSQL persistence for transactions

- **Unified API Structure**
  - Common request format: `{ reference, amount, mobile, paymentMethod }`
  - Common response format: `{ success, reference, status, transactionId, meta }`
  - Standardized status values: `SUCCESS`, `PENDING`, `FAILED`

- **Docker Production Setup**
  - Multi-stage Alpine-based Dockerfiles
  - Shared PostgreSQL database with separate schemas
  - Docker Compose configuration for production
  - Internal network for database, external for nginx

- **Nginx Reverse Proxy Configuration**
  - SSL/TLS with Let's Encrypt
  - Rate limiting (10 req/s with burst 20)
  - Security headers
  - Path-based routing: `/easypaisa/api/*` and `/jazzcash/api/*`

- **API Key Authentication**
  - Database-backed API key validation
  - Merchant identification via `X-Api-Key` header
  - Key usage tracking

- **Transaction Idempotency**
  - Duplicate reference detection
  - Returns existing transaction on duplicate requests

### Infrastructure
- VPS deployment at 72.60.110.249
- Domain: wallets.mypay.mx
- PostgreSQL 15 (Alpine)
- Node.js 18 (Alpine)

---

## Version History Summary

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 1.1.0 | 2026-01-06 | Feature | Transaction inquiry API & background retry |
| 1.0.1 | 2026-01-05 | Bugfix | Alpine Docker CA certificates fix |
| 1.0.0 | 2026-01-05 | Release | Initial production deployment |

---

## Upcoming Features

- [ ] Webhook notifications for transaction status changes
- [ ] Transaction refund/reversal API
- [ ] Merchant dashboard
- [ ] Additional wallet providers (UPaisa, SadaPay, NayaPay)
