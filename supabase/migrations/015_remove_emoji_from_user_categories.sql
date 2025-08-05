-- Remove emoji field from user_categories table
-- Hobby categories should not have emojis, only expense categories should
-- This corrects the issue introduced in migration 008

-- Remove the emoji column from user_categories
ALTER TABLE user_categories 
DROP COLUMN IF EXISTS emoji;

-- Note: user_categories are for hobby tracking and should only have:
-- - id, user_id, name, color (optional), created_at, updated_at
-- 
-- user_expense_categories are separate and have:
-- - id, user_id, name, emoji (required), color (optional), created_at, updated_at