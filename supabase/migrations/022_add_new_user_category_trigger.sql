-- Add trigger to automatically create default expense categories for new users
-- This completes the single-table expense category system

-- Create the trigger on auth.users to create default categories for new users
CREATE TRIGGER create_expense_categories_for_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_expense_categories();

-- Also create default hobby categories function for consistency
CREATE OR REPLACE FUNCTION create_default_hobby_categories_for_user(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO hobby_categories (user_id, name, color, created_at, updated_at)
  VALUES 
    (user_id_param, 'Work', '#3B82F6', NOW(), NOW()),
    (user_id_param, 'Exercise', '#10B981', NOW(), NOW()),
    (user_id_param, 'Learning', '#8B5CF6', NOW(), NOW()),
    (user_id_param, 'Creative', '#F59E0B', NOW(), NOW()),
    (user_id_param, 'Social', '#EC4899', NOW(), NOW())
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

-- Create function to handle both hobby and expense categories for new users
CREATE OR REPLACE FUNCTION handle_new_user_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create default hobby categories
  PERFORM create_default_hobby_categories_for_user(NEW.id);
  
  -- Create default expense categories (function already exists from previous migration)
  PERFORM create_default_expense_categories_for_user(NEW.id);
  
  RETURN NEW;
END;
$$;

-- Replace the previous trigger with the comprehensive one
DROP TRIGGER IF EXISTS create_expense_categories_for_new_user ON auth.users;

CREATE TRIGGER create_categories_for_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_categories();

-- Note: This ensures all new users get starter categories for both hobby and expense tracking
-- Existing users already have their categories from previous migrations