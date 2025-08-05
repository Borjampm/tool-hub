-- Convert transactions.category from TEXT to foreign key reference to category tables
-- This handles both default expense_categories and user_expense_categories

-- Step 1: Add new category_id column as UUID
-- We'll use a generic UUID that can reference either expense_categories or user_expense_categories
ALTER TABLE transactions 
ADD COLUMN category_id UUID;

-- Step 2: Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- Step 3: Migrate existing data by matching category names to default expense_categories first
UPDATE transactions 
SET category_id = ec.id
FROM expense_categories ec
WHERE transactions.category = ec.name
  AND transactions.category IS NOT NULL
  AND transactions.category != '';

-- Step 4: Migrate remaining data by matching to user_expense_categories
UPDATE transactions 
SET category_id = uec.id
FROM user_expense_categories uec
WHERE transactions.user_id = uec.user_id 
  AND transactions.category = uec.name
  AND transactions.category IS NOT NULL
  AND transactions.category != ''
  AND transactions.category_id IS NULL;

-- Step 5: For any remaining unmatched categories, create them as user expense categories
-- This handles cases where transactions reference categories that don't exist yet
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
  AND t.category_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM expense_categories ec 
    WHERE ec.name = t.category
  )
  AND NOT EXISTS (
    SELECT 1 FROM user_expense_categories uec 
    WHERE uec.user_id = t.user_id 
    AND uec.name = t.category
  );

-- Step 6: Update transactions with newly created categories
UPDATE transactions 
SET category_id = uec.id
FROM user_expense_categories uec
WHERE transactions.user_id = uec.user_id 
  AND transactions.category = uec.name
  AND transactions.category_id IS NULL
  AND transactions.category IS NOT NULL
  AND transactions.category != '';

-- Step 7: Add a category_type column to distinguish between default and user categories
ALTER TABLE transactions 
ADD COLUMN category_type TEXT CHECK (category_type IN ('default', 'user')) DEFAULT 'user';

-- Step 8: Update category_type based on whether category exists in default categories
UPDATE transactions 
SET category_type = 'default'
FROM expense_categories ec
WHERE transactions.category_id = ec.id;

UPDATE transactions 
SET category_type = 'user'
WHERE category_type IS NULL;

-- Step 9: Make category_type NOT NULL
ALTER TABLE transactions 
ALTER COLUMN category_type SET NOT NULL;

-- Note: We can't create a proper foreign key constraint here because category_id
-- can reference either expense_categories.id OR user_expense_categories.id
-- This is handled through application logic and the category_type field

-- The old 'category' TEXT column will be removed in a separate migration
-- after we verify the relationships work correctly