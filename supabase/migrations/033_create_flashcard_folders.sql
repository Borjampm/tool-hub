-- Flashcard folders for organizing cards
-- Users can create folders to categorize their flashcard decks

CREATE TABLE IF NOT EXISTS flashcard_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on folder name per user (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_flashcard_folder_name
  ON flashcard_folders(user_id, LOWER(name));

-- Index for listing folders by user
CREATE INDEX IF NOT EXISTS idx_flashcard_folders_user ON flashcard_folders(user_id);

-- RLS
ALTER TABLE flashcard_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders" ON flashcard_folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders" ON flashcard_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON flashcard_folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON flashcard_folders
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at_flashcard_folders()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flashcard_folders_updated_at ON flashcard_folders;
CREATE TRIGGER trg_flashcard_folders_updated_at
  BEFORE UPDATE ON flashcard_folders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_flashcard_folders();
