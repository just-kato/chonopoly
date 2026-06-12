-- Step 5: Nightly cron jobs — snapshot writer and budget reset.
--
-- Installs pg_net (HTTP from SQL) and pg_cron (scheduled jobs), adds
-- notification-state columns to budget_daily_snapshots, then registers
-- two cron schedules that call the matching Edge Functions.
--
-- Before the cron jobs can fire, store the service role key in Vault once:
--   supabase db query --linked "SELECT vault.create_secret('service_role_key', '<SERVICE_ROLE_KEY>', 'pg_cron edge function auth');"
-- Then re-register the schedules using the vault read pattern below.
-- ALTER DATABASE SET requires superuser and cannot be used from the CLI;
-- Vault is the correct mechanism for runtime secret access from pg_cron.

-- ============================================================
-- 1. Extensions
-- pg_net:  HTTP requests from SQL (calls Edge Functions via net.http_post)
-- pg_cron: Scheduled cron jobs (must be in pg_catalog schema on Supabase)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- ============================================================
-- 2. Notification-state columns on budget_daily_snapshots
--
-- The nightly-snapshot cron carries forward notification state so it
-- never sends the same 80% or over-budget email twice in a period.
-- ============================================================

ALTER TABLE budget_daily_snapshots
  ADD COLUMN IF NOT EXISTS notified_80    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_over  boolean NOT NULL DEFAULT false;

-- ============================================================
-- 3. Cron schedule — nightly-snapshot (11:55 PM UTC)
--
-- Reads all active budgets for the current day, sums period-to-date
-- spending from plaid_transactions via goal_accounts, writes one
-- budget_daily_snapshots row per budget (UPSERT), and sends Resend
-- emails for budgets that newly cross 80% or 100%.
-- ============================================================

-- NOTE: After applying this migration, re-register the schedules via:
--   supabase db query --linked "SELECT cron.schedule('nightly-snapshot', '55 23 * * *', ...);"
-- using the vault read pattern so the service role key is never stored
-- in this file. See the Step 5 setup notes for the exact commands.
--
-- The calls below use current_setting as a placeholder — they are replaced
-- by the vault-backed schedules run post-migration.
SELECT cron.schedule(
  'nightly-snapshot',
  '55 23 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://ogkhxgpailxqirwhcsso.supabase.co/functions/v1/nightly-snapshot',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- 4. Cron schedule — nightly-budget-reset (midnight UTC)
--
-- Finds all active recurring budgets where period_end = today,
-- creates new budget rows for the next period (with rollover if
-- enabled), marks old budgets paused, and sends a savings nudge
-- email when the owner has unspent money and rollover is off.
-- ============================================================

SELECT cron.schedule(
  'nightly-budget-reset',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://ogkhxgpailxqirwhcsso.supabase.co/functions/v1/nightly-budget-reset',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body    := '{}'::jsonb
  );
  $$
);
