-- Rename morning_report_* columns to weekly_report_* and register weekly-report cron

ALTER TABLE profiles RENAME COLUMN morning_report_enabled TO weekly_report_enabled;
ALTER TABLE profiles RENAME COLUMN morning_report_sent_date TO weekly_report_sent_date;

-- R2: Phantom cron unschedule — try all likely names the old morning-report job may have used
DO $$ BEGIN PERFORM cron.unschedule('morning-report');       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('morning_report');       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('nightly-snapshot-7am'); EXCEPTION WHEN others THEN NULL; END $$;

-- Idempotent: drop and re-register weekly-report cron (Tuesday 14:00 UTC)
DO $$ BEGIN PERFORM cron.unschedule('weekly-report'); EXCEPTION WHEN others THEN NULL; END $$;
SELECT cron.schedule(
  'weekly-report',
  '0 14 * * 2',
  $$
  SELECT net.http_post(
    url     := 'https://ogkhxgpailxqirwhcsso.supabase.co/functions/v1/weekly-report',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body    := '{}'::jsonb
  );
  $$
);
