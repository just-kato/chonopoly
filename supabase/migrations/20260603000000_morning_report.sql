ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS morning_report_sent_date date;
