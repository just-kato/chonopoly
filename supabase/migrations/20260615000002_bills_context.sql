-- Add context_type / context_id to bills so bills can belong to a team context.
-- Existing personal bills are backfilled: context_type = 'personal', context_id = owner_id.

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS context_type text NOT NULL DEFAULT 'personal';

-- Add nullable first so the backfill can run before adding NOT NULL
ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS context_id uuid;

UPDATE bills SET context_id = owner_id WHERE context_id IS NULL;

ALTER TABLE bills ALTER COLUMN context_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS bills_context_idx ON bills (context_type, context_id, is_active);

-- Add a policy for team-context bills (service role handles writes; this covers direct reads)
CREATE POLICY "bills: team member can read team bills"
  ON bills FOR SELECT
  USING (
    context_type = 'team'
    AND EXISTS (SELECT 1 FROM get_my_team_ids() WHERE team_id = bills.context_id)
  );
