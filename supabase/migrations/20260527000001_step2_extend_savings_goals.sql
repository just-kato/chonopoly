-- Step 2: Extend savings_goals — add owner_type/owner_id/goal_type,
-- backfill goal_accounts, drop plaid_account_id/plaid_item_id/user_id,
-- relax target_amount/target_date to nullable,
-- replace savings_goals and savings_goal_history RLS,
-- replace temporary goal_accounts RLS with full team/org-aware policies.

-- ============================================================
-- 1. ADD NEW COLUMNS (nullable so backfill can run first)
-- ============================================================

ALTER TABLE savings_goals
  ADD COLUMN IF NOT EXISTS owner_type text,
  ADD COLUMN IF NOT EXISTS owner_id   uuid,
  ADD COLUMN IF NOT EXISTS goal_type  text;

-- ============================================================
-- 2. BACKFILL savings_goals
-- All existing goals are personal savings goals owned by their user.
-- ============================================================

UPDATE savings_goals
SET owner_type = 'personal',
    owner_id   = user_id,
    goal_type  = 'savings'
WHERE owner_type IS NULL;

-- ============================================================
-- 3. HARDEN NEW COLUMNS
-- ============================================================

ALTER TABLE savings_goals
  ALTER COLUMN owner_type SET NOT NULL,
  ALTER COLUMN owner_id   SET NOT NULL,
  ALTER COLUMN goal_type  SET NOT NULL;

ALTER TABLE savings_goals
  ADD CONSTRAINT savings_goals_owner_type_check
    CHECK (owner_type IN ('personal','team','org')),
  ADD CONSTRAINT savings_goals_goal_type_check
    CHECK (goal_type IN ('savings','project'));

-- ============================================================
-- 4. BACKFILL goal_accounts FROM savings_goals
-- Must run before dropping plaid_account_id/plaid_item_id.
-- ON CONFLICT DO NOTHING makes it safe to re-run.
-- ============================================================

INSERT INTO goal_accounts (goal_id, user_id, plaid_account_id, plaid_item_id)
SELECT id, user_id, plaid_account_id, plaid_item_id
FROM savings_goals
WHERE plaid_account_id IS NOT NULL
  AND plaid_item_id    IS NOT NULL
ON CONFLICT (goal_id, plaid_account_id) DO NOTHING;

-- ============================================================
-- 5. RELAX target_amount AND target_date TO NULLABLE
-- project-type goals have no savings target or deadline.
-- ============================================================

ALTER TABLE savings_goals
  ALTER COLUMN target_amount DROP NOT NULL,
  ALTER COLUMN target_date   DROP NOT NULL;

-- ============================================================
-- 6. DROP OLD RLS POLICIES THAT REFERENCE user_id
-- Must happen before DROP COLUMN user_id or Postgres will refuse.
-- Replacement policies are added below after the column drops.
-- ============================================================

DROP POLICY IF EXISTS "users manage own goals"       ON savings_goals;
DROP POLICY IF EXISTS "users view own goal history"  ON savings_goal_history;

-- ============================================================
-- 7. DROP COLUMNS NO LONGER IN THE ARCHITECTURE
-- plaid_account_id/plaid_item_id: data now lives in goal_accounts.
-- user_id: replaced by owner_id (holds the same UUID for personal goals).
-- ============================================================

ALTER TABLE savings_goals
  DROP COLUMN IF EXISTS plaid_account_id,
  DROP COLUMN IF EXISTS plaid_item_id,
  DROP COLUMN IF EXISTS user_id;

-- ============================================================
-- 8. NEW savings_goals RLS POLICIES
-- ============================================================

-- SELECT: personal owner, or any team member for team goals, or org admin/owner
CREATE POLICY "savings_goals: read by owner or member"
  ON savings_goals FOR SELECT
  USING (
    (owner_type = 'personal' AND owner_id = auth.uid())
    OR (owner_type = 'team' AND EXISTS (
      SELECT 1 FROM get_my_team_ids() WHERE team_id = owner_id
    ))
    OR (owner_type = 'org' AND is_org_admin_or_owner(owner_id))
  );

-- INSERT: any authenticated user can create a personal goal;
-- team/org goals require team_manager, org_admin, or org_owner.
CREATE POLICY "savings_goals: insert by owner"
  ON savings_goals FOR INSERT
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

-- UPDATE: personal owner; team_manager/org_admin/org_owner for team/org goals
CREATE POLICY "savings_goals: update by owner"
  ON savings_goals FOR UPDATE
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

-- DELETE: same as UPDATE
CREATE POLICY "savings_goals: delete by owner"
  ON savings_goals FOR DELETE
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
-- 9. NEW savings_goal_history RLS POLICY
-- Old policy joined to savings_goals.user_id which was just dropped.
-- ============================================================

CREATE POLICY "goal_history: read by goal owner or member"
  ON savings_goal_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM savings_goals sg
      WHERE sg.id = goal_id
        AND (
          (sg.owner_type = 'personal' AND sg.owner_id = auth.uid())
          OR (sg.owner_type = 'team' AND EXISTS (
            SELECT 1 FROM get_my_team_ids() WHERE team_id = sg.owner_id
          ))
          OR (sg.owner_type = 'org' AND is_org_admin_or_owner(sg.owner_id))
        )
    )
  );

-- ============================================================
-- 10. REPLACE TEMPORARY goal_accounts RLS WITH FULL POLICIES
-- Drop the three "(temporary, replaced in step 2)" policies from Step 1
-- and add full team/org-aware versions.
-- ============================================================

DROP POLICY IF EXISTS "goal_accounts: own rows select (temporary, replaced in step 2)" ON goal_accounts;
DROP POLICY IF EXISTS "goal_accounts: own rows insert (temporary, replaced in step 2)" ON goal_accounts;
DROP POLICY IF EXISTS "goal_accounts: own rows delete (temporary, replaced in step 2)" ON goal_accounts;

-- SELECT: personal owner sees own goal's accounts;
-- any team member sees all accounts for team goals (needed for team totals);
-- org admin/owner sees all accounts for org goals.
CREATE POLICY "goal_accounts: read by goal owner or member"
  ON goal_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM savings_goals sg
      WHERE sg.id = goal_accounts.goal_id
        AND (
          (sg.owner_type = 'personal' AND sg.owner_id = auth.uid())
          OR (sg.owner_type = 'team' AND EXISTS (
            SELECT 1 FROM get_my_team_ids() WHERE team_id = sg.owner_id
          ))
          OR (sg.owner_type = 'org' AND is_org_admin_or_owner(sg.owner_id))
        )
    )
  );

-- INSERT: must be linking your own account (user_id = auth.uid()),
-- and you must have write access to the parent goal.
CREATE POLICY "goal_accounts: insert own accounts with goal write access"
  ON goal_accounts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM savings_goals sg
      WHERE sg.id = goal_id
        AND (
          (sg.owner_type = 'personal' AND sg.owner_id = auth.uid())
          OR (sg.owner_type = 'team' AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
              AND tm.team_id = sg.owner_id
              AND tm.role IN ('team_manager','org_admin','org_owner')
          ))
          OR (sg.owner_type = 'org' AND is_org_admin_or_owner(sg.owner_id))
        )
    )
  );

-- DELETE: own linked accounts; OR team_manager/org_admin/org_owner can remove any
-- linked account on their team/org goal.
CREATE POLICY "goal_accounts: delete own or by goal manager"
  ON goal_accounts FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM savings_goals sg
      WHERE sg.id = goal_accounts.goal_id
        AND (
          (sg.owner_type = 'team' AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
              AND tm.team_id = sg.owner_id
              AND tm.role IN ('team_manager','org_admin','org_owner')
          ))
          OR (sg.owner_type = 'org' AND is_org_admin_or_owner(sg.owner_id))
        )
    )
  );
