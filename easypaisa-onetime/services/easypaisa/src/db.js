/**
 * Database module for PostgreSQL
 * Handles transaction persistence and API key validation
 */

const { Pool } = require('pg');
const config = require('./config');

// Create connection pool
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

/**
 * Validate API key and get merchant info
 */
async function validateApiKey(apiKey) {
  try {
    const result = await pool.query(
      `UPDATE api_keys 
       SET last_used_at = CURRENT_TIMESTAMP 
       WHERE api_key = $1 AND is_active = TRUE 
       RETURNING merchant_id, merchant_name`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('[DB] Error validating API key:', error);
    throw error;
  }
}

/**
 * Save a new transaction
 */
async function saveTransaction(data) {
  const {
    reference,
    merchantId,
    provider = 'easypaisa',
    channel = 'MA',
    amount,
    currency = 'PKR',
    mobile,
    status,
    providerTransactionId,
    providerResponseCode,
    providerResponseDesc,
    providerPayload,
  } = data;

  try {
    const result = await pool.query(
      `INSERT INTO transactions (
        reference, merchant_id, provider, channel, amount, currency, mobile,
        status, provider_transaction_id,
        provider_response_code, provider_response_desc, provider_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        reference,
        merchantId,
        provider,
        channel,
        amount,
        currency,
        mobile,
        status,
        providerTransactionId,
        providerResponseCode,
        providerResponseDesc,
        providerPayload ? JSON.stringify(providerPayload) : null,
      ]
    );

    return result.rows[0];
  } catch (error) {
    // Check for duplicate reference
    if (error.code === '23505') {
      console.log(`[DB] Duplicate reference: ${reference}, fetching existing`);
      return await getTransactionByReference(reference, merchantId);
    }
    console.error('[DB] Error saving transaction:', error);
    throw error;
  }
}

/**
 * Update transaction status
 */
async function updateTransactionStatus(reference, merchantId, updates) {
  const {
    status,
    providerTransactionId,
    providerResponseCode,
    providerResponseDesc,
    providerPayload,
  } = updates;

  try {
    const result = await pool.query(
      `UPDATE transactions
       SET status = COALESCE($3, status),
           provider_transaction_id = COALESCE($4, provider_transaction_id),
           provider_response_code = COALESCE($5, provider_response_code),
           provider_response_desc = COALESCE($6, provider_response_desc),
           provider_payload = COALESCE($7, provider_payload),
           completed_at = CASE WHEN $3 IN ('SUCCESS', 'FAILED') THEN CURRENT_TIMESTAMP ELSE completed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE reference = $1 AND merchant_id = $2
       RETURNING *`,
      [
        reference,
        merchantId,
        status,
        providerTransactionId,
        providerResponseCode,
        providerResponseDesc,
        providerPayload ? JSON.stringify(providerPayload) : null,
      ]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('[DB] Error updating transaction:', error);
    throw error;
  }
}

/**
 * Get transaction by reference
 */
async function getTransactionByReference(reference, merchantId) {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE reference = $1 AND merchant_id = $2',
      [reference, merchantId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('[DB] Error getting transaction:', error);
    throw error;
  }
}

/**
 * Get transaction by provider transaction ID (our internal transactionId)
 */
async function getTransactionByProviderTxnId(providerTransactionId, merchantId) {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE provider_transaction_id = $1 AND merchant_id = $2',
      [providerTransactionId, merchantId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('[DB] Error getting transaction by provider txn id:', error);
    throw error;
  }
}

/**
 * Get all pending transactions for retry (older than specified seconds)
 */
async function getPendingTransactionsForRetry(olderThanSeconds = 20) {
  try {
    const result = await pool.query(
      `SELECT * FROM transactions
       WHERE status = 'PENDING'
       AND created_at < NOW() - INTERVAL '${olderThanSeconds} seconds'
       AND (completed_at IS NULL)
       ORDER BY created_at ASC
       LIMIT 50`
    );

    return result.rows;
  } catch (error) {
    console.error('[DB] Error getting pending transactions:', error);
    throw error;
  }
}

/**
 * Update transaction status by provider transaction ID
 */
async function updateTransactionByProviderTxnId(providerTransactionId, updates) {
  const {
    status,
    providerResponseCode,
    providerResponseDesc,
    providerPayload,
  } = updates;

  try {
    const result = await pool.query(
      `UPDATE transactions
       SET status = COALESCE($2, status),
           provider_response_code = COALESCE($3, provider_response_code),
           provider_response_desc = COALESCE($4, provider_response_desc),
           provider_payload = COALESCE($5, provider_payload),
           completed_at = CASE WHEN $2 IN ('SUCCESS', 'FAILED') THEN CURRENT_TIMESTAMP ELSE completed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE provider_transaction_id = $1
       RETURNING *`,
      [
        providerTransactionId,
        status,
        providerResponseCode,
        providerResponseDesc,
        providerPayload ? JSON.stringify(providerPayload) : null,
      ]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('[DB] Error updating transaction by provider txn id:', error);
    throw error;
  }
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('[DB] Connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('[DB] Connection failed:', error.message);
    return false;
  }
}

/**
 * Close database connection pool
 */
async function closePool() {
  await pool.end();
  console.log('[DB] Connection pool closed');
}

module.exports = {
  validateApiKey,
  saveTransaction,
  updateTransactionStatus,
  getTransactionByReference,
  getTransactionByProviderTxnId,
  getPendingTransactionsForRetry,
  updateTransactionByProviderTxnId,
  testConnection,
  closePool,
};

