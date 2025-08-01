-- Ensure all existing user accounts have colors
-- Update any accounts that don't have colors assigned

UPDATE user_accounts 
SET color = CASE 
    WHEN type = 'bank' THEN '#3B82F6'        -- Blue for bank accounts
    WHEN type = 'cash' THEN '#10B981'        -- Green for cash
    WHEN type = 'credit_card' THEN '#8B5CF6' -- Purple for credit cards
    WHEN type = 'investment' THEN '#F59E0B'  -- Amber for investments
    ELSE '#6B7280'                           -- Gray for other types
END
WHERE color IS NULL OR color = '';