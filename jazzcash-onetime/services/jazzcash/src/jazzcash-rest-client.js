const axios = require('axios');
const config = require('./config');
const crypto = require('crypto');

/**
 * JazzCash REST API client for Mobile Wallet (MWALLET) transactions.
 * 
 * API: https://payments.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction
 * Uses HMAC-SHA256 for secure hash generation
 */
class JazzCashRestClient {
  constructor() {
    this.baseUrl = config.jazzcash.baseUrl.replace(/\/+$/, '');
    this.merchantId = config.jazzcash.merchantId;
    this.password = config.jazzcash.password;
    this.integritySalt = config.jazzcash.integritySalt;
    this.returnUrl = config.jazzcash.returnUrl;
    this.version = '1.1';
    this.language = 'EN';
    this.currency = 'PKR';
  }

  /**
   * Generate JazzCash Secure Hash (HMAC-SHA256)
   * 
   * STEP 1: Collect all pp_ fields (except pp_SecureHash)
   * STEP 2: Sort fields alphabetically by parameter name
   * STEP 3: Concatenate values with &
   * STEP 4: Prepend integrity salt + &
   * STEP 5: Apply HMAC-SHA256
   * STEP 6: Return lowercase hex
   * 
   * @param {Object} params - All request parameters starting with pp_
   * @returns {string} - Lowercase hex HMAC-SHA256 hash
   * @private
   */
  _generateSecureHash(params) {
    // Step 1 & 2: Get all pp_ fields (except pp_SecureHash) and sort alphabetically
    const ppFields = Object.keys(params)
      .filter(key => key.startsWith('pp'))
      .sort(); // ASCII alphabetical order

    // Step 3: Join VALUES only with &
    const valueString = ppFields.map(key => params[key]).join('&');

    // Step 4: Prepend integrity salt + &
    const stringToHash = `${this.integritySalt}&${valueString}`;

    // Step 5 & 6: HMAC-SHA256 with integrity salt as key, output lowercase hex
    const hash = crypto
      .createHmac('sha256', this.integritySalt)
      .update(stringToHash, 'utf8')
      .digest('hex')
      .toLowerCase();

    return hash;
  }

  /**
   * Generate JazzCash transaction date-time in format: YYYYMMDDHHmmss
   * @returns {string}
   * @private
   */
  _generateDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Generate expiry date-time (24 hours from now)
   * @returns {string}
   * @private
   */
  _generateExpiryDateTime() {
    const now = new Date();
    now.setHours(now.getHours() + 24); // 24 hours expiry
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Initiate a Mobile Wallet (MWALLET) transaction via JazzCash.
   *
   * @param {Object} params
   * @param {string} params.reference - Merchant reference ID (sent as BillReference to JazzCash)
   * @param {number} params.amount - Transaction amount in PKR (will be converted to paisa)
   * @param {string} params.mobile - Customer mobile number (03XXXXXXXXX)
   * @returns {Promise<Object>}
   */
  async initiateMaTransaction({ reference, amount, mobile }) {
    const url = `${this.baseUrl}/ApplicationAPI/API/Payment/DoTransaction`;

    // Convert amount to paisa (smallest currency unit)
    // JazzCash expects amount in paisa (1 PKR = 100 paisa)
    const amountInPaisa = Math.round(Number(amount) * 100);

    // Generate timestamps
    const txnDateTime = this._generateDateTime();
    const txnExpiryDateTime = this._generateExpiryDateTime();

    // Build request parameters (all pp_ fields)
    // IMPORTANT: These MUST match the exact field names expected by JazzCash
    const params = {
      pp_Amount: String(amountInPaisa), // Amount in paisa
      pp_BillReference: reference, // Merchant reference (we use reference, JazzCash uses BillReference)
      pp_Description: 'MWallet One Time Payment', // Transaction description
      pp_Language: this.language, // EN
      pp_MerchantID: this.merchantId, // MYCONTENT5
      pp_Password: this.password, // h2x1yxctww
      pp_ReturnURL: this.returnUrl, // Callback URL
      pp_TxnCurrency: this.currency, // PKR
      pp_TxnDateTime: txnDateTime, // YYYYMMDDHHmmss
      pp_TxnExpiryDateTime: txnExpiryDateTime, // YYYYMMDDHHmmss (24 hrs later)
      pp_TxnRefNo: `T${txnDateTime}`, // Unique transaction reference
      pp_TxnType: 'MWALLET', // Mobile Wallet transaction type
      pp_Version: this.version, // 1.1
      ppmpf_1: mobile, // Customer mobile number
    };

    // Generate secure hash
    const secureHash = this._generateSecureHash(params);
    params.pp_SecureHash = secureHash;

    const headers = {
      'Content-Type': 'application/json',
    };

    console.log(`[JAZZCASH] Initiating MWALLET transaction: reference=${reference}, amount=${amount} PKR (${amountInPaisa} paisa), mobile=${mobile}`);

    try {
      const res = await axios.post(url, params, { headers, timeout: 30000 });
      const data = res.data || {};

      console.log(`[JAZZCASH] Response: ${data.pp_ResponseCode} - ${data.pp_ResponseMessage}`);

      return {
        raw: data,
        responseCode: data.pp_ResponseCode || null,
        responseMessage: data.pp_ResponseMessage || null,
        txnRefNo: data.pp_TxnRefNo || null,
        amount: data.pp_Amount || null,
        billReference: data.pp_BillReference || null,
        retryCount: data.pp_RetreivalReferenceNo || null,
      };
    } catch (err) {
      if (err.response) {
        const data = err.response.data || {};
        const code = data.pp_ResponseCode || null;
        const msg = data.pp_ResponseMessage || err.message;

        console.error(`[JAZZCASH] Error response: ${code} - ${msg}`);

        const wrapped = new Error(`JazzCash error: ${msg}`);
        wrapped.httpStatus = err.response.status;
        wrapped.responseCode = code;
        wrapped.responseMessage = msg;
        wrapped.raw = data;
        throw wrapped;
      }

      console.error(`[JAZZCASH] Network error: ${err.message}`);

      const wrapped = new Error(`JazzCash network error: ${err.message}`);
      wrapped.cause = err;
      throw wrapped;
    }
  }

  /**
   * Query transaction status
   * 
   * Note: JazzCash transaction inquiry would be a separate API endpoint
   * This is a placeholder for future implementation
   * 
   * @param {string} transactionId
   * @returns {Promise<Object>}
   */
  async queryTransaction(transactionId) {
    throw new Error('JazzCash transaction query not implemented yet');
  }
}

module.exports = {
  JazzCashRestClient,
};

