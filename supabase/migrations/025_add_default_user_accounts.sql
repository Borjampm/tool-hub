-- Add default user accounts for all existing users
-- This creates bank and cash accounts for each user, similar to how default categories work

-- Step 1: Add default accounts for all existing users
INSERT INTO user_accounts (user_id, name, type, color, description, is_active, created_at, updated_at)
SELECT DISTINCT 
  u.id as user_id,
  'Bank' as name,
  'bank' as type,
  '#3B82F6' as color,
  'Default bank account' as description,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
WHERE NOT EXISTS (
  -- Don't create duplicates if user already has a bank account
  SELECT 1 FROM user_accounts ua 
  WHERE ua.user_id = u.id 
  AND ua.name = 'Bank'
  AND ua.type = 'bank'
);

INSERT INTO user_accounts (user_id, name, type, color, description, is_active, created_at, updated_at)
SELECT DISTINCT 
  u.id as user_id,
  'Cash' as name,
  'cash' as type,
  '#10B981' as color,
  'Default cash account' as description,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
WHERE NOT EXISTS (
  -- Don't create duplicates if user already has a cash account
  SELECT 1 FROM user_accounts ua 
  WHERE ua.user_id = u.id 
  AND ua.name = 'Cash'
  AND ua.type = 'cash'
);

-- Step 2: Update the user creation trigger to include default accounts
-- First, drop the existing trigger
DROP TRIGGER IF EXISTS setup_categories_for_new_user ON auth.users;

-- Create an updated function that includes default accounts
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

  -- Create default user accounts with explicit schema qualification
  INSERT INTO public.user_accounts (user_id, name, type, color, description, is_active, created_at, updated_at)
  VALUES 
    (NEW.id, 'Bank', 'bank', '#3B82F6', 'Default bank account', true, NOW(), NOW()),
    (NEW.id, 'Cash', 'cash', '#10B981', 'Default cash account', true, NOW(), NOW())
  ON CONFLICT (user_id, name) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE WARNING 'Failed to create default categories and accounts for user %: %', NEW.id, SQLERRM;
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
GRANT ALL ON public.user_accounts TO postgres; 