-- Add flag to mark skipped recurring transaction occurrences
-- This allows users to "delete" a single occurrence without it being recreated on next materialization

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_recurring_skipped BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for efficient filtering during materialization
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_skipped 
  ON public.transactions(recurring_rule_id, is_recurring_skipped)
  WHERE recurring_rule_id IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.transactions.is_recurring_skipped IS 
  'When true, this recurring occurrence has been intentionally skipped/deleted by the user and should not be recreated during materialization';


