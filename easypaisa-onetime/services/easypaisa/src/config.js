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
  port: Number(process.env.PORT || 4003),

  // Merchant-facing API key for Wallets API (optional for dev, uses DB in production)
  walletsApiKey: process.env.WALLETS_API_KEY || 'test-wallets-key',

  // Easypaisa REST configuration
  easypay: {
    baseUrl: process.env.EASYPAY_BASE_URL || 'https://easypay.easypaisa.com.pk',
    username: required('EASYPAY_USERNAME'),
    password: required('EASYPAY_PASSWORD'),
    storeId: required('EASYPAY_STORE_ID'),
    defaultEmail: process.env.EASYPAY_DEFAULT_EMAIL || 'noreply@mypay.mx'
  },

  // Database configuration
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || 'wallets_db',
    user: process.env.DB_USER || 'wallets_user',
    password: process.env.DB_PASSWORD || 'wallets_password',
  },
};

module.exports = config;


