# Plan: Migrate `/transactions/get` → `/transactions/sync`

## SQL for manual execution (run in Supabase SQL editor before deploying)

```sql
ALTER TABLE plaid_items
  ADD COLUMN IF NOT EXISTS transactions_cursor text;

ALTER TABLE plaid_transactions
  ADD COLUMN IF NOT EXISTS pending_transaction_id text;

ALTER TABLE plaid_transactions
  ADD COLUMN IF NOT EXISTS name text;
```

Also create migration files for these (print only — do not apply programmatically):

**`supabase/migrations/20260614000000_add_transactions_cursor_to_plaid_items.sql`**
```sql
ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS transactions_cursor text;
```

**`supabase/migrations/20260614000001_plaid_transactions_sync_columns.sql`**
```sql
ALTER TABLE plaid_transactions
  ADD COLUMN IF NOT EXISTS pending_transaction_id text,
  ADD COLUMN IF NOT EXISTS name text;
```

---

## Step-by-step implementation

### Step 1 — Create migration files
Create the two SQL migration files above (content only, no programmatic execution).

---

### Step 2 — `lib/supabase/plaid.ts`

**Current SELECT:**
```ts
.select("id, access_token, item_id, institution_name, last_synced_at")
```

**Change to:**
```ts
.select("id, access_token, item_id, institution_name, last_synced_at, transactions_cursor")
```

Return type inference picks it up automatically — no explicit type annotation needed here.

---

### Step 3 — `lib/plaid-sync.ts` — full rewrite of `syncPlaidItem`

**Signature stays unchanged:**
```ts
export async function syncPlaidItem(
  userId: string,
  itemId: string,
  accessToken: string
): Promise<{ added: number; modified: number; removed: number }>
```

`db` created internally via `serviceDb()` — no change to callers.

**New implementation:**

1. Read `transactions_cursor` from `plaid_items` where `item_id = itemId AND user_id = userId`
2. Paginate `transactionsSyncPost` with `while (hasMore)`:
   - `cursor: cursor ?? undefined` (null → undefined = first sync, returns full history)
   - options: `include_personal_finance_category: true`, `include_personal_finance_category_beta: true`
3. For `added` + `modified`: upsert into `plaid_transactions` with conflict on `user_id,plaid_transaction_id`
4. For `removed`: delete from `plaid_transactions` by `plaid_transaction_id IN (removedIds)`
5. Advance `cursor = next_cursor`, `hasMore = has_more`
6. After loop: update `plaid_items` SET `transactions_cursor = cursor, last_synced_at = now()` where `item_id = itemId AND user_id = userId`
7. Remove orphan cleanup block (no longer needed — `/transactions/sync` handles pending→posted via `removed`)
8. Keep bill auto-detection logic unchanged (reads from `plaid_transactions` after sync)
9. Keep `invalidateBudgetCache` call

**Row shape for upsert (added + modified):**
```ts
{
  user_id:                  userId,
  plaid_transaction_id:     tx.transaction_id,
  plaid_account_id:         tx.account_id,
  plaid_item_id:            itemId,
  merchant_name:            tx.merchant_name ?? tx.name ?? null,
  name:                     tx.name ?? null,
  amount:                   tx.amount,
  date:                     tx.date,
  pending:                  tx.pending ?? false,
  pending_transaction_id:   tx.pending_transaction_id ?? null,
  category_primary:         tx.personal_finance_category?.primary ?? null,
  category_detailed:        tx.personal_finance_category?.detailed ?? null,
  currency_code:            tx.iso_currency_code ?? null,
  synced_at:                new Date().toISOString(),
}
```

**Remove entirely:**
- `daysAgo()` helper (no longer used — cursor replaces date window)
- `start_date` / `end_date` locals
- `transactionsGet` call
- Orphan cleanup block (the `.delete().eq("pending", true).not(...)`)
- `synced` / `updated` counters
- `let synced = 0; let updated = 0;` declarations
- The `try/catch` wrapper (replace with per-page error handling or let it throw — caller logs)

**Keep:**
- `serviceDb()` export and its internal usage
- `invalidateBudgetCache` import and call
- Bill auto-detection block (lines 95–146 in current file) — unchanged

---

### Step 4 — `app/api/plaid/sync/route.ts`

**Current:**
```ts
let synced = 0;
let updated = 0;
for (const item of items) {
  const result = await syncPlaidItem(user.id, item.item_id, item.access_token);
  synced += result.synced;
  updated += result.updated;
}
return NextResponse.json({ synced, updated });
```

**Change to:**
```ts
let added = 0;
let modified = 0;
let removed = 0;
for (const item of items) {
  const result = await syncPlaidItem(user.id, item.item_id, item.access_token);
  added += result.added;
  modified += result.modified;
  removed += result.removed;
}
return NextResponse.json({ added, modified, removed });
```

Also update the early-return guard:
```ts
if (!items.length) return NextResponse.json({ added: 0, modified: 0, removed: 0 });
```

**Grep for any UI consuming `{ synced, updated }` from this endpoint** before changing — update those call sites too.

---

### Step 5 — Audit UI call sites for `{ synced, updated }`

Before implementing Step 4, grep `BudgetClient.tsx` and any other file that calls `/api/plaid/sync` and reads `synced` or `updated` from the response. Update those to use `added`/`modified`/`removed` or simply ignore the shape (if the UI just triggers sync and doesn't display the count).

---

### Step 6 — `scripts/reset-plaid-cursors.ts`

Create script that sets `transactions_cursor = null` for all rows in `plaid_items`. Run once manually after deploying to force a full re-sync via the new endpoint.

```ts
// Sets transactions_cursor = null on all plaid_items
// Run once after deploying: npx tsx scripts/reset-plaid-cursors.ts
```

Uses same manual `.env.local` parser pattern as `register-plaid-webhooks.ts`.

---

## File change summary

| File | Action |
|---|---|
| `supabase/migrations/20260614000000_add_transactions_cursor_to_plaid_items.sql` | Create |
| `supabase/migrations/20260614000001_plaid_transactions_sync_columns.sql` | Create |
| `lib/supabase/plaid.ts` | Edit — add `transactions_cursor` to SELECT |
| `lib/plaid-sync.ts` | Edit — replace `transactionsGet` with `transactionsSyncPost` |
| `app/api/plaid/sync/route.ts` | Edit — update return shape |
| `scripts/reset-plaid-cursors.ts` | Create |

**Not touched:** `exchange-token`, `create-link-token`, `OnboardingModal`, any `plaid_items` rows, RLS policies, env vars.

---

## Definition of done
- [ ] Migration SQL files created (user runs manually in Supabase)
- [ ] `getPlaidItems()` selects `transactions_cursor`
- [ ] `syncPlaidItem` uses `transactionsSyncPost` with cursor pagination
- [ ] Added / modified / removed all handled correctly
- [ ] Cursor persisted after each successful sync
- [ ] Orphan cleanup code removed
- [ ] `daysAgo` helper removed (or kept only if used by bill detection — check)
- [ ] Cursor reset script created
- [ ] `npm run build` — 0 errors / 0 warnings
- [ ] No callers of `syncPlaidItem` need updating (signature unchanged)
