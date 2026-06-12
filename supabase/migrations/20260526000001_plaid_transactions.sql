CREATE TABLE IF NOT EXISTS plaid_transactions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_transaction_id text NOT NULL,
  plaid_account_id     text NOT NULL,
  plaid_item_id        text NOT NULL,
  merchant_name        text,
  amount               numeric(12,2) NOT NULL,
  date                 date NOT NULL,
  category_primary     text,
  category_detailed    text,
  pending              boolean NOT NULL DEFAULT false,
  currency_code        text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  synced_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plaid_transaction_id)
);

ALTER TABLE plaid_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plaid_transactions_owner" ON plaid_transactions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
