-- Debt payments table for tracking partial/full payments on debts
-- Currency always matches the parent debt's currency

CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_debt_payments_user ON debt_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);

-- RLS
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debt payments" ON debt_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debt payments" ON debt_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debt payments" ON debt_payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debt payments" ON debt_payments
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at_debt_payments()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_debt_payments_updated_at ON debt_payments;
CREATE TRIGGER trg_debt_payments_updated_at
  BEFORE UPDATE ON debt_payments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_debt_payments();
