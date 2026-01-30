-- Create exchange_rates table for storing daily currency exchange rates
-- This is a global table (no user_id) since exchange rates are public data shared across all users
-- No RLS needed since exchange rates are public

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_date DATE NOT NULL UNIQUE,
    base_currency TEXT NOT NULL DEFAULT 'USD',
    rates JSONB NOT NULL,  -- {"USD": 1, "CLP": 886.10, "EUR": 0.92, "GBP": 0.79, "BRL": 5.05}
    source TEXT NOT NULL DEFAULT 'openexchangerates',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by date (most common query pattern)
CREATE INDEX idx_exchange_rates_date ON exchange_rates(rate_date DESC);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_exchange_rates_updated_at
    BEFORE UPDATE ON exchange_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE exchange_rates IS 'Daily exchange rates from Open Exchange Rates API. Global table shared across all users.';
COMMENT ON COLUMN exchange_rates.rates IS 'JSONB object with currency codes as keys and exchange rates relative to base_currency as values';
