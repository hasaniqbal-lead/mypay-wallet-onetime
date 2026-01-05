-- Wallets API Database Schema
-- PostgreSQL initialization script

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(255) NOT NULL UNIQUE,
    merchant_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'jazzcash',
    channel VARCHAR(50) NOT NULL DEFAULT 'MWALLET',
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PKR',
    mobile VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(255),
    provider_response_code VARCHAR(20),
    provider_response_desc TEXT,
    provider_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for common queries
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_merchant_status ON transactions(merchant_id, status);

-- Create API keys table for merchant authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    merchant_id VARCHAR(255) NOT NULL UNIQUE,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    merchant_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create index on api_key for fast lookups
CREATE INDEX idx_api_keys_key ON api_keys(api_key) WHERE is_active = TRUE;

-- Insert default test API key for development
INSERT INTO api_keys (merchant_id, api_key, merchant_name, is_active)
VALUES ('TEST_MERCHANT', 'test-wallets-key', 'Test Merchant', TRUE)
ON CONFLICT (merchant_id) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for transactions table
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to wallets_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wallets_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO wallets_user;

