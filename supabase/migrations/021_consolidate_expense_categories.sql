-- Consolidate expense categories into single user-specific table
-- This replaces the dual-table approach (global + user) with a single user table approach
-- Default categories will be created for each user, making relationships cleaner

-- Step 1: Add is_default column to track which categories came from global defaults
ALTER TABLE user_expense_categories 
ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Step 2: For each existing user, create user-specific copies of all global expense categories
INSERT INTO user_expense_categories (user_id, name, emoji, color, is_default, created_at, updated_at)
SELECT DISTINCT 
  u.id as user_id,
  ec.name,
  ec.emoji,
  COALESCE(ec.color, '#6B7280') as color,
  true as is_default,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
CROSS JOIN expense_categories ec
WHERE NOT EXISTS (
  -- Don't create duplicates if user already has a category with same name
  SELECT 1 FROM user_expense_categories uec 
  WHERE uec.user_id = u.id 
  AND uec.name = ec.name
);

-- Step 3: Update transactions that reference global expense_categories
-- Point them to the new user-specific default categories
UPDATE transactions 
SET category_id = uec.id
FROM user_expense_categories uec, expense_categories ec
WHERE transactions.category_id = ec.id
  AND uec.user_id = transactions.user_id
  AND uec.name = ec.name
  AND uec.is_default = true;

-- Step 4: Verify all transactions now reference user_expense_categories
-- This should return 0 rows - if not, there's a data issue to investigate
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM transactions t
  WHERE t.category_id IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM user_expense_categories uec 
      WHERE uec.id = t.category_id
    );
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Found % transactions with orphaned category references. Migration aborted.', orphaned_count;
  END IF;
  
  RAISE NOTICE 'All transactions successfully migrated to user expense categories';
END $$;

-- Step 5: Drop the global expense_categories table
-- All categories are now user-specific in user_expense_categories
DROP TABLE IF EXISTS expense_categories CASCADE;

-- Step 6: Category type column was never created in single-table approach
-- This step is no longer needed

-- Step 7: Add proper foreign key constraint now that we have clean references
-- Previously this wasn't possible due to dual-table references
ALTER TABLE transactions 
ADD CONSTRAINT fk_transactions_category_id 
FOREIGN KEY (category_id) REFERENCES user_expense_categories(id) ON DELETE SET NULL;

-- Step 8: Create index on is_default for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_expense_categories_is_default 
ON user_expense_categories(user_id, is_default);

-- Step 9: Create a function to add default categories for new users
CREATE OR REPLACE FUNCTION create_default_expense_categories_for_user(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_expense_categories (user_id, name, emoji, color, is_default, created_at, updated_at)
  VALUES 
    (user_id_param, 'Food', '🍔', '#EF4444', true, NOW(), NOW()),
    (user_id_param, 'Social Life', '🎉', '#F59E0B', true, NOW(), NOW()),
    (user_id_param, 'Transport', '🚗', '#3B82F6', true, NOW(), NOW()),
    (user_id_param, 'Clothes', '👕', '#EC4899', true, NOW(), NOW()),
    (user_id_param, 'Health', '🏥', '#10B981', true, NOW(), NOW()),
    (user_id_param, 'Education', '📚', '#8B5CF6', true, NOW(), NOW()),
    (user_id_param, 'Gift', '🎁', '#F97316', true, NOW(), NOW()),
    (user_id_param, 'Entertainment', '🎬', '#06B6D4', true, NOW(), NOW()),
    (user_id_param, 'Trip', '✈️', '#84CC16', true, NOW(), NOW())
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

-- Step 10: Create trigger to automatically create default categories for new users
-- This ensures new users get starter categories
CREATE OR REPLACE FUNCTION handle_new_user_expense_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM create_default_expense_categories_for_user(NEW.id);
  RETURN NEW;
END;
$$;

-- Note: We'll add the trigger in a separate migration after confirming this works
-- to avoid potential issues with auth.users table

-- Final result: Clean single-table design with proper foreign key relationships
-- transactions.category_id → user_expense_categories.id (always!)
-- This will show beautifully in the schema visualizer