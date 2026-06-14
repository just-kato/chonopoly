ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
