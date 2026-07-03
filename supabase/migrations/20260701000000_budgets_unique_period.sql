-- Prevent duplicate active rows for the same budget period.
-- Required for the nightly-budget-reset catch-up logic (ON CONFLICT DO NOTHING)
-- so a crash-retry between insert and pause cannot create two active rows.
-- Allows multiple period_types for the same category under the same goal
-- (e.g. a monthly and weekly FOOD_AND_DRINK budget can coexist).
CREATE UNIQUE INDEX budgets_unique_period
  ON budgets (goal_id, owner_id, owner_type, category_id, period_type, period_start);
