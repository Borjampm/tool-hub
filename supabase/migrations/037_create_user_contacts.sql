-- User contacts for tracking debts/loans
-- Users can create contacts to associate with debts

CREATE TABLE IF NOT EXISTS user_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on contact name per user (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_contact_name
  ON user_contacts(user_id, LOWER(name));

-- Index for listing contacts by user
CREATE INDEX IF NOT EXISTS idx_user_contacts_user ON user_contacts(user_id);

-- RLS
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON user_contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON user_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" ON user_contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" ON user_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at_user_contacts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_contacts_updated_at ON user_contacts;
CREATE TRIGGER trg_user_contacts_updated_at
  BEFORE UPDATE ON user_contacts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_user_contacts();
