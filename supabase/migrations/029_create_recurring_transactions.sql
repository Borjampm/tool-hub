-- Recurring transactions (materialization approach)
-- Creates a rules table and links occurrences to normal transactions

-- 1) Rules table
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction template
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  category_id UUID REFERENCES public.user_expense_categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.user_accounts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Schedule
  start_date DATE NOT NULL,
  end_date DATE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
  interval INT NOT NULL DEFAULT 1 CHECK (interval > 0),
  timezone TEXT NOT NULL DEFAULT 'UTC',

  -- Control
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_generated_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_active ON recurring_transactions(user_id, is_active);

-- RLS
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring rules" ON recurring_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring rules" ON recurring_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring rules" ON recurring_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring rules" ON recurring_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- 2) Link occurrences to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS recurring_rule_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_occurrence_date DATE;

-- Uniqueness: one occurrence per rule/date/user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_txn_recurring_occurrence
  ON public.transactions(user_id, recurring_rule_id, recurrence_occurrence_date)
  WHERE recurring_rule_id IS NOT NULL;

-- Updated_at trigger for recurring rules
CREATE OR REPLACE FUNCTION set_updated_at_recurring()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recurring_updated_at ON recurring_transactions;
CREATE TRIGGER trg_recurring_updated_at
  BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_recurring();


