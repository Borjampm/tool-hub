-- Update existing expense categories to capitalize them properly
UPDATE expense_categories SET name = 'Food' WHERE name = 'food';
UPDATE expense_categories SET name = 'Social Life' WHERE name = 'social life';
UPDATE expense_categories SET name = 'Transport' WHERE name = 'transport';
UPDATE expense_categories SET name = 'Clothes' WHERE name = 'clothes';
UPDATE expense_categories SET name = 'Health' WHERE name = 'health';
UPDATE expense_categories SET name = 'Education' WHERE name = 'education';
UPDATE expense_categories SET name = 'Gift' WHERE name = 'gift';
UPDATE expense_categories SET name = 'Entertainment' WHERE name = 'entertainment';
UPDATE expense_categories SET name = 'Trip' WHERE name = 'trip';