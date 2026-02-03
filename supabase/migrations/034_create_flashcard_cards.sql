-- Flashcard cards and card sides for spaced repetition learning
-- Supports three card types: basic (1 side), reversible (2 sides), cloze (N sides per {{}} marker)

-- Cards table - stores the card content
CREATE TABLE IF NOT EXISTS flashcard_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.flashcard_folders(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL CHECK (card_type IN ('basic', 'reversible', 'cloze')),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for cards
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_user ON flashcard_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_folder ON flashcard_cards(folder_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_user_folder ON flashcard_cards(user_id, folder_id);

-- RLS for cards
ALTER TABLE flashcard_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cards" ON flashcard_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards" ON flashcard_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards" ON flashcard_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards" ON flashcard_cards
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger for cards
CREATE OR REPLACE FUNCTION set_updated_at_flashcard_cards()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flashcard_cards_updated_at ON flashcard_cards;
CREATE TRIGGER trg_flashcard_cards_updated_at
  BEFORE UPDATE ON flashcard_cards
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_flashcard_cards();

-- Card sides table - stores SM-2 scheduling state per side
-- Basic cards have 1 side, reversible have 2, cloze have N (one per {{}} marker)
CREATE TABLE IF NOT EXISTS flashcard_card_sides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.flashcard_cards(id) ON DELETE CASCADE,
  side_index INT NOT NULL DEFAULT 0,
  ease_factor DECIMAL(4,2) NOT NULL DEFAULT 2.50,
  interval_days INT NOT NULL DEFAULT 0,
  repetitions INT NOT NULL DEFAULT 0,
  next_review TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one side per index per card
CREATE UNIQUE INDEX IF NOT EXISTS uniq_flashcard_card_side
  ON flashcard_card_sides(card_id, side_index);

-- Index for due card queries (performance critical)
CREATE INDEX IF NOT EXISTS idx_flashcard_sides_due ON flashcard_card_sides(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_flashcard_sides_card ON flashcard_card_sides(card_id);

-- RLS for card sides
ALTER TABLE flashcard_card_sides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own card sides" ON flashcard_card_sides
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card sides" ON flashcard_card_sides
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card sides" ON flashcard_card_sides
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own card sides" ON flashcard_card_sides
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger for card sides
CREATE OR REPLACE FUNCTION set_updated_at_flashcard_card_sides()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flashcard_card_sides_updated_at ON flashcard_card_sides;
CREATE TRIGGER trg_flashcard_card_sides_updated_at
  BEFORE UPDATE ON flashcard_card_sides
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_flashcard_card_sides();
