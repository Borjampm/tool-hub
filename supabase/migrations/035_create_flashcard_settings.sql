-- Flashcard settings for user preferences
-- Stores SM-2 defaults, daily limits, and theme preferences

CREATE TABLE IF NOT EXISTS flashcard_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_ease_factor DECIMAL(4,2) NOT NULL DEFAULT 2.50,
  daily_new_card_limit INT NOT NULL DEFAULT 20,
  daily_review_limit INT NOT NULL DEFAULT 100,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE flashcard_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON flashcard_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON flashcard_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON flashcard_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON flashcard_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at_flashcard_settings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flashcard_settings_updated_at ON flashcard_settings;
CREATE TRIGGER trg_flashcard_settings_updated_at
  BEFORE UPDATE ON flashcard_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_flashcard_settings();
