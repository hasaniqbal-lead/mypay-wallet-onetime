# MyPay Wallets - Complete Developer Guide

**Your complete guide to start developing, making edits, and contributing to the MyPay Wallets platform.**

Last Updated: December 17, 2025

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Started](#getting-started)
3. [Project Structure Explained](#project-structure-explained)
4. [Making Your First Edit](#making-your-first-edit)
5. [Development Workflow](#development-workflow)
6. [Testing Your Changes](#testing-your-changes)
7. [Code Architecture](#code-architecture)
8. [Common Development Tasks](#common-development-tasks)
9. [Debugging Guide](#debugging-guide)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

---

## Prerequisites

### Required Software

Before you start, ensure you have these installed:

| Software | Version | Download/Install |
|----------|---------|------------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Docker Desktop** | Latest | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |
| **VS Code** (Recommended) | Latest | [code.visualstudio.com](https://code.visualstudio.com/) |
| **Postman** (Optional) | Latest | [postman.com](https://www.postman.com/) |

### Windows-Specific Setup

If you're on Windows (PowerShell):

1. **Install Docker Desktop for Windows**
   - Download from Docker website
   - Enable WSL 2 backend (recommended)
   - Restart your computer after installation

2. **Verify Installations**

```powershell
# Check Node.js
node --version  # Should show v18.x.x or higher

# Check Docker
docker --version  # Should show Docker version 20.x.x or higher
docker compose version  # Should show Docker Compose version v2.x.x

# Check Git
git --version  # Should show git version 2.x.x
```

3. **Install PowerShell 7** (if not already installed)
   - Windows 10/11: `winget install Microsoft.PowerShell`
   - Or download from [github.com/PowerShell/PowerShell](https://github.com/PowerShell/PowerShell)

---

## Getting Started

### Step 1: Clone the Repository

```powershell
# Navigate to your workspace
cd C:\Users\YourName\Desktop

# Clone the repository (or navigate if already cloned)
cd MYPAY-ONETIME-WALLETS
```

### Step 2: Understand the Monorepo Structure

This is a **monorepo** - multiple independent services in one repository:

```
MYPAY-ONETIME-WALLETS/
├── easypaisa-onetime/     # Easypaisa payment service
├── jazzcash-onetime/      # JazzCash payment service
├── shared/                 # Shared scripts and docs
└── README.md              # Main documentation
```

**Key Point**: Each wallet service is **completely independent**. You can work on one without affecting others.

### Step 3: Set Up Environment Files

Environment files (`.env`) are already created, but you may need to update credentials:

**Easypaisa Service:**
```powershell
# File: easypaisa-onetime/infrastructure/.env
# Edit with your actual Easypaisa credentials
```

**JazzCash Service:**
```powershell
# File: jazzcash-onetime/infrastructure/.env
# Already configured with test credentials
```

### Step 4: Start Services

```powershell
# Start Easypaisa service
cd easypaisa-onetime/infrastructure
docker compose up -d

# Start JazzCash service (in new terminal)
cd jazzcash-onetime/infrastructure
docker compose up -d

# Verify services are running
docker ps
```

### Step 5: Test the Services

```powershell
# Test Easypaisa health
curl http://localhost:4003/health

# Test JazzCash health
curl http://localhost:4004/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "wallets-api",
  "provider": "easypaisa",
  "timestamp": "2025-12-17T10:00:00.000Z"
}
```

---

## Project Structure Explained

### Monorepo Layout

```
MYPAY-ONETIME-WALLETS/
│
├── easypaisa-onetime/              # Easypaisa service
│   ├── services/easypaisa/         # ⭐ Main service code
│   │   ├── src/                    # Source code
│   │   │   ├── index.js            # Express server & routes
│   │   │   ├── config.js           # Configuration loader
│   │   │   ├── easypaisa-rest-client.js  # Easypaisa API client
│   │   │   └── db.js               # Database layer
│   │   ├── db/
│   │   │   └── init.sql            # Database schema
│   │   ├── Dockerfile              # Container build
│   │   └── package.json            # Dependencies
│   ├── infrastructure/             # Deployment configs
│   │   ├── docker-compose.yml      # Docker orchestration
│   │   └── .env                    # Environment variables
│   ├── docs/                       # Documentation
│   │   ├── API.md                  # API reference
│   │   └── ARCHITECTURE.md         # System design
│   └── tests/                      # Test files
│       └── postman/                # Postman collections
│
├── jazzcash-onetime/               # JazzCash service (same structure)
│
└── shared/                         # Shared resources
    ├── docs/                       # Monorepo docs
    └── scripts/                    # Deployment scripts
```

### Key Files You'll Edit

| File | Purpose | When to Edit |
|------|---------|--------------|
| `services/{wallet}/src/index.js` | API routes & business logic | Adding endpoints, modifying responses |
| `services/{wallet}/src/*-client.js` | Provider API integration | Updating API calls, error handling |
| `services/{wallet}/src/db.js` | Database operations | Adding queries, modifying schema access |
| `services/{wallet}/db/init.sql` | Database schema | Adding tables, indexes, functions |
| `infrastructure/docker-compose.yml` | Container config | Changing ports, adding services |
| `infrastructure/.env` | Environment variables | Updating credentials, config |

---

## Making Your First Edit

### Example 1: Add a New API Endpoint

Let's add a simple status endpoint to Easypaisa service:

**File**: `easypaisa-onetime/services/easypaisa/src/index.js`

```javascript
// Add this after the health check endpoint (around line 37)

/**
 * GET /api/v1/easypaisa/status
 * Get service status and statistics
 */
app.get('/api/v1/easypaisa/status', apiKeyAuth, async (req, res) => {
  try {
    const stats = await db.getTransactionStats(req.merchant.merchant_id);
    
    return res.json({
      success: true,
      merchant: req.merchant.merchant_name,
      stats: {
        total: stats.total,
        approved: stats.approved,
        pending: stats.pending,
        failed: stats.failed
      }
    });
  } catch (err) {
    console.error('[STATUS] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch status'
    });
  }
});
```

**Then add the database function** in `db.js`:

```javascript
async function getTransactionStats(merchantId) {
  const query = `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
      COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
      COUNT(*) FILTER (WHERE status = 'FAILED') as failed
    FROM transactions
    WHERE merchant_id = $1
  `;
  
  const result = await pool.query(query, [merchantId]);
  return result.rows[0];
}

module.exports = {
  // ... existing exports
  getTransactionStats
};
```

**Test your changes:**

```powershell
# Rebuild and restart the service
cd easypaisa-onetime/infrastructure
docker compose down
docker compose build
docker compose up -d

# Test the new endpoint
curl -H "X-Api-Key: test-wallets-key" http://localhost:4003/api/v1/easypaisa/status
```

### Example 2: Modify Error Handling

**File**: `easypaisa-onetime/services/easypaisa/src/index.js`

Find the error handler in the charge endpoint (around line 187):

```javascript
// Before
catch (err) {
  console.error('[EASYPAY_CHARGE] Error:', err.message);
  return res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
}

// After (with better error logging)
catch (err) {
  console.error('[EASYPAY_CHARGE] Error:', {
    message: err.message,
    stack: err.stack,
    orderId: req.body?.orderId,
    merchantId: req.merchant?.merchant_id
  });
  
  // Log to external service (if configured)
  // await logError(err, req);
  
  return res.status(500).json({
    success: false,
    orderId: req.body?.orderId,
    status: 'FAILED',
    error: 'Internal server error',
    errorCode: 'INTERNAL_ERROR'
  });
}
```

---

## Development Workflow

### Standard Development Cycle

```
1. Make Changes → 2. Test Locally → 3. Commit → 4. Deploy
```

### Step-by-Step Workflow

#### 1. Create a Feature Branch

```powershell
# Create and switch to new branch
git checkout -b feature/easypaisa/add-status-endpoint

# Or for JazzCash
git checkout -b feature/jazzcash/improve-error-handling
```

#### 2. Make Your Changes

- Edit source files in `services/{wallet}/src/`
- Update database schema if needed in `services/{wallet}/db/init.sql`
- Update tests if applicable

#### 3. Test Locally

```powershell
# Navigate to service
cd easypaisa-onetime/infrastructure

# Rebuild container with your changes
docker compose down
docker compose build
docker compose up -d

# View logs to check for errors
docker compose logs -f easypaisa-api

# Test your changes
curl http://localhost:4003/health
```

#### 4. Test with Postman

1. Import `MyPay_Merchant_APIs.postman_collection.json`
2. Test your new/modified endpoints
3. Verify responses match expectations

#### 5. Commit Your Changes

```powershell
# Stage your changes
git add easypaisa-onetime/services/easypaisa/src/index.js

# Commit with descriptive message
git commit -m "feat(easypaisa): Add status endpoint with transaction statistics"

# Push to remote
git push origin feature/easypaisa/add-status-endpoint
```

#### 6. Create Pull Request

- Push your branch to GitHub/GitLab
- Create a Pull Request
- Request review from team
- Merge after approval

---

## Testing Your Changes

### Method 1: Manual Testing with curl

```powershell
# Health check
curl http://localhost:4003/health

# Test charge endpoint
curl -X POST http://localhost:4003/api/v1/easypaisa/charge `
  -H "X-Api-Key: test-wallets-key" `
  -H "Content-Type: application/json" `
  -d '{\"orderId\":\"TEST-001\",\"amount\":100.00,\"mobile\":\"03097524704\"}'
```

### Method 2: Postman Collection

1. **Import Collection**: `MyPay_Merchant_APIs.postman_collection.json`
2. **Set Environment Variables**:
   - `easypaisa_local`: `http://localhost:4003/api/v1`
   - `api_key`: `test-wallets-key`
3. **Run Requests**: Test all endpoints
4. **Check Responses**: Verify status codes and data

### Method 3: Database Verification

```powershell
# Connect to database
docker exec -it wallets-db psql -U wallets_user -d wallets_db

# Check transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;

# Check API keys
SELECT merchant_id, merchant_name, is_active FROM api_keys;
```

### Method 4: View Logs

```powershell
# Real-time logs
cd easypaisa-onetime/infrastructure
docker compose logs -f easypaisa-api

# Last 100 lines
docker compose logs --tail=100 easypaisa-api

# Filter for errors
docker compose logs easypaisa-api | Select-String "ERROR"
```

---

## Code Architecture

### Request Flow

```
1. Merchant Request
   ↓
2. Express Server (index.js)
   ↓
3. API Key Authentication (apiKeyAuth middleware)
   ↓
4. Request Validation
   ↓
5. Database Check (idempotency)
   ↓
6. Provider API Call (*-client.js)
   ↓
7. Save to Database (db.js)
   ↓
8. Return Response
```

### Key Components

#### 1. Express Server (`index.js`)

- **Purpose**: HTTP server, routes, middleware
- **Key Functions**:
  - `apiKeyAuth()`: Validates API keys
  - Route handlers: Process requests
  - Error handling: Catches and formats errors

#### 2. Provider Client (`*-client.js`)

- **Purpose**: Communicates with external wallet APIs
- **Key Functions**:
  - `initiateMaTransaction()`: Calls provider API
  - Error mapping: Converts provider errors to standard format

#### 3. Database Layer (`db.js`)

- **Purpose**: All database operations
- **Key Functions**:
  - `validateApiKey()`: Checks API key validity
  - `saveTransaction()`: Stores transaction
  - `getTransactionByOrderId()`: Retrieves transaction (idempotency)

#### 4. Configuration (`config.js`)

- **Purpose**: Loads environment variables
- **Key Variables**:
  - Provider credentials
  - Database connection
  - API keys

---

## Common Development Tasks

### Task 1: Add a New Wallet Provider

1. **Copy existing service structure:**
   ```powershell
   cp -r easypaisa-onetime newwallet-onetime
   ```

2. **Rename service folder:**
   ```powershell
   cd newwallet-onetime/services
   mv easypaisa newwallet
   ```

3. **Update configuration files:**
   - `infrastructure/docker-compose.yml` (ports, names)
   - `services/newwallet/src/config.js` (provider config)
   - `services/newwallet/src/newwallet-client.js` (API implementation)

4. **Test:**
   ```powershell
   cd newwallet-onetime/infrastructure
   docker compose up -d
   curl http://localhost:4005/health
   ```

### Task 2: Modify Database Schema

1. **Edit schema file:**
   ```sql
   -- File: services/easypaisa/db/init.sql
   -- Add new column
   ALTER TABLE transactions ADD COLUMN customer_email VARCHAR(255);
   ```

2. **Update database layer:**
   ```javascript
   // File: services/easypaisa/src/db.js
   // Add email to saveTransaction function
   async function saveTransaction(data) {
     const query = `
       INSERT INTO transactions (..., customer_email)
       VALUES (..., $10)
     `;
     // ...
   }
   ```

3. **Recreate database:**
   ```powershell
   cd easypaisa-onetime/infrastructure
   docker compose down -v  # Removes volumes
   docker compose up -d     # Recreates with new schema
   ```

### Task 3: Add Request Validation

**File**: `services/easypaisa/src/index.js`

```javascript
// Add validation function
function validateChargeRequest(body) {
  const errors = [];
  
  if (!body.orderId || typeof body.orderId !== 'string') {
    errors.push('orderId is required and must be a string');
  }
  
  if (typeof body.amount !== 'number' || body.amount <= 0) {
    errors.push('amount must be a positive number');
  }
  
  if (!body.mobile || !/^03\d{9}$/.test(body.mobile)) {
    errors.push('mobile must be a valid 03XXXXXXXXX format');
  }
  
  return errors;
}

// Use in endpoint
app.post('/api/v1/easypaisa/charge', apiKeyAuth, async (req, res) => {
  const errors = validateChargeRequest(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }
  // ... rest of handler
});
```

### Task 4: Add Logging

```javascript
// Add structured logging
const logTransaction = (orderId, status, merchantId) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'transaction',
    orderId,
    status,
    merchantId
  }));
};

// Use in endpoint
logTransaction(orderId, status.status, merchantId);
```

---

## Debugging Guide

### Debugging Techniques

#### 1. View Container Logs

```powershell
# Real-time logs
docker compose logs -f easypaisa-api

# Last 50 lines
docker compose logs --tail=50 easypaisa-api

# Specific time range
docker compose logs --since 10m easypaisa-api
```

#### 2. Check Database State

```powershell
# Connect to database
docker exec -it wallets-db psql -U wallets_user -d wallets_db

# Check recent transactions
SELECT order_id, status, amount, created_at 
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;

# Check API keys
SELECT * FROM api_keys WHERE is_active = true;
```

#### 3. Test API Directly

```powershell
# Test with verbose output
curl -v -X POST http://localhost:4003/api/v1/easypaisa/charge `
  -H "X-Api-Key: test-wallets-key" `
  -H "Content-Type: application/json" `
  -d '{\"orderId\":\"DEBUG-001\",\"amount\":100,\"mobile\":\"03097524704\"}'
```

#### 4. Inspect Container

```powershell
# Enter container shell
docker exec -it easypaisa-api sh

# Check environment variables
env | grep DB_

# Check file structure
ls -la /app/src
```

#### 5. Use VS Code Debugger

1. **Install VS Code Docker extension**
2. **Attach to running container:**
   - Open VS Code
   - Go to Run & Debug
   - Select "Attach to Node"
   - Set breakpoints in your code

---

## Troubleshooting

### Issue: "Cannot connect to database"

**Symptoms:**
```
[DB] Database connection failed
```

**Solutions:**

1. **Check if database is running:**
   ```powershell
   docker ps | Select-String "wallets-db"
   ```

2. **Check database logs:**
   ```powershell
   docker compose logs wallets-db
   ```

3. **Verify environment variables:**
   ```powershell
   # Check .env file
   Get-Content easypaisa-onetime/infrastructure/.env | Select-String "DB_"
   ```

4. **Restart database:**
   ```powershell
   docker compose restart wallets-db
   ```

### Issue: "Port already in use"

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::4003
```

**Solutions:**

1. **Find process using port:**
   ```powershell
   netstat -ano | findstr :4003
   ```

2. **Kill the process** (replace PID):
   ```powershell
   taskkill /PID <PID> /F
   ```

3. **Or change port in docker-compose.yml:**
   ```yaml
   ports:
     - "4005:4003"  # Use different host port
   ```

### Issue: "Invalid API key"

**Symptoms:**
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

**Solutions:**

1. **Check API key in database:**
   ```powershell
   docker exec -it wallets-db psql -U wallets_user -d wallets_db -c "SELECT * FROM api_keys;"
   ```

2. **Add test API key if missing:**
   ```sql
   INSERT INTO api_keys (merchant_id, api_key, merchant_name, is_active)
   VALUES ('TEST_MERCHANT', 'test-wallets-key', 'Test Merchant', TRUE);
   ```

3. **Verify header in request:**
   ```powershell
   # Use -H flag correctly
   curl -H "X-Api-Key: test-wallets-key" http://localhost:4003/health
   ```

### Issue: "Container keeps restarting"

**Symptoms:**
```
Container status: Restarting (1) 2 seconds ago
```

**Solutions:**

1. **Check logs for errors:**
   ```powershell
   docker compose logs easypaisa-api
   ```

2. **Check health status:**
   ```powershell
   docker inspect easypaisa-api | Select-String "Health"
   ```

3. **Remove and recreate:**
   ```powershell
   docker compose down
   docker compose up -d
   ```

### Issue: "Changes not reflecting"

**Symptoms:**
- Code changes don't appear in running service

**Solutions:**

1. **Rebuild container:**
   ```powershell
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ```

2. **Check if file was saved:**
   ```powershell
   # Verify file content
   Get-Content services/easypaisa/src/index.js | Select-String "your-change"
   ```

3. **Check Dockerfile COPY command:**
   - Ensure your file is being copied in Dockerfile

---

## Best Practices

### Code Style

1. **Use consistent naming:**
   - Functions: `camelCase`
   - Constants: `UPPER_SNAKE_CASE`
   - Files: `kebab-case.js`

2. **Add comments:**
   ```javascript
   /**
    * Initiates Easypaisa MA transaction
    * @param {Object} params - Transaction parameters
    * @param {string} params.orderId - Unique order ID
    * @param {number} params.amount - Amount in PKR
    * @param {string} params.mobile - Customer mobile (03XXXXXXXXX)
    * @returns {Promise<Object>} Transaction result
    */
   async function initiateMaTransaction(params) {
     // Implementation
   }
   ```

3. **Handle errors properly:**
   ```javascript
   try {
     // Operation
   } catch (err) {
     console.error('[CONTEXT] Error:', err.message, err);
     // Return user-friendly error
   }
   ```

### Git Workflow

1. **Commit messages:**
   ```
   feat(easypaisa): Add status endpoint
   fix(jazzcash): Fix HMAC hash calculation
   docs: Update API documentation
   refactor: Simplify error handling
   ```

2. **Branch naming:**
   ```
   feature/{wallet}/feature-name
   fix/{wallet}/bug-description
   docs/{topic}
   ```

3. **Keep commits small:**
   - One feature/fix per commit
   - Easy to review and revert

### Testing

1. **Test before committing:**
   - Run health checks
   - Test with Postman
   - Check logs for errors

2. **Test edge cases:**
   - Invalid inputs
   - Network failures
   - Database errors

3. **Test idempotency:**
   - Submit same orderId twice
   - Verify no duplicate charges

### Security

1. **Never commit secrets:**
   - `.env` files are gitignored
   - Use environment variables
   - Don't hardcode credentials

2. **Validate all inputs:**
   - Check data types
   - Validate formats (mobile, amount)
   - Sanitize user input

3. **Use parameterized queries:**
   ```javascript
   // ✅ Good
   pool.query('SELECT * FROM transactions WHERE order_id = $1', [orderId]);
   
   // ❌ Bad (SQL injection risk)
   pool.query(`SELECT * FROM transactions WHERE order_id = '${orderId}'`);
   ```

---

## Quick Reference

### Essential Commands

```powershell
# Start service
cd {wallet}-onetime/infrastructure
docker compose up -d

# Stop service
docker compose down

# View logs
docker compose logs -f {wallet}-api

# Rebuild after changes
docker compose down
docker compose build
docker compose up -d

# Test health
curl http://localhost:4003/health

# Database access
docker exec -it wallets-db psql -U wallets_user -d wallets_db
```

### File Locations

| What | Where |
|------|-------|
| API Routes | `services/{wallet}/src/index.js` |
| Provider Client | `services/{wallet}/src/*-client.js` |
| Database Layer | `services/{wallet}/src/db.js` |
| Database Schema | `services/{wallet}/db/init.sql` |
| Docker Config | `infrastructure/docker-compose.yml` |
| Environment | `infrastructure/.env` |

### Documentation Links

- **Main README**: [README.md](README.md)
- **Project Structure**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- **Architecture**: [shared/docs/MONOREPO_ARCHITECTURE.md](shared/docs/MONOREPO_ARCHITECTURE.md)
- **Easypaisa API**: [easypaisa-onetime/docs/API.md](easypaisa-onetime/docs/API.md)
- **JazzCash API**: [jazzcash-onetime/docs/API.md](jazzcash-onetime/docs/API.md)

---

## Getting Help

### Resources

1. **Check Documentation First**
   - This guide
   - Service READMEs
   - API documentation

2. **Check Logs**
   ```powershell
   docker compose logs {wallet}-api
   ```

3. **Check Database**
   ```powershell
   docker exec -it {wallet}-db psql -U {user} -d {db}
   ```

### Support Contacts

- **Technical Issues**: tech@myco.io
- **API Questions**: See API.md files
- **Architecture Questions**: See MONOREPO_ARCHITECTURE.md

---

## Next Steps

1. ✅ **Read this guide completely**
2. ✅ **Set up your development environment**
3. ✅ **Start both services locally**
4. ✅ **Test with Postman collection**
5. ✅ **Make a small test change**
6. ✅ **Commit and push your changes**

**You're now ready to start developing!** 🚀

---

**Last Updated**: December 17, 2025  
**Maintained by**: MyPay Development Team

