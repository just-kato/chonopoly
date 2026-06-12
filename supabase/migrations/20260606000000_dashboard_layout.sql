ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dashboard_layout jsonb;
