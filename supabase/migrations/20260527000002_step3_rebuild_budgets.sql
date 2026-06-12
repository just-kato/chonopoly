-- Step 3: Rebuild budgets table.
-- Drops budget_periods (replaced by budget_daily_snapshots) and the old
-- budgets table (test data loss accepted), creates new budgets per
-- ARCHITECTURE.md, adds the FK deferred from Step 1, and replaces the
-- budget_daily_snapshots SELECT backstop with a real policy.

-- ============================================================
-- 1. Drop budget_periods (fully replaced by budget_daily_snapshots)
-- ============================================================

DROP TABLE IF EXISTS budget_periods CASCADE;

-- ============================================================
-- 2. Drop old budgets (new schema is not backwards-compatible)
-- ============================================================

DROP TABLE IF EXISTS budgets CASCADE;

-- ============================================================
-- 3. Create new budgets table per ARCHITECTURE.md
-- ============================================================

CREATE TABLE budgets (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id          uuid          NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  owner_type       text          NOT NULL CHECK (owner_type IN ('personal','team','org')),
  owner_id         uuid          NOT NULL,
  category_id      text          NOT NULL,
  period_type      text          NOT NULL CHECK (period_type IN ('daily','weekly','monthly','quarterly','yearly')),
  period_start     date          NOT NULL,
  period_end       date          NOT NULL,
  total_limit      numeric(12,2) NOT NULL CHECK (total_limit > 0),
  recurring        boolean       NOT NULL DEFAULT true,
  rollover_enabled boolean       NOT NULL DEFAULT false,
  status           text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  created_at       timestamptz   NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. Indexes
-- ============================================================

-- Find all budgets for a goal (spending attribution, goal detail view)
CREATE INDEX ON budgets(goal_id);

-- Nightly cron: "find all active budgets for this owner"
CREATE INDEX ON budgets(owner_id, status);

-- Nightly-budget-reset: "find all recurring budgets where period_end = today"
CREATE INDEX ON budgets(period_end);

-- ============================================================
-- 5. RLS — same three-way owner_type pattern as savings_goals
-- ============================================================

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets: read by owner or member"
  ON budgets FOR SELECT
  USING (
    (owner_type = 'personal' AND owner_id = auth.uid())
    OR (owner_type = 'team' AND EXISTS (
      SELECT 1 FROM get_my_team_ids() WHERE team_id = owner_id
    ))
    OR (owner_type = 'org' AND is_org_admin_or_owner(owner_id))
  );

CREATE POLICY "budgets: insert by owner"
  ON budgets FOR INSERT
  WITH CHECK (
    (owner_type = 'personal' AND owner_id = auth.uid())
    OR (owner_type = 'team' AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = owner_id
        AND tm.role IN ('team_manager','org_admin','org_owner')
    ))
    OR (owner_type = 'org' AND is_org_admin_or_owner(owner_id))
  );

CREATE POLICY "budgets: update by owner"
  ON budgets FOR UPDATE
  USING (
    (owner_type = 'personal' AND owner_id = auth.uid())
    OR (owner_type = 'team' AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = owner_id
        AND tm.role IN ('team_manager','org_admin','org_owner')
    ))
    OR (owner_type = 'org' AND is_org_admin_or_owner(owner_id))
  );

CREATE POLICY "budgets: delete by owner"
  ON budgets FOR DELETE
  USING (
    (owner_type = 'personal' AND owner_id = auth.uid())
    OR (owner_type = 'team' AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = owner_id
        AND tm.role IN ('team_manager','org_admin','org_owner')
    ))
    OR (owner_type = 'org' AND is_org_admin_or_owner(owner_id))
  );

-- ============================================================
-- 6. Add deferred FK: budget_daily_snapshots.budget_id → budgets
-- This FK was intentionally omitted in Step 1 because the new
-- budgets table did not exist yet.
-- ============================================================

ALTER TABLE budget_daily_snapshots
  ADD CONSTRAINT budget_daily_snapshots_budget_id_fkey
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE;

-- ============================================================
-- 7. Replace budget_daily_snapshots SELECT policy
-- Drop the USING (false) backstop added in Step 1 and add a real
-- policy that walks through the parent budget to check owner access.
-- Writes remain service-role-only (no INSERT/UPDATE/DELETE policies).
-- ============================================================

DROP POLICY IF EXISTS "snapshots: no authenticated access (service role only)"
  ON budget_daily_snapshots;

CREATE POLICY "snapshots: read by budget owner or member"
  ON budget_daily_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_daily_snapshots.budget_id
        AND (
          (b.owner_type = 'personal' AND b.owner_id = auth.uid())
          OR (b.owner_type = 'team' AND EXISTS (
            SELECT 1 FROM get_my_team_ids() WHERE team_id = b.owner_id
          ))
          OR (b.owner_type = 'org' AND is_org_admin_or_owner(b.owner_id))
        )
    )
  );
