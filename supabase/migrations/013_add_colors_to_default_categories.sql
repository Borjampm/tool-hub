-- Add color column to expense_categories table for default colors
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6B7280';

-- Update existing default expense categories with appropriate colors
UPDATE expense_categories SET color = '#F59E0B' WHERE name = 'Food';           -- Amber (food)
UPDATE expense_categories SET color = '#EC4899' WHERE name = 'Social Life';   -- Pink (fun/social)
UPDATE expense_categories SET color = '#3B82F6' WHERE name = 'Transport';     -- Blue (movement)
UPDATE expense_categories SET color = '#8B5CF6' WHERE name = 'Clothes';       -- Purple (fashion)
UPDATE expense_categories SET color = '#10B981' WHERE name = 'Health';        -- Green (health)
UPDATE expense_categories SET color = '#6366F1' WHERE name = 'Education';     -- Indigo (learning)
UPDATE expense_categories SET color = '#EF4444' WHERE name = 'Gift';          -- Red (special)
UPDATE expense_categories SET color = '#F97316' WHERE name = 'Entertainment'; -- Orange (fun)
UPDATE expense_categories SET color = '#06B6D4' WHERE name = 'Trip';          -- Cyan (travel)