# Plan: Mobile Overview Redesign

**File touched:** `components/BudgetClient.tsx` only  
**Desktop:** zero changes — existing `OverviewPanel` wrapped in `hidden lg:block`  
**Build gate:** `npm run build` 0 errors / 0 warnings before done

---

## Audit findings

### 1. Where OverviewPanel is rendered
**L2205–2209** — inside a `flex flex-col flex-1` div gated on `view === "overview" && connected.length > 0 && !loading`:
```tsx
<div className="flex flex-col flex-1 min-h-0 overflow-hidden px-5 py-4 pb-18 lg:pb-4">
  {error && ...}
  <OverviewPanel ... />
</div>
```
This entire div gets split: the `OverviewPanel` call moves into a `hidden lg:block` wrapper; the new mobile block is added as a sibling above it.

### 2. Data in scope at render site (L2205)
| Variable | Source | Value |
|---|---|---|
| `totalBalance` | `useMemo` L1923 — sum of all `accounts[].balances.current` | Liquid cash display |
| `totalSpent` | `useMemo` L1924 — sum of `amount > 0` | Spent 30D |
| `totalIncome` | `useMemo` L1925 — sum of `Math.abs(amount)` where `amount < 0` | Income 30D |
| `accounts` | state, array of `Account` | For primary account label |
| `transactions` | state | Passed to ActivityChart, DailyDigest |
| `activeContext` | prop | Passed to subcomponents |
| `panelProps` | L1943 | Spread into panels |
| `spending` | memoized | Passed to ActivityChart indirectly |
| `categoryOverrides` | state | Passed to DailyDigest |
| `navTo` | fn L1931 | For "View all" in DailyDigest |

Net worth is fetched independently inside `NetWorthCard` via `/api/net-worth` — it is **not** a variable in scope at L2205. The hero block will omit it (the spec shows "NET" as `income - spent`, not DB net worth).

### 3. ActivityChart props (L373)
```tsx
<ActivityChart transactions={transactions} />
```
One prop. Reused as-is in Activity tab.

### 4. DailyDigest props (L378–383)
```tsx
<DailyDigest
  transactions={transactions}
  categoryOverrides={categoryOverrides}
  onViewAll={onViewAll}   // () => navTo("transactions")
  onRecategorize={onChangeCategory}
/>
```
Four props. The `lg:w-80` wrapper is already removed (earlier session). Reused as-is in Recent tab wrapped in `w-full`.

### 5. Bills preview (L387–390)
```tsx
<BillsWidget accounts={accounts} />
```
One prop. Reused as-is in Bills tab.

### 6. Stat cards (L364–368)
```tsx
<div className="grid grid-cols-3 gap-2 flex-shrink-0">
  <OverviewStatCard label="Liquid cash"  value={`$${formatMoney(totalBalance)}`} />
  <OverviewStatCard label="Spent (30d)"  value={`$${formatMoney(totalSpent)}`}  color="text-(--color-danger)" />
  <OverviewStatCard label="Income (30d)" value={`$${formatMoney(totalIncome)}`} color="text-(--color-success)" />
</div>
```
These live inside `OverviewPanel` (a sub-function). They get `hidden lg:flex` inside `OverviewPanel` — not deleted.

---

## New state added

At the top of the main component body alongside other `useState` calls:

```tsx
const [mobileOverviewTab, setMobileOverviewTab] = useState<'activity' | 'recent' | 'bills' | 'budgets'>('activity');
```

No other state changes.

---

## Structural change at L2205–2209

**Before:**
```tsx
{view === "overview" && connected.length > 0 && !loading ? (
  <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-5 py-4 pb-18 lg:pb-4">
    {error && ...}
    <OverviewPanel ... />
  </div>
) : (
```

**After:**
```tsx
{view === "overview" && connected.length > 0 && !loading ? (
  <>
    {error && <p className="...">...</p>}

    {/* Mobile Overview — hidden on desktop */}
    <div className="lg:hidden flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Section 1: Hero balance */}
      <div className="px-5 pt-4 pb-2 flex-shrink-0">
        {/* eyebrow + big balance + account label + divider + 3-stat row */}
      </div>

      {/* Section 2: Tab strip */}
      <nav className="lg:hidden flex overflow-x-auto scrollbar-none border-b border-(--color-border-subtle) flex-shrink-0"
        style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-1.5 px-4 py-2">
          {(['activity', 'recent', 'bills', 'budgets'] as const).map(tab => (
            <button key={tab} onClick={() => setMobileOverviewTab(tab)} className={...}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      {/* Section 3: Tab content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {mobileOverviewTab === 'activity' && (
          <div className="p-4">
            <ActivityChart transactions={transactions} />
          </div>
        )}
        {mobileOverviewTab === 'recent' && (
          <div className="p-4 w-full">
            <DailyDigest
              transactions={transactions}
              categoryOverrides={categoryOverrides}
              onViewAll={() => navTo("transactions")}
              onRecategorize={changeCategory}
            />
          </div>
        )}
        {mobileOverviewTab === 'bills' && (
          <div className="p-4">
            <BillsWidget accounts={accounts} />
          </div>
        )}
        {mobileOverviewTab === 'budgets' && (
          <div className="p-4">
            <BudgetsPanel onGoTo={navTo} activeContext={activeContext} />
          </div>
        )}
      </div>
    </div>

    {/* Desktop Overview — zero changes inside */}
    <div className="hidden lg:flex flex-col flex-1 min-h-0 overflow-hidden px-5 py-4 lg:pb-4">
      <OverviewPanel ... />
    </div>
  </>
) : (
```

---

## Hero block detail

```
LIQUID CASH                    (refresh icon lives in mobile top bar — already there)
$1,900.14
──────────────────────────────
SPENT (30D)   INCOME (30D)   NET
$8,875.99     $10,235.07    +$1,359
```

Data sources:
- **"LIQUID CASH" label** — hardcoded string
- **Big balance `$X`** — `totalBalance` (sum of all `accounts[].balances.current`)
- **Account label below** — `accounts[0]?.institution_name + " · " + accounts[0]?.subtype` (first account; empty if no accounts)
- **SPENT (30D)** — `totalSpent`
- **INCOME (30D)** — `totalIncome`
- **NET** — `totalIncome - totalSpent` (computed inline, no new var)

Tokens per spec:
```
eyebrow:  text-[11px] uppercase tracking-[0.12em] text-(--color-accent) font-medium
balance:  text-[52px] font-bold font-(--font-mono) text-(--color-text-primary) leading-none
acct:     text-[13px] text-(--color-text-tertiary)
divider:  border-t border-(--color-border-subtle) my-4
stat label: text-[10px] uppercase tracking-wide text-(--color-text-tertiary)
stat value: text-[15px] font-semibold font-(--font-mono)
spent:    text-(--color-danger) if > 0
income:   text-(--color-success) if > 0
net:      text-(--color-accent) if positive, text-(--color-danger) if negative
```

---

## Change inside OverviewPanel (sub-function)

The existing 3-card grid row (L364–368) gets `hidden lg:grid` instead of `grid`:
```tsx
- <div className="grid grid-cols-3 gap-2 flex-shrink-0">
+ <div className="hidden lg:grid grid-cols-3 gap-2 flex-shrink-0">
```
Nothing else inside `OverviewPanel` changes.

---

## Budgets tab note

`BudgetsPanel` fetches its own data via `/api/budget/summary` (it already does this at L825). The spec says "use data already available in scope — do not add new API calls" — but `BudgetsPanel` is a self-contained component that has always fetched its own data. Rendering it in the mobile tab reuses it exactly as it appears at L2226 (`{view === "budgets" && <BudgetsPanel ...>}`). No new API calls are added by us; the component manages its own fetch lifecycle.

If the intent was a lighter inline budget list without `BudgetsPanel`'s full fetch, I'll flag that before implementing — but reusing the existing component is the lowest-risk path.

---

## Summary of all edits

| Location | Change |
|---|---|
| Main component `useState` block | Add `mobileOverviewTab` state |
| L2205–2209 (overview branch) | Wrap in `<>...</>`, add `lg:hidden` mobile block, wrap existing div in `hidden lg:flex` |
| `OverviewPanel` sub-function L364 | `grid` → `hidden lg:grid` on the 3-card row |

**No other files touched. No new imports needed** (`BudgetsPanel`, `ActivityChart`, `DailyDigest`, `BillsWidget` are all already imported/defined in this file).
