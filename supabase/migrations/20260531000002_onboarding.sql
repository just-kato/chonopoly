-- Onboarding progress tracking per user

CREATE TABLE user_onboarding (
  user_id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_bank    boolean     NOT NULL DEFAULT false,
  added_savings_goal boolean    NOT NULL DEFAULT false,
  added_debt        boolean     NOT NULL DEFAULT false,
  added_asset       boolean     NOT NULL DEFAULT false,
  set_up_budget     boolean     NOT NULL DEFAULT false,
  dismissed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_owner"
  ON user_onboarding FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
