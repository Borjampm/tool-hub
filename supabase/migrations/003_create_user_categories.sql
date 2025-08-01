-- Create user_categories table for custom categories per user
CREATE TABLE IF NOT EXISTS user_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL, -- Required emoji for category display
    color TEXT, -- Optional color for category display
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure category names are unique per user
    UNIQUE(user_id, name)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_categories_user_id ON user_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_categories_name ON user_categories(user_id, name);

-- Enable Row Level Security (RLS) on user_categories table
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;

-- Create policies so users can only see their own categories
CREATE POLICY "Users can view own categories" ON user_categories
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy so users can only insert their own categories
CREATE POLICY "Users can insert own categories" ON user_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy so users can only update their own categories
CREATE POLICY "Users can update own categories" ON user_categories
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy so users can only delete their own categories
CREATE POLICY "Users can delete own categories" ON user_categories
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_user_categories_updated_at 
    BEFORE UPDATE ON user_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 