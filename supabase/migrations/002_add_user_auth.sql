-- Add user_id column to time_entries table to associate entries with users
ALTER TABLE time_entries 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- For existing entries without users, we'll delete them since we need proper user association
-- This is safe for development as we'll re-seed with proper user data
DELETE FROM time_entries WHERE user_id IS NULL;

-- Make user_id NOT NULL for future entries
ALTER TABLE time_entries ALTER COLUMN user_id SET NOT NULL;

-- Create index on user_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);

-- Create index on user_id + created_at for efficient user-specific queries
CREATE INDEX IF NOT EXISTS idx_time_entries_user_created ON time_entries(user_id, created_at);

-- Enable Row Level Security (RLS) on time_entries table
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only see their own entries
CREATE POLICY "Users can view own time entries" ON time_entries
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy so users can only insert their own entries
CREATE POLICY "Users can insert own time entries" ON time_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy so users can only update their own entries
CREATE POLICY "Users can update own time entries" ON time_entries
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy so users can only delete their own entries
CREATE POLICY "Users can delete own time entries" ON time_entries
    FOR DELETE USING (auth.uid() = user_id); 