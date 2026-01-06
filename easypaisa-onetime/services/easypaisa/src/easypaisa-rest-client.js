const https = require('https');
const config = require('./config');

/**
 * Thin REST client for Easypaisa MA transactions.
 * Uses production REST endpoint: /easypay-service/rest/v4/initiate-ma-transaction
 */
class EasypaisaRestClient {
  constructor() {
    this.baseUrl = config.easypay.baseUrl.replace(/\/+$/, '');
    this.storeId = config.easypay.storeId;
    this.username = config.easypay.username;
    this.password = config.easypay.password;
    this.accountNum = config.easypay.accountNum;
    this.defaultEmail = config.easypay.defaultEmail;

    // Parse base URL
    const url = new URL(this.baseUrl);
    this.hostname = url.hostname;
    this.port = url.port || 443;
  }

  /**
   * Build Credentials header value for Easypaisa REST API.
   * Easypaisa uses a custom "Credentials" header with Base64(username:password)
   * @returns {string}
   * @private
   */
  _buildCredentialsHeader() {
    return Buffer.from(`${this.username}:${this.password}`).toString('base64');
  }

  /**
   * Initiate a Mobile Account (MA) transaction via Easypaisa REST.
   *
   * @param {Object} params
   * @param {string} params.reference - Merchant reference ID (sent as orderId to Easypaisa)
   * @param {number} params.amount
   * @param {string} params.mobile
   * @returns {Promise<{ raw: any, responseCode: string|null, responseDesc: string|null, transactionStatus: string|null, transactionId: string|null, paymentToken: string|null, paymentTokenExpiryDateTime: string|null }>}
   */
  async initiateMaTransaction({ reference, amount, mobile }) {
    const body = JSON.stringify({
      orderId: reference,  // Easypaisa uses orderId, we use reference
      storeId: Number(this.storeId),
      transactionAmount: Number(amount).toFixed(2),
      transactionType: 'MA',
      mobileAccountNo: mobile,
      emailAddress: this.defaultEmail,
    });

    const options = {
      hostname: this.hostname,
      port: this.port,
      path: '/easypay-service/rest/v4/initiate-ma-transaction',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Credentials': this._buildCredentialsHeader(),
      },
      timeout: 30000,
    };

    console.log('[EasypaisaRestClient] Request:', options.hostname + options.path);
    console.log('[EasypaisaRestClient] Body:', body);

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            console.log('[EasypaisaRestClient] Response:', JSON.stringify(parsed));

            resolve({
              raw: parsed,
              responseCode: parsed.responseCode || null,
              responseDesc: parsed.responseDesc || null,
              transactionStatus: parsed.transactionStatus || null,
              transactionId: parsed.transactionId || null,
              paymentToken: parsed.paymentToken || null,
              paymentTokenExpiryDateTime: parsed.paymentTokenExpiryDateTime || null,
            });
          } catch (e) {
            const wrapped = new Error(`Easypaisa parse error: ${e.message}`);
            wrapped.raw = data;
            reject(wrapped);
          }
        });
      });

      req.on('error', (e) => {
        const wrapped = new Error(`Easypaisa network error: ${e.message}`);
        wrapped.cause = e;
        reject(wrapped);
      });

      req.on('timeout', () => {
        req.destroy();
        const wrapped = new Error('Easypaisa network error: Request timeout');
        reject(wrapped);
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Inquire transaction status via Easypaisa REST.
   *
   * @param {Object} params
   * @param {string} params.orderId - The original order/reference ID
   * @returns {Promise<{ raw: any, responseCode: string|null, responseDesc: string|null, transactionStatus: string|null, transactionId: string|null }>}
   */
  async inquireTransaction({ orderId }) {
    const body = JSON.stringify({
      orderId: orderId,
      storeId: Number(this.storeId),
      accountNum: this.accountNum,
    });

    const options = {
      hostname: this.hostname,
      port: this.port,
      path: '/easypay-service/rest/v4/inquire-transaction',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Credentials': this._buildCredentialsHeader(),
      },
      timeout: 30000,
    };

    console.log('[EasypaisaRestClient] Inquiry Request:', options.hostname + options.path);
    console.log('[EasypaisaRestClient] Inquiry Body:', body);

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            console.log('[EasypaisaRestClient] Inquiry Response:', JSON.stringify(parsed));

            resolve({
              raw: parsed,
              responseCode: parsed.responseCode || null,
              responseDesc: parsed.responseDesc || null,
              transactionStatus: parsed.transactionStatus || null,
              transactionId: parsed.transactionId || null,
            });
          } catch (e) {
            const wrapped = new Error(`Easypaisa inquiry parse error: ${e.message}`);
            wrapped.raw = data;
            reject(wrapped);
          }
        });
      });

      req.on('error', (e) => {
        const wrapped = new Error(`Easypaisa inquiry network error: ${e.message}`);
        wrapped.cause = e;
        reject(wrapped);
      });

      req.on('timeout', () => {
        req.destroy();
        const wrapped = new Error('Easypaisa inquiry network error: Request timeout');
        reject(wrapped);
      });

      req.write(body);
      req.end();
    });
  }
}

module.exports = {
  EasypaisaRestClient,
};


