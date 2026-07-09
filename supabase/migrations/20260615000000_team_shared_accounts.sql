-- team_shared_accounts: records which Plaid items an owner has shared with a team.
-- Does NOT modify plaid_items table or its RLS.

CREATE TABLE team_shared_accounts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id        uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  plaid_item_id  text        NOT NULL,
  owner_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, plaid_item_id)
);

CREATE INDEX ON team_shared_accounts(team_id);
CREATE INDEX ON team_shared_accounts(owner_user_id);

ALTER TABLE team_shared_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_shared_accounts: team member can read"
  ON team_shared_accounts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM get_my_team_ids() WHERE team_id = team_shared_accounts.team_id)
  );

CREATE POLICY "team_shared_accounts: owner or org admin can insert"
  ON team_shared_accounts FOR INSERT
  WITH CHECK (
    owner_user_id = auth.uid()
    OR is_org_admin_or_owner(
      (SELECT org_id FROM teams WHERE id = team_id)
    )
  );

CREATE POLICY "team_shared_accounts: owner or org admin can delete"
  ON team_shared_accounts FOR DELETE
  USING (
    owner_user_id = auth.uid()
    OR is_org_admin_or_owner(
      (SELECT org_id FROM teams WHERE id = team_shared_accounts.team_id)
    )
  );
