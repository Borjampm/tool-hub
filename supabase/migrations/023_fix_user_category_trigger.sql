-- Fix the user category trigger - the previous migration had a function name mismatch
-- This creates a working trigger system for new user category creation

-- Drop the problematic trigger first
DROP TRIGGER IF EXISTS create_expense_categories_for_new_user ON auth.users;
DROP TRIGGER IF EXISTS create_categories_for_new_user ON auth.users;

-- Drop the old functions that might be problematic
DROP FUNCTION IF EXISTS handle_new_user_expense_categories();
DROP FUNCTION IF EXISTS handle_new_user_categories();
DROP FUNCTION IF EXISTS create_default_hobby_categories_for_user(UUID);
DROP FUNCTION IF EXISTS create_default_expense_categories_for_user(UUID);

-- Create a single, simple function to handle new user setup
CREATE OR REPLACE FUNCTION setup_new_user_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create default hobby categories
  INSERT INTO hobby_categories (user_id, name, color, created_at, updated_at)
  VALUES 
    (NEW.id, 'Work', '#3B82F6', NOW(), NOW()),
    (NEW.id, 'Exercise', '#10B981', NOW(), NOW()),
    (NEW.id, 'Learning', '#8B5CF6', NOW(), NOW()),
    (NEW.id, 'Creative', '#F59E0B', NOW(), NOW()),
    (NEW.id, 'Social', '#EC4899', NOW(), NOW())
  ON CONFLICT (user_id, name) DO NOTHING;

  -- Create default expense categories
  INSERT INTO user_expense_categories (user_id, name, emoji, color, is_default, created_at, updated_at)
  VALUES 
    (NEW.id, 'Food', '🍔', '#EF4444', true, NOW(), NOW()),
    (NEW.id, 'Social Life', '🎉', '#F59E0B', true, NOW(), NOW()),
    (NEW.id, 'Transport', '🚗', '#3B82F6', true, NOW(), NOW()),
    (NEW.id, 'Clothes', '👕', '#EC4899', true, NOW(), NOW()),
    (NEW.id, 'Health', '🏥', '#10B981', true, NOW(), NOW()),
    (NEW.id, 'Education', '📚', '#8B5CF6', true, NOW(), NOW()),
    (NEW.id, 'Gift', '🎁', '#F97316', true, NOW(), NOW()),
    (NEW.id, 'Entertainment', '🎬', '#06B6D4', true, NOW(), NOW()),
    (NEW.id, 'Trip', '✈️', '#84CC16', true, NOW(), NOW())
  ON CONFLICT (user_id, name) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE WARNING 'Failed to create default categories for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER setup_categories_for_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION setup_new_user_categories();

-- Grant necessary permissions to the function
-- This ensures the trigger can access the tables
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON hobby_categories TO postgres;
GRANT ALL ON user_expense_categories TO postgres;