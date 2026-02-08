-- Add default_currency column to user_settings
-- Allows each user to pick their preferred currency for display and conversions
ALTER TABLE user_settings
  ADD COLUMN default_currency TEXT NOT NULL DEFAULT 'CLP';
