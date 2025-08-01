-- Add emoji column to user_categories table if it doesn't exist
ALTER TABLE user_categories 
ADD COLUMN IF NOT EXISTS emoji TEXT;

-- Update existing categories to have a default emoji if they don't have one
UPDATE user_categories 
SET emoji = '📝' 
WHERE emoji IS NULL OR emoji = '';

-- Make emoji column NOT NULL after updating existing records
ALTER TABLE user_categories 
ALTER COLUMN emoji SET NOT NULL;