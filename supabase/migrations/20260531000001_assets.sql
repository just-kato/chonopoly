-- Assets table for tracking owned items (car, house, investments, etc.)

CREATE TABLE assets (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_type     text        NOT NULL CHECK (owner_type IN ('personal', 'team')),
  name           text        NOT NULL CHECK (char_length(name) > 0),
  icon           text        NOT NULL DEFAULT '🏠',
  asset_type     text        NOT NULL DEFAULT 'other'
                             CHECK (asset_type IN ('vehicle', 'real_estate', 'investment', 'business', 'other')),
  current_value  numeric     NOT NULL CHECK (current_value >= 0),
  linked_debt_id uuid        REFERENCES debts(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Enforce no double-linking: one debt can back at most one asset
CREATE UNIQUE INDEX assets_linked_debt_unique
  ON assets(linked_debt_id)
  WHERE linked_debt_id IS NOT NULL;

CREATE INDEX ON assets(owner_id, owner_type);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_assets_owner"
  ON assets FOR ALL
  USING  (owner_type = 'personal' AND owner_id = auth.uid())
  WITH CHECK (owner_type = 'personal' AND owner_id = auth.uid());
