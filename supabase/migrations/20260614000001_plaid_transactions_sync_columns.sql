ALTER TABLE plaid_transactions
  ADD COLUMN IF NOT EXISTS pending_transaction_id text,
  ADD COLUMN IF NOT EXISTS name text;
