-- Add color column to user_accounts table
ALTER TABLE user_accounts 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6B7280';

-- Update existing accounts to have default colors based on type
UPDATE user_accounts 
SET color = CASE 
    WHEN type = 'bank' THEN '#3B82F6'     -- Blue
    WHEN type = 'cash' THEN '#10B981'     -- Green
    WHEN type = 'credit_card' THEN '#8B5CF6'  -- Purple
    WHEN type = 'investment' THEN '#F59E0B'   -- Amber
    ELSE '#6B7280'  -- Gray for other
END
WHERE color = '#6B7280' OR color IS NULL;