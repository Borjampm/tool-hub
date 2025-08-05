-- Fix schema qualification in trigger function
-- The issue is that the trigger function runs in auth schema context but tries to access public schema tables

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS setup_categories_for_new_user ON auth.users;
DROP FUNCTION IF EXISTS setup_new_user_categories();

-- Create a fixed function with proper schema qualification
CREATE OR REPLACE FUNCTION setup_new_user_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create default hobby categories with explicit schema qualification
  INSERT INTO public.hobby_categories (user_id, name, color, created_at, updated_at)
  VALUES 
    (NEW.id, 'Work', '#3B82F6', NOW(), NOW()),
    (NEW.id, 'Exercise', '#10B981', NOW(), NOW()),
    (NEW.id, 'Learning', '#8B5CF6', NOW(), NOW()),
    (NEW.id, 'Creative', '#F59E0B', NOW(), NOW()),
    (NEW.id, 'Social', '#EC4899', NOW(), NOW())
  ON CONFLICT (user_id, name) DO NOTHING;

  -- Create default expense categories with explicit schema qualification
  INSERT INTO public.user_expense_categories (user_id, name, emoji, color, is_default, created_at, updated_at)
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
GRANT ALL ON public.hobby_categories TO postgres;
GRANT ALL ON public.user_expense_categories TO postgres; 