-- Remove old TEXT columns after verifying foreign key relationships work
-- This completes the migration to proper foreign key relationships

-- Step 1: Remove old category column from time_entries
-- Users should now use category_id to reference hobby_categories
ALTER TABLE time_entries 
DROP COLUMN IF EXISTS category;

-- Step 2: Remove old account column from transactions
-- Users should now use account_id to reference user_accounts
ALTER TABLE transactions 
DROP COLUMN IF EXISTS account;

-- Step 3: Remove old category column from transactions
-- Users should now use category_id + category_type to reference categories
ALTER TABLE transactions 
DROP COLUMN IF EXISTS category;

-- Step 4: Update any old constraints that might reference the dropped columns
-- Remove the old account constraint if it still exists
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_account_check;

-- Note: After this migration, all relationships will be proper foreign keys:
-- - time_entries.category_id → hobby_categories.id
-- - transactions.account_id → user_accounts.id  
-- - transactions.category_id → expense_categories.id OR user_expense_categories.id (via category_type)
-- 
-- These relationships will now be visible in the Supabase schema visualizer!