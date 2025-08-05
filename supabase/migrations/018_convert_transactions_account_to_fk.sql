-- Convert transactions.account from TEXT to foreign key reference to user_accounts
-- This creates proper relationships for account references

-- Step 1: Add new account_id column as UUID foreign key
ALTER TABLE transactions 
ADD COLUMN account_id UUID REFERENCES user_accounts(id) ON DELETE SET NULL;

-- Step 2: Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);

-- Step 3: Create default accounts for users who don't have them yet
-- Insert 'bank' and 'cash' accounts for users who have transactions but no accounts
INSERT INTO user_accounts (user_id, name, type, color, description, is_active, created_at, updated_at)
SELECT DISTINCT 
  t.user_id,
  'bank',
  'bank',
  '#3B82F6', -- Blue color for bank
  'Default bank account',
  true,
  NOW(),
  NOW()
FROM transactions t
WHERE t.account = 'bank'
  AND NOT EXISTS (
    SELECT 1 FROM user_accounts ua 
    WHERE ua.user_id = t.user_id 
    AND ua.name = 'bank'
  );

INSERT INTO user_accounts (user_id, name, type, color, description, is_active, created_at, updated_at)
SELECT DISTINCT 
  t.user_id,
  'cash',
  'cash',
  '#10B981', -- Green color for cash
  'Default cash account',
  true,
  NOW(),
  NOW()
FROM transactions t
WHERE t.account = 'cash'
  AND NOT EXISTS (
    SELECT 1 FROM user_accounts ua 
    WHERE ua.user_id = t.user_id 
    AND ua.name = 'cash'
  );

-- Step 4: Handle any other account names by creating custom accounts
INSERT INTO user_accounts (user_id, name, type, color, description, is_active, created_at, updated_at)
SELECT DISTINCT 
  t.user_id,
  t.account,
  'other',
  '#6B7280', -- Gray color for other accounts
  'Account created from transaction data',
  true,
  NOW(),
  NOW()
FROM transactions t
WHERE t.account IS NOT NULL 
  AND t.account != ''
  AND t.account NOT IN ('bank', 'cash')
  AND NOT EXISTS (
    SELECT 1 FROM user_accounts ua 
    WHERE ua.user_id = t.user_id 
    AND ua.name = t.account
  );

-- Step 5: Migrate existing data by matching account names to user_accounts
UPDATE transactions 
SET account_id = ua.id
FROM user_accounts ua
WHERE transactions.user_id = ua.user_id 
  AND transactions.account = ua.name
  AND transactions.account IS NOT NULL
  AND transactions.account != '';

-- Step 6: Keep the old account column for now (we'll remove it in next migration)
-- This allows for rollback if needed

-- Note: The old 'account' TEXT column will be removed in a separate migration
-- after we verify the foreign key relationships work correctly