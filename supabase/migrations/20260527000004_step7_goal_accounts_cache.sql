-- Step 7: Cache account metadata on goal_accounts.
--
-- Avoids calling Plaid on every GET /api/goals/accounts read. Fields are
-- populated at link time (POST) and refreshed whenever syncGoalBalance runs.

ALTER TABLE goal_accounts
  ADD COLUMN IF NOT EXISTS account_name     TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS institution_name TEXT,
  ADD COLUMN IF NOT EXISTS account_subtype  TEXT,
  ADD COLUMN IF NOT EXISTS cached_balance   NUMERIC(12,2);
