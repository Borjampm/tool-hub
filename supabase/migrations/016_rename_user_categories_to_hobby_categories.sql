-- Rename user_categories table to hobby_categories for better clarity
-- This table is specifically for hobby tracking categories, not expense categories

-- Rename the table
ALTER TABLE user_categories RENAME TO hobby_categories;

-- Update index names to match new table name
DROP INDEX IF EXISTS idx_user_categories_user_id;
DROP INDEX IF EXISTS idx_user_categories_name;

CREATE INDEX IF NOT EXISTS idx_hobby_categories_user_id ON hobby_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_hobby_categories_name ON hobby_categories(user_id, name);

-- Update RLS policy names (drop old policies and create new ones with better names)
DROP POLICY IF EXISTS "Users can view own categories" ON hobby_categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON hobby_categories;
DROP POLICY IF EXISTS "Users can update own categories" ON hobby_categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON hobby_categories;

-- Create new policies with clearer names
CREATE POLICY "Users can view own hobby categories" ON hobby_categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hobby categories" ON hobby_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hobby categories" ON hobby_categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hobby categories" ON hobby_categories
    FOR DELETE USING (auth.uid() = user_id);

-- Update trigger name
DROP TRIGGER IF EXISTS update_user_categories_updated_at ON hobby_categories;
CREATE TRIGGER update_hobby_categories_updated_at 
    BEFORE UPDATE ON hobby_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();