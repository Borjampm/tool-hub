-- Convert time_entries.category from TEXT to foreign key reference to hobby_categories
-- This creates proper relationships that will show in schema visualizer

-- Step 1: Add new category_id column as UUID foreign key
ALTER TABLE time_entries 
ADD COLUMN category_id UUID REFERENCES hobby_categories(id) ON DELETE SET NULL;

-- Step 2: Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_time_entries_category_id ON time_entries(category_id);

-- Step 3: Migrate existing data by matching category names to hobby_categories
-- For each user, match their time entry categories to their hobby categories
UPDATE time_entries 
SET category_id = hc.id
FROM hobby_categories hc
WHERE time_entries.user_id = hc.user_id 
  AND time_entries.category = hc.name
  AND time_entries.category IS NOT NULL
  AND time_entries.category != '';

-- Step 4: For any remaining unmatched categories, create them as hobby categories
-- This handles cases where time entries reference categories that don't exist yet
INSERT INTO hobby_categories (user_id, name, color, created_at, updated_at)
SELECT DISTINCT 
  te.user_id,
  te.category,
  '#6B7280', -- Default gray color
  NOW(),
  NOW()
FROM time_entries te
WHERE te.category IS NOT NULL 
  AND te.category != ''
  AND te.category_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hobby_categories hc 
    WHERE hc.user_id = te.user_id 
    AND hc.name = te.category
  );

-- Step 5: Update time_entries with newly created categories
UPDATE time_entries 
SET category_id = hc.id
FROM hobby_categories hc
WHERE time_entries.user_id = hc.user_id 
  AND time_entries.category = hc.name
  AND time_entries.category_id IS NULL
  AND time_entries.category IS NOT NULL
  AND time_entries.category != '';

-- Step 6: Keep the old category column for now (we'll remove it in next migration)
-- This allows for rollback if needed

-- Note: The old 'category' TEXT column will be removed in a separate migration
-- after we verify the foreign key relationships work correctly