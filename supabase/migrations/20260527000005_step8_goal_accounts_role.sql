-- Step 8 Part 1: Add account_role to goal_accounts.
--
-- Savings accounts track balance toward the goal.
-- Spending accounts are watched for transactions against budgets under this goal.
-- Exactly one savings account is allowed per goal (partial unique index).
--
-- Backfill: uses the earliest-created row per goal as the savings account so
-- goals that already have multiple linked accounts get one savings + rest spending,
-- rather than all savings (which would fail the partial unique index).

ALTER TABLE goal_accounts
  ADD COLUMN IF NOT EXISTS account_role TEXT NOT NULL DEFAULT 'savings'
    CHECK (account_role IN ('savings', 'spending'));

-- Backfill: earliest account per goal → savings, all others → spending
UPDATE goal_accounts ga
SET account_role = CASE
  WHEN ga.created_at = (
    SELECT MIN(ga2.created_at)
    FROM goal_accounts ga2
    WHERE ga2.goal_id = ga.goal_id
  ) THEN 'savings'
  ELSE 'spending'
END;

-- Exactly one savings account per goal
CREATE UNIQUE INDEX IF NOT EXISTS goal_accounts_one_savings_per_goal
  ON goal_accounts (goal_id)
  WHERE account_role = 'savings';
