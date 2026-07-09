-- Cache per-item Plaid liquid-account balances to avoid live accountsGet on every
-- net-worth load. The refresh path (POST /api/net-worth/refresh) populates these
-- columns; the read path uses them exclusively (awaiting a live pull on first load).

ALTER TABLE plaid_items
  ADD COLUMN IF NOT EXISTS liquid_balance        NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS liquid_accounts_json  JSONB,
  ADD COLUMN IF NOT EXISTS balances_refreshed_at TIMESTAMPTZ;
