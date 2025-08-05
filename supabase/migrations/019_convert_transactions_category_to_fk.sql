-- Convert transactions.category from TEXT to foreign key reference to user_expense_categories
-- This uses the simplified single-table approach for expense categories

-- Step 1: Add new category_id column as UUID foreign key
ALTER TABLE transactions 
ADD COLUMN category_id UUID;

-- Step 2: Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- Step 3: First, ensure all referenced categories exist in user_expense_categories
-- Create missing categories as user expense categories
INSERT INTO user_expense_categories (user_id, name, emoji, color, created_at, updated_at)
SELECT DISTINCT 
  t.user_id,
  t.category,
  '💰', -- Default money emoji
  '#6B7280', -- Default gray color
  NOW(),
  NOW()
FROM transactions t
WHERE t.category IS NOT NULL 
  AND t.category != ''
  AND NOT EXISTS (
    SELECT 1 FROM user_expense_categories uec 
    WHERE uec.user_id = t.user_id 
    AND uec.name = t.category
  );

-- Step 4: Migrate existing data by matching category names to user_expense_categories
UPDATE transactions 
SET category_id = uec.id
FROM user_expense_categories uec
WHERE transactions.user_id = uec.user_id 
  AND transactions.category = uec.name
  AND transactions.category IS NOT NULL
  AND transactions.category != '';

-- Note: No category_type column needed with single-table approach
-- All categories are in user_expense_categories table
-- Proper foreign key constraint will be added in migration 021

-- The old 'category' TEXT column will be removed in migration 020
-- after we verify the relationships work correctly