-- Create user_expense_categories table for custom expense categories per user
-- This is separate from user_categories which is for hobby/time tracking
CREATE TABLE IF NOT EXISTS user_expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL, -- Required emoji for category display
    color TEXT DEFAULT '#6B7280', -- Optional color for category display
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure category names are unique per user
    UNIQUE(user_id, name)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_expense_categories_user_id ON user_expense_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_expense_categories_name ON user_expense_categories(user_id, name);

-- Enable Row Level Security (RLS) on user_expense_categories table
ALTER TABLE user_expense_categories ENABLE ROW LEVEL SECURITY;

-- Create policies so users can only see their own expense categories
CREATE POLICY "Users can view own expense categories" ON user_expense_categories
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy so users can only insert their own expense categories
CREATE POLICY "Users can insert own expense categories" ON user_expense_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy so users can only update their own expense categories
CREATE POLICY "Users can update own expense categories" ON user_expense_categories
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy so users can only delete their own expense categories
CREATE POLICY "Users can delete own expense categories" ON user_expense_categories
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_user_expense_categories_updated_at 
    BEFORE UPDATE ON user_expense_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();