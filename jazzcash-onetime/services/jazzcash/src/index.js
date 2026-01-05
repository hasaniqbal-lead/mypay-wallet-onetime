const express = require('express');
const config = require('./config');
const { JazzCashRestClient } = require('./jazzcash-rest-client');
const db = require('./db');

const app = express();
const jazzCashClient = new JazzCashRestClient();

app.use(express.json());

/**
 * Simple request logger for local dev.
 */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    // Basic, low-noise log
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ` +
        `${res.statusCode} ${ms}ms`
    );
  });
  next();
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'wallets-api',
    provider: 'jazzcash',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API key auth middleware.
 * Expects header: X-Api-Key
 * Validates against database and attaches merchant info to req
 */
async function apiKeyAuth(req, res, next) {
  const apiKey = req.header('X-Api-Key');

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing API key header (X-Api-Key)',
    });
  }

  try {
    const merchant = await db.validateApiKey(apiKey);
    
    if (!merchant) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
      });
    }

    // Attach merchant info to request for downstream use
    req.merchant = merchant;
    next();
  } catch (error) {
    console.error('[AUTH] Error validating API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
    });
  }
}

/**
 * POST /api/v1/charge
 *
 * Direct charge endpoint for wallet payments.
 *
 * Body:
 * {
 *   "reference": "ORDER-12345",
 *   "amount": 100.00,
 *   "mobile": "03097524704",
 *   "paymentMethod": "jazzcash"
 * }
 */
app.post('/api/v1/charge', apiKeyAuth, async (req, res) => {
  try {
    const { reference, amount, mobile, paymentMethod } = req.body || {};

    // Validate paymentMethod
    if (!paymentMethod || typeof paymentMethod !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'paymentMethod is required (easypaisa or jazzcash)',
      });
    }

    const method = paymentMethod.toLowerCase();
    if (method !== 'jazzcash') {
      return res.status(400).json({
        success: false,
        error: `Payment method '${paymentMethod}' is not supported by this service. Use 'jazzcash'.`,
      });
    }

    // Validate reference
    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'reference is required and must be a string',
      });
    }

    // Validate amount
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number',
      });
    }

    // Validate mobile
    if (!mobile || typeof mobile !== 'string' || !/^03\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        error: 'mobile must be a valid Pakistani number in 03XXXXXXXXX format',
      });
    }

    const merchantId = req.merchant.merchant_id;

    console.log(
      `[CHARGE] Initiating ${method} transaction reference=${reference}, merchantId=${merchantId}, amount=${amount}, mobile=${mobile}`
    );

    // Check if transaction already exists (idempotency)
    const existing = await db.getTransactionByReference(reference, merchantId);
    if (existing) {
      console.log(`[CHARGE] Duplicate reference=${reference}, returning existing transaction`);
      const existingStatus = mapStatusFromDb(existing.status);
      return res.status(existingStatus.httpStatus).json({
        success: existingStatus.success,
        reference: existing.reference,
        status: existing.status,
        paymentMethod: existing.provider,
        amount: parseFloat(existing.amount),
        currency: existing.currency,
        transactionId: existing.provider_transaction_id || null,
        errorCode: existingStatus.errorCode || undefined,
        errorMessage: existingStatus.errorMessage || undefined,
        meta: {
          providerResponseCode: existing.provider_response_code,
          providerResponseDesc: existing.provider_response_desc,
        },
      });
    }

    // Call JazzCash API
    const jc = await jazzCashClient.initiateMaTransaction({
      reference,
      amount,
      mobile,
    });

    const status = mapJazzCashStatus(jc.responseCode);

    // Save transaction to database
    await db.saveTransaction({
      reference,
      merchantId,
      provider: 'jazzcash',
      channel: 'MWALLET',
      amount,
      currency: 'PKR',
      mobile,
      status: status.status,
      providerTransactionId: jc.txnRefNo,
      providerResponseCode: jc.responseCode,
      providerResponseDesc: jc.responseMessage,
      providerPayload: jc.raw,
    });

    return res.status(status.httpStatus).json({
      success: status.success,
      reference,
      status: status.status,
      paymentMethod: 'jazzcash',
      amount,
      currency: 'PKR',
      transactionId: jc.txnRefNo || null,
      errorCode: status.errorCode || undefined,
      errorMessage: status.errorMessage || undefined,
      meta: {
        providerResponseCode: jc.responseCode,
        providerResponseDesc: jc.responseMessage,
        jazzCashTxnRefNo: jc.txnRefNo,
        jazzCashAmount: jc.amount,
      },
    });
  } catch (err) {
    console.error('[CHARGE] Error:', err.message, err.responseCode, err.responseMessage);

    const httpStatus = err.httpStatus && Number.isInteger(err.httpStatus) ? err.httpStatus : 500;

    return res.status(httpStatus).json({
      success: false,
      reference: req.body?.reference,
      status: 'FAILED',
      paymentMethod: req.body?.paymentMethod || null,
      errorCode: err.responseCode ? `JAZZCASH_${err.responseCode}` : 'PROVIDER_ERROR',
      errorMessage: err.responseMessage || err.message || 'Payment processing failed',
      meta: {
        providerResponseCode: err.responseCode || null,
        providerResponseDesc: err.responseMessage || null,
      },
    });
  }
});

/**
 * Map JazzCash response code to our clean status model.
 *
 * JazzCash Response Codes:
 * - 000: Success
 * - 124: Duplicate Transaction
 * - Other codes: Various error conditions
 *
 * @param {string|null} responseCode
 * @returns {{httpStatus:number, success:boolean, status:string, errorCode?:string, errorMessage?:string}}
 */
function mapJazzCashStatus(responseCode) {
  // Success codes
  if (responseCode === '000') {
    return {
      httpStatus: 200,
      success: true,
      status: 'SUCCESS',
    };
  }

  // Pending codes (transaction initiated but not completed)
  if (responseCode === '124') {
    return {
      httpStatus: 202,
      success: true,
      status: 'PENDING',
    };
  }

  // All other codes are treated as failures
  return {
    httpStatus: 400,
    success: false,
    status: 'FAILED',
    errorCode: responseCode ? `JAZZCASH_${responseCode}` : 'JAZZCASH_ERROR',
    errorMessage: 'JazzCash transaction failed',
  };
}

/**
 * Map status from DB to HTTP response structure
 */
function mapStatusFromDb(dbStatus) {
  if (dbStatus === 'SUCCESS') {
    return { httpStatus: 200, success: true };
  }
  if (dbStatus === 'FAILED') {
    return { httpStatus: 400, success: false, errorCode: 'TRANSACTION_FAILED', errorMessage: 'Transaction failed' };
  }
  return { httpStatus: 202, success: true };
}

// Test database connection on startup
db.testConnection().then(connected => {
  if (connected) {
    console.log('[DB] Database connection established');
  } else {
    console.warn('[DB] Database connection failed - running without persistence');
  }
});

// Start server
app.listen(config.port, () => {
  console.log('===============================================');
  console.log(' MyPay Wallets API - Direct Charge Service     ');
  console.log('-----------------------------------------------');
  console.log(` Port:        ${config.port}`);
  console.log(' Endpoint:    POST /api/v1/charge');
  console.log(' Health:      GET  /health');
  console.log(' Auth header: X-Api-Key: <YOUR_API_KEY>');
  console.log('===============================================');
});


