-- Debts table for tracking debt payoff goals

CREATE TABLE debts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_type       text        NOT NULL CHECK (owner_type IN ('personal', 'team')),
  name             text        NOT NULL CHECK (char_length(name) > 0),
  icon             text        NOT NULL DEFAULT '💳',
  debt_type        text        NOT NULL DEFAULT 'credit_card'
                               CHECK (debt_type IN ('credit_card','personal_loan','student_loan','auto','mortgage','other')),
  original_balance numeric     NOT NULL CHECK (original_balance >= 0),
  current_balance  numeric     NOT NULL CHECK (current_balance >= 0),
  interest_rate    numeric     NOT NULL CHECK (interest_rate >= 0),
  minimum_payment  numeric     NOT NULL DEFAULT 0 CHECK (minimum_payment >= 0),
  priority_order   integer     NOT NULL DEFAULT 0,
  target_date      date,
  status           text        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'paid_off', 'paused')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_synced_at   timestamptz
);

CREATE INDEX ON debts(owner_id, owner_type);
CREATE INDEX ON debts(owner_id, owner_type, priority_order);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_debts_owner"
  ON debts FOR ALL
  USING  (owner_type = 'personal' AND owner_id = auth.uid())
  WITH CHECK (owner_type = 'personal' AND owner_id = auth.uid());
