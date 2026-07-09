-- Register pg_cron job for sync-goal-balances (every 12 hours).
--
-- The function header states "every 12 hours" but no schedule was ever
-- registered; this migration closes that gap.
-- Vault auth pattern mirrors weekly-report and nightly-budget-reset registrations.

-- Idempotent: unschedule if a prior registration exists before re-registering.
DO $$ BEGIN PERFORM cron.unschedule('sync-goal-balances'); EXCEPTION WHEN others THEN NULL; END $$;

SELECT cron.schedule(
  'sync-goal-balances',
  '0 */12 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://ogkhxgpailxqirwhcsso.supabase.co/functions/v1/sync-goal-balances',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body    := '{}'::jsonb
  );
  $$
);
