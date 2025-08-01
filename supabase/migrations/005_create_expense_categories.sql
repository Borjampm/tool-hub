-- Create expense_categories table for predefined expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default expense categories with emojis
INSERT INTO expense_categories (name, emoji) VALUES
    ('Food', '🍔'),
    ('Social Life', '🎉'),
    ('Transport', '🚗'),
    ('Clothes', '👕'),
    ('Health', '🏥'),
    ('Education', '📚'),
    ('Gift', '🎁'),
    ('Entertainment', '🎬'),
    ('Trip', '✈️')
ON CONFLICT (name) DO NOTHING;

-- This table is read-only for users, no RLS policies needed since it's shared data