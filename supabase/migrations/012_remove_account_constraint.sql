-- Remove the check constraint on transactions.account to allow custom account names
-- The constraint was limiting accounts to only 'bank' and 'cash', but now we support custom accounts

ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_account_check;