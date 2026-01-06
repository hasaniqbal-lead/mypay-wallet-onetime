/**
 * Background Retry Scheduler for Pending Transactions
 *
 * Retry Schedule (max 10 minutes total):
 * - Attempt 1: +20 seconds
 * - Attempt 2: +40 seconds (1 min total)
 * - Attempt 3: +120 seconds (3 min total)
 * - Attempt 4: +5 minutes (8 min total)
 * - Attempt 5: +10 minutes (18 min total) - Final attempt
 *
 * Triggers on:
 * - Charge API timeout
 * - Provider returns system-failure error
 * - Status = PENDING after charge
 */

const db = require('./db');
const { JazzCashRestClient } = require('./jazzcash-rest-client');

const jazzCashClient = new JazzCashRestClient();

// Retry intervals in seconds
const RETRY_INTERVALS = [20, 40, 120, 300, 600];

// Track retry attempts per transaction (in-memory, resets on restart)
const retryAttempts = new Map();

/**
 * Map JazzCash response code to status (same as in index.js)
 */
function mapJazzCashStatus(responseCode) {
  if (responseCode === '000') {
    return {
      success: true,
      status: 'SUCCESS',
    };
  }

  if (responseCode === '124') {
    return {
      success: true,
      status: 'PENDING',
    };
  }

  return {
    success: false,
    status: 'FAILED',
  };
}

/**
 * Process a single pending transaction
 */
async function processTransaction(txn) {
  const txnId = txn.provider_transaction_id;
  const attempts = retryAttempts.get(txnId) || 0;

  if (attempts >= RETRY_INTERVALS.length) {
    console.log(`[RETRY] Max attempts reached for ${txnId}, marking as FAILED`);
    await db.updateTransactionByProviderTxnId(txnId, {
      status: 'FAILED',
      providerResponseDesc: 'Max retry attempts reached',
    });
    retryAttempts.delete(txnId);
    return;
  }

  console.log(`[RETRY] Attempt ${attempts + 1}/${RETRY_INTERVALS.length} for transaction ${txnId} (reference: ${txn.reference})`);

  try {
    const inquiry = await jazzCashClient.inquireTransaction({ txnRefNo: txnId });
    const status = mapJazzCashStatus(inquiry.responseCode);

    if (status.status !== 'PENDING') {
      console.log(`[RETRY] Transaction ${txnId} status changed to ${status.status}`);
      await db.updateTransactionByProviderTxnId(txnId, {
        status: status.status,
        providerResponseCode: inquiry.responseCode,
        providerResponseDesc: inquiry.responseMessage,
        providerPayload: inquiry.raw,
      });
      retryAttempts.delete(txnId);
    } else {
      retryAttempts.set(txnId, attempts + 1);
      console.log(`[RETRY] Transaction ${txnId} still PENDING, will retry later`);
    }
  } catch (err) {
    console.error(`[RETRY] Error inquiring transaction ${txnId}:`, err.message);
    retryAttempts.set(txnId, attempts + 1);
  }
}

/**
 * Main scheduler loop
 */
async function runScheduler() {
  try {
    // Get pending transactions older than 20 seconds
    const pendingTxns = await db.getPendingTransactionsForRetry(20);

    if (pendingTxns.length > 0) {
      console.log(`[RETRY] Found ${pendingTxns.length} pending transactions to check`);
    }

    for (const txn of pendingTxns) {
      const txnId = txn.provider_transaction_id;
      const attempts = retryAttempts.get(txnId) || 0;

      // Check if enough time has passed since last attempt
      const lastAttemptAge = Date.now() - (txn.updated_at ? new Date(txn.updated_at).getTime() : 0);
      const requiredInterval = (RETRY_INTERVALS[attempts] || RETRY_INTERVALS[RETRY_INTERVALS.length - 1]) * 1000;

      if (lastAttemptAge >= requiredInterval) {
        await processTransaction(txn);
      }
    }
  } catch (err) {
    console.error('[RETRY] Scheduler error:', err.message);
  }
}

/**
 * Start the background retry scheduler
 */
function startScheduler() {
  console.log('[RETRY] Starting background retry scheduler (checking every 10 seconds)');

  // Run immediately, then every 10 seconds
  runScheduler();
  setInterval(runScheduler, 10000);
}

module.exports = {
  startScheduler,
  processTransaction,
};
