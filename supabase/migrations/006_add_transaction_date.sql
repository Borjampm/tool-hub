-- Add transaction_date field to transactions table
ALTER TABLE transactions 
ADD COLUMN transaction_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Create index on transaction_date for efficient queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- Create index on user_id + transaction_date for efficient user-specific date queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date);

-- Update existing transactions to use created_at date as transaction_date
UPDATE transactions 
SET transaction_date = DATE(created_at)
WHERE transaction_date = CURRENT_DATE;