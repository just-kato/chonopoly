-- Category override: user-chosen category that takes precedence over Plaid's category_primary.
-- Resolver: resolveCategory(tx) = category_override ?? category_primary
-- Plaid re-sync upserts do not include this column so it is preserved across syncs.
ALTER TABLE plaid_transactions
  ADD COLUMN IF NOT EXISTS category_override text;
