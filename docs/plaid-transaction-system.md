# Plaid Transaction System

## Two separate concerns: Sync (write) vs Fetch (read)

---

## 1. Sync — writing transactions to the local DB

Transactions are never read live from Plaid on page load. They're pulled from Plaid and stored in `plaid_transactions`, then read from there.

### Triggers

| Trigger | Path |
|---|---|
| Page load (stale >30 min) | `BudgetClient` → `POST /api/plaid/sync` |
| Manual Refresh button | `BudgetClient` → `POST /api/plaid/sync` |
| Plaid webhook | `POST /api/plaid/webhook` → `syncPlaidItem()` directly |

### Sync flow (`lib/plaid-sync.ts → syncPlaidItem`)

```
1. Call Plaid transactionsGet:
     start_date: 45 days ago
     end_date:   today
     options:
       count: 500
       include_personal_finance_category: true
       include_personal_finance_category_beta: true
     (include_pending: not set — Plaid default is false)

2. Map each transaction to a DB row:
     plaid_transaction_id, plaid_account_id, plaid_item_id
     merchant_name, amount, date (YYYY-MM-DD string)
     category_primary, category_detailed
     pending, currency_code, synced_at

3. UPSERT into plaid_transactions
     onConflict: user_id, plaid_transaction_id

4. Write last_synced_at → plaid_items
     Uses serviceDb (service role key — required in webhook context with no user session)

5. Auto-detect recurring bills:
     Look at 60 days of transactions
     Merchants with 2+ charges at ~monthly intervals (20–45 day avg gap)
     Insert into bills if not already there
```

### `POST /api/plaid/sync`

Thin wrapper — authenticates the user, fetches their `plaid_items`, calls `syncPlaidItem()` for each, returns `{ synced, updated }`.

### Webhook (`POST /api/plaid/webhook`)

- Verifies the `Plaid-Verification` JWT header:
  - ES256 signed by Plaid
  - Public key fetched via `webhookVerificationKeyGet(kid)` using `PLAID_SECRET`
  - `iat` must be within 5 minutes
  - `request_body_sha256` must match SHA-256 of raw body
- On `TRANSACTIONS / SYNC_UPDATES_AVAILABLE`: looks up item by `item_id`, calls `syncPlaidItem()` **async** (fire-and-forget), returns 200 immediately so Plaid doesn't retry
- On `ITEM / ERROR`: logs the error, returns 200

---

## 2. Fetch — reading data for the UI

### `GET /api/plaid/transactions`

Two separate data sources per request:

**Transactions — from local DB (no Plaid call)**
```
SELECT from plaid_transactions
WHERE user_id = ?
  AND plaid_item_id IN (active production item IDs)
  AND date >= start_date
ORDER BY date DESC

Sandbox tokens (access-sandbox-*) filtered out before querying.
Default window: 30 days. Accepts ?days=N up to 90.
```

**Accounts + Balances — live Plaid call on every request**
```
?live=true (manual Refresh only):
  plaidClient.accountsBalanceGet()
  → forces real-time pull from institution (~2–10s)

default (page load):
  plaidClient.accountsGet()
  → returns Plaid-cached balances (fast, may be hours old)

Returns: account_id, name, type, subtype,
         balances { available, current, limit },
         institution_name

Sandbox tokens filtered out before calling.
```

Response shape: `{ accounts: [...], transactions: [...] }`

---

## 3. Client — `BudgetClient.tsx`

```
On mount (view = overview, connected banks > 0):

  1. syncIfStale useEffect
       Read last_synced_at from plaid_items (Supabase direct)
       If null or >30 min ago → POST /api/plaid/sync
       Then setFetchTick++ to trigger the fetch below

  2. fetchTick useEffect
       Runs on mount and whenever fetchTick increments
       Reads liveRef (set to true only after manual Refresh)
       fetch(`/api/plaid/transactions${live ? '?live=true' : ''}`)
       → setAccounts(d.accounts)
       → setTransactions(d.transactions)

  3. Refresh button (desktop sidebar + mobile top bar — same callback)
       POST /api/plaid/sync       (re-syncs 45 days from Plaid)
       liveRef.current = true
       setFetchTick++             (triggers GET with ?live=true → real-time balances)
```

---

## 4. Data flow

```
PLAID API
  │
  ├─ transactionsGet ──────────→ plaid_transactions (Supabase)
  │   via syncPlaidItem()                │
  │   triggered by:                     │
  │   • page load if >30 min stale      │
  │   • Refresh button                  │
  │   • webhook SYNC_UPDATES_AVAILABLE  │
  │                                     ▼
  │                            GET /api/plaid/transactions
  │                            reads from local DB (no Plaid call)
  │
  └─ accountsGet / accountsBalanceGet ──→ GET /api/plaid/transactions
      called live on every page load       returned directly to client
      accountsGet        = cached, fast
      accountsBalanceGet = real-time (Refresh only, ?live=true)
```

---

## 5. Required env vars

| Var | Purpose |
|---|---|
| `PLAID_CLIENT_ID` | All Plaid API calls |
| `PLAID_SECRET` | All Plaid API calls including `webhookVerificationKeyGet` |
| `PLAID_ENV` | `sandbox` or `production` |
| `NEXT_PUBLIC_APP_URL` | Registers webhook URL on new Plaid connections via create-link-token |
| `SUPABASE_SERVICE_ROLE_KEY` | `syncPlaidItem` DB writes (bypasses RLS — required in webhook context with no user session) |

---

## 6. Deployment checklist

- [x] `supabase/migrations/20260613000000_add_last_synced_at_to_plaid_items.sql` — run in Supabase
- [x] `NEXT_PUBLIC_APP_URL` — set in Vercel
- [ ] Merge PR #23 — deploys webhook route, sync-on-load, and mobile overview to production
- [ ] Run backfill script once after deploy to register webhook URL on existing items:
  ```bash
  npx tsx scripts/register-plaid-webhooks.ts
  ```
  Requires `.env.local` with all vars above. New connections auto-register via `create-link-token` — script is only needed for the 3 existing production items (Navy Federal, USAA, PayPal).

---

## 7. Known limitations

- **Balance freshness**: `accountsGet` returns Plaid-cached balances which may be hours old. Use Refresh for real-time data via `accountsBalanceGet`.
- **Pending transactions**: `include_pending` is not set, so Plaid's default applies. USAA batches pending transactions on their end and may not expose them until they post — this is a USAA → Plaid latency issue, not an app bug.
- **Sandbox rows**: 2 Tartan Bank rows (`access-sandbox-*`) exist in `plaid_items` from early testing. They're filtered in code but not yet deleted from the DB.
