-- profiles additions
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pay_cycle_start_day          integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS morning_report_enabled       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS health_score_last_calculated date;

-- Backfill: any user with at least one connected Plaid item is already set up
UPDATE profiles SET onboarding_complete = true
WHERE id IN (SELECT DISTINCT user_id FROM plaid_items);

-- dreams table
CREATE TABLE IF NOT EXISTS dreams (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  icon        text        NOT NULL DEFAULT '✨',
  title       text        NOT NULL,
  description text,
  goal_id     uuid        REFERENCES savings_goals(id) ON DELETE SET NULL,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dreams' AND policyname = 'dreams: personal owner'
  ) THEN
    CREATE POLICY "dreams: personal owner" ON dreams
      FOR ALL USING (owner_id = auth.uid());
  END IF;
END $$;

-- milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  milestone_key text        NOT NULL,
  earned_at     timestamptz NOT NULL DEFAULT now(),
  notified      boolean     NOT NULL DEFAULT false,
  UNIQUE (owner_id, milestone_key)
);
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'milestones' AND policyname = 'milestones: personal owner'
  ) THEN
    CREATE POLICY "milestones: personal owner" ON milestones
      FOR ALL USING (owner_id = auth.uid());
  END IF;
END $$;
