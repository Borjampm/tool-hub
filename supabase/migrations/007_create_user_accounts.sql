-- Create user_accounts table for custom accounts per user
CREATE TABLE IF NOT EXISTS user_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'credit_card', 'investment', 'other')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure account names are unique per user
    UNIQUE(user_id, name)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_name ON user_accounts(user_id, name);
CREATE INDEX IF NOT EXISTS idx_user_accounts_type ON user_accounts(type);

-- Enable Row Level Security (RLS) on user_accounts table
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies so users can only see their own accounts
CREATE POLICY "Users can view own accounts" ON user_accounts
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy so users can only insert their own accounts
CREATE POLICY "Users can insert own accounts" ON user_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy so users can only update their own accounts
CREATE POLICY "Users can update own accounts" ON user_accounts
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy so users can only delete their own accounts
CREATE POLICY "Users can delete own accounts" ON user_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_user_accounts_updated_at 
    BEFORE UPDATE ON user_accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Keep the original account constraint but expand it to include user-defined accounts
-- We'll handle this through application logic instead