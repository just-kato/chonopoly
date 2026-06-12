-- Bills & upcoming payments feature
-- Tracks recurring and one-time bills, auto-detected from Plaid transactions

-- ── bills ─────────────────────────────────────────────────────────────────────

CREATE TABLE bills (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  owner_type       text        NOT NULL DEFAULT 'personal'
                               CHECK (owner_type IN ('personal', 'team', 'org')),
  name             text        NOT NULL,
  amount           numeric(12,2) NOT NULL,
  due_day          integer     NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  recurrence       text        NOT NULL
                               CHECK (recurrence IN ('monthly', 'weekly', 'yearly', 'one-time')),
  category_id      text,
  is_auto_detected boolean     NOT NULL DEFAULT false,
  plaid_merchant   text,
  is_active        boolean     NOT NULL DEFAULT true,
  last_paid_at     timestamptz,
  -- notification flags reset to false each cycle when mark-paid is called
  notified_3day    boolean     NOT NULL DEFAULT false,
  notified_today   boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── bill_payments ─────────────────────────────────────────────────────────────
-- period format by recurrence:
--   monthly  → 'YYYY-MM'       e.g. '2026-06'
--   weekly   → 'YYYY-WW'       e.g. '2026-23'
--   yearly   → 'YYYY'          e.g. '2026'
--   one-time → 'YYYY-MM-DD'    e.g. '2026-06-15'

CREATE TABLE bill_payments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id    uuid        NOT NULL REFERENCES bills ON DELETE CASCADE,
  paid_at    timestamptz NOT NULL DEFAULT now(),
  amount     numeric(12,2) NOT NULL,
  period     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX bills_owner_idx         ON bills (owner_id, is_active);
CREATE INDEX bill_payments_bill_idx  ON bill_payments (bill_id, paid_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE bills         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bills: personal owner"
  ON bills FOR ALL
  USING (owner_id = auth.uid() AND owner_type = 'personal');

CREATE POLICY "bill_payments: owner via bill"
  ON bill_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bills b
      WHERE b.id = bill_payments.bill_id
        AND b.owner_id = auth.uid()
    )
  );
