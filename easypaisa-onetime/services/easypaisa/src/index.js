const express = require('express');
const config = require('./config');
const { EasypaisaRestClient } = require('./easypaisa-rest-client');
const db = require('./db');
const { startScheduler } = require('./retry-scheduler');

const app = express();
const easypayClient = new EasypaisaRestClient();

app.use(express.json());

/**
 * Simple request logger for local dev.
 */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
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
    provider: 'easypaisa',
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
 *   "paymentMethod": "easypaisa"
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
    if (method !== 'easypaisa') {
      return res.status(400).json({
        success: false,
        error: `Payment method '${paymentMethod}' is not supported by this service. Use 'easypaisa'.`,
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
          providerStatus: existing.provider_payload?.transactionStatus,
          providerResponseCode: existing.provider_response_code,
          providerResponseDesc: existing.provider_response_desc,
        },
      });
    }

    // Call Easypaisa API
    const ep = await easypayClient.initiateMaTransaction({
      reference,
      amount,
      mobile,
    });

    const status = mapEasypayStatus(ep.transactionStatus, ep.responseCode);

    // Save transaction to database
    await db.saveTransaction({
      reference,
      merchantId,
      provider: 'easypaisa',
      channel: 'MA',
      amount,
      currency: 'PKR',
      mobile,
      status: status.status,
      providerTransactionId: ep.transactionId,
      providerResponseCode: ep.responseCode,
      providerResponseDesc: ep.responseDesc,
      providerPayload: ep.raw,
    });

    return res.status(status.httpStatus).json({
      success: status.success,
      reference,
      status: status.status,
      paymentMethod: 'easypaisa',
      amount,
      currency: 'PKR',
      transactionId: ep.transactionId || null,
      errorCode: status.errorCode || undefined,
      errorMessage: status.errorMessage || undefined,
      meta: {
        providerStatus: ep.transactionStatus,
        providerResponseCode: ep.responseCode,
        providerResponseDesc: ep.responseDesc,
        paymentToken: ep.paymentToken,
        paymentTokenExpiryDateTime: ep.paymentTokenExpiryDateTime,
      },
    });
  } catch (err) {
    console.error('[CHARGE] Error:', err.message, err.responseCode, err.responseDesc);

    const httpStatus = err.httpStatus && Number.isInteger(err.httpStatus) ? err.httpStatus : 500;

    return res.status(httpStatus).json({
      success: false,
      reference: req.body?.reference,
      status: 'FAILED',
      paymentMethod: req.body?.paymentMethod || null,
      errorCode: err.responseCode ? `EASYPAY_${err.responseCode}` : 'PROVIDER_ERROR',
      errorMessage: err.responseDesc || err.message || 'Payment processing failed',
      meta: {
        providerResponseCode: err.responseCode || null,
        providerResponseDesc: err.responseDesc || null,
      },
    });
  }
});

/**
 * POST /api/v1/inquire
 *
 * Inquire transaction status.
 *
 * Body:
 * {
 *   "transactionId": "44298883388"
 * }
 */
app.post('/api/v1/inquire', apiKeyAuth, async (req, res) => {
  try {
    const { transactionId } = req.body || {};

    // Validate transactionId
    if (!transactionId || typeof transactionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'transactionId is required and must be a string',
      });
    }

    const merchantId = req.merchant.merchant_id;

    console.log(`[INQUIRE] Looking up transaction: transactionId=${transactionId}, merchantId=${merchantId}`);

    // Look up transaction by provider transaction ID
    const txn = await db.getTransactionByProviderTxnId(transactionId, merchantId);

    if (!txn) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        transactionId,
      });
    }

    // If status is already terminal (SUCCESS or FAILED), return from DB
    if (txn.status === 'SUCCESS' || txn.status === 'FAILED') {
      return res.json({
        success: true,
        transactionId: txn.provider_transaction_id,
        reference: txn.reference,
        status: txn.status,
        paymentMethod: txn.provider,
        amount: parseFloat(txn.amount),
        currency: txn.currency,
        mobile: txn.mobile,
        createdAt: txn.created_at,
        updatedAt: txn.updated_at,
        meta: {
          providerResponseCode: txn.provider_response_code,
          providerResponseDesc: txn.provider_response_desc,
        },
      });
    }

    // Status is PENDING, call provider inquiry API
    console.log(`[INQUIRE] Transaction is PENDING, calling Easypaisa inquiry API for reference=${txn.reference}`);

    try {
      const inquiry = await easypayClient.inquireTransaction({ orderId: txn.reference });

      // Map response to status
      const status = mapEasypayStatus(inquiry.transactionStatus, inquiry.responseCode);

      // Update DB if status changed
      if (status.status !== txn.status) {
        console.log(`[INQUIRE] Status changed from ${txn.status} to ${status.status}, updating DB`);
        await db.updateTransactionByProviderTxnId(transactionId, {
          status: status.status,
          providerResponseCode: inquiry.responseCode,
          providerResponseDesc: inquiry.responseDesc,
          providerPayload: inquiry.raw,
        });
      }

      return res.json({
        success: true,
        transactionId: txn.provider_transaction_id,
        reference: txn.reference,
        status: status.status,
        paymentMethod: txn.provider,
        amount: parseFloat(txn.amount),
        currency: txn.currency,
        mobile: txn.mobile,
        createdAt: txn.created_at,
        updatedAt: new Date().toISOString(),
        meta: {
          providerResponseCode: inquiry.responseCode,
          providerResponseDesc: inquiry.responseDesc,
        },
      });
    } catch (inquiryErr) {
      console.error(`[INQUIRE] Provider inquiry failed:`, inquiryErr.message);

      // Return current DB status if inquiry fails
      return res.json({
        success: true,
        transactionId: txn.provider_transaction_id,
        reference: txn.reference,
        status: txn.status,
        paymentMethod: txn.provider,
        amount: parseFloat(txn.amount),
        currency: txn.currency,
        mobile: txn.mobile,
        createdAt: txn.created_at,
        updatedAt: txn.updated_at,
        meta: {
          providerResponseCode: txn.provider_response_code,
          providerResponseDesc: txn.provider_response_desc,
          inquiryError: inquiryErr.message,
        },
      });
    }
  } catch (err) {
    console.error('[INQUIRE] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: err.message,
    });
  }
});

/**
 * Map Easypaisa response/status to our clean status model.
 */
function mapEasypayStatus(txnStatus, responseCode) {
  const codeOk = responseCode === '0000' || responseCode === '0001';

  if (!codeOk) {
    return {
      httpStatus: 400,
      success: false,
      status: 'FAILED',
      errorCode: responseCode ? `EASYPAY_${responseCode}` : 'PROVIDER_ERROR',
      errorMessage: 'Payment initiation failed',
    };
  }

  const normalized = (txnStatus || '').toUpperCase();

  if (normalized === 'PAID' || normalized === 'PAID_AND_SETTLED') {
    return {
      httpStatus: 200,
      success: true,
      status: 'SUCCESS',
    };
  }

  if (['FAILED', 'REVERSED', 'EXPIRED', 'CANCELLED'].includes(normalized)) {
    return {
      httpStatus: 400,
      success: false,
      status: 'FAILED',
      errorCode: `EASYPAY_${responseCode || 'ERROR'}`,
      errorMessage: `Transaction ${normalized}`,
    };
  }

  // Anything else we treat as pending
  return {
    httpStatus: 202,
    success: true,
    status: 'PENDING',
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

// Test database connection on startup and start retry scheduler
db.testConnection().then(connected => {
  if (connected) {
    console.log('[DB] Database connection established');
    // Start background retry scheduler for pending transactions
    startScheduler();
  } else {
    console.warn('[DB] Database connection failed - running without persistence');
  }
});

// Start server
app.listen(config.port, () => {
  console.log('===============================================');
  console.log(' MyPay Wallets API - Easypaisa Service         ');
  console.log('-----------------------------------------------');
  console.log(` Port:        ${config.port}`);
  console.log(' Endpoints:');
  console.log('   POST /api/v1/charge   - Initiate payment');
  console.log('   POST /api/v1/inquire  - Check payment status');
  console.log(' Health:      GET  /health');
  console.log(' Auth header: X-Api-Key: <YOUR_API_KEY>');
  console.log('===============================================');
});
