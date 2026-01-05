-- ================================
-- MyPay Wallets - Database Initialization
-- Creates separate databases and users for each wallet service
-- ================================

-- ================================
-- Easypaisa Database Setup
-- ================================
CREATE USER easypaisa_user WITH PASSWORD 'EASYPAISA_DB_PASSWORD_PLACEHOLDER';
CREATE DATABASE easypaisa_db OWNER easypaisa_user;

\c easypaisa_db

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE easypaisa_db TO easypaisa_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO easypaisa_user;

-- Create transactions table for Easypaisa
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    provider VARCHAR(20) DEFAULT 'easypaisa',
    channel VARCHAR(20) DEFAULT 'MA',
    provider_reference VARCHAR(100),
    provider_response JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_easypaisa_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_easypaisa_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_easypaisa_transactions_created_at ON transactions(created_at);

-- Grant table privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO easypaisa_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO easypaisa_user;

-- ================================
-- JazzCash Database Setup
-- ================================
\c postgres

CREATE USER jazzcash_user WITH PASSWORD 'JAZZCASH_DB_PASSWORD_PLACEHOLDER';
CREATE DATABASE jazzcash_db OWNER jazzcash_user;

\c jazzcash_db

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE jazzcash_db TO jazzcash_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO jazzcash_user;

-- Create transactions table for JazzCash
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    provider VARCHAR(20) DEFAULT 'jazzcash',
    channel VARCHAR(20) DEFAULT 'MWALLET',
    provider_reference VARCHAR(100),
    provider_response JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_jazzcash_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_jazzcash_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_jazzcash_transactions_created_at ON transactions(created_at);

-- Grant table privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jazzcash_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jazzcash_user;
