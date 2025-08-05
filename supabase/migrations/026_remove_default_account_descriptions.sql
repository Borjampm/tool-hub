-- Remove default account descriptions from existing accounts
-- This makes all accounts appear the same in the UI, treating default accounts like custom accounts

UPDATE user_accounts 
SET description = '' 
WHERE (name = 'Bank' AND type = 'bank' AND description = 'Default bank account')
   OR (name = 'Cash' AND type = 'cash' AND description = 'Default cash account'); 