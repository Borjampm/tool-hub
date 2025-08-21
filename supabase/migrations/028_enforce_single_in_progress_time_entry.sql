-- Enforce at most one in-progress (end_time IS NULL) time entry per user
-- Create a partial unique index scoped to user_id where end_time IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_in_progress_time_entry_per_user
ON time_entries(user_id)
WHERE end_time IS NULL;


