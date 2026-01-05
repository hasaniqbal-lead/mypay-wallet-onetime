const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  port: Number(process.env.PORT || 4004),

  // Merchant-facing API key for Wallets API (optional for dev, uses DB in production)
  walletsApiKey: process.env.WALLETS_API_KEY || 'test-wallets-key',

  // JazzCash REST configuration
  jazzcash: {
    baseUrl: process.env.JAZZCASH_BASE_URL || 'https://payments.jazzcash.com.pk',
    merchantId: required('JAZZCASH_MERCHANT_ID'),
    password: required('JAZZCASH_PASSWORD'),
    integritySalt: required('JAZZCASH_INTEGRITY_SALT'),
    returnUrl: process.env.JAZZCASH_RETURN_URL || 'https://wallets.mycodigital.io/api/v1/jazzcash/callback',
  },

  // Database configuration
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || 'jazzcash_db',
    user: process.env.DB_USER || 'jazzcash_user',
    password: process.env.DB_PASSWORD || 'jazzcash_password',
  },
};

module.exports = config;


