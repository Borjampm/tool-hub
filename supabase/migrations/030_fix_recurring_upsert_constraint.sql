-- Ensure ON CONFLICT works for recurring materialization
-- PostgREST upsert requires a UNIQUE or PRIMARY KEY constraint matching the on_conflict columns

-- 1) Drop the previous partial unique index (it doesn't satisfy ON CONFLICT)
DROP INDEX IF EXISTS public.uniq_txn_recurring_occurrence;

-- 2) Add a proper UNIQUE constraint across (user_id, recurring_rule_id, recurrence_occurrence_date)
-- Note: In Postgres, UNIQUE allows multiple NULLs, so non-recurring rows (recurring_rule_id IS NULL)
--       will not be constrained negatively
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_recurring_occurrence_unique
  UNIQUE (user_id, recurring_rule_id, recurrence_occurrence_date);


