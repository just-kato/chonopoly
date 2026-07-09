# Plan: Fix Savings Rate Logic + Wire Analytics Period Selector (v2)

## Framework: J. Scott "Real Estate by the Numbers"
- **Income:** Actual earnings only (category = INCOME). 3-month trailing average for variable income.
- **Expenses:** Everything actually spent — food, rent, loans, bank fees, taxes. Only internal transfers excluded.
- **Savings Rate ($):** `trailingIncome − totalSpent`
- **Savings Rate (%):** `(trailingIncome − totalSpent) / trailingIncome × 100`
- **Investable Assets:** `Liquid Assets − (monthly expenses × 3)` — keep as-is.

---

## Scope
All changes inside `components/BudgetClient.tsx` only. No new files, no new API calls.

---

## Step 1 — Add `Period` type + `getPeriodRange` helper

**Location:** Insert just above `AnalyticsPanel` function (~L1215), after `hashMerchantColor`.

**Add:**
```ts
type Period = 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  switch (period) {
    case 'DAY': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'WEEK': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'MONTH': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
    }
    case 'QUARTER': {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1);
      return { start, end };
    }
    case 'YEAR': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end };
    }
  }
}
```

---

## Step 2 — Add exclusion constants

**Location:** Same block, just below `getPeriodRange`.

**Add:**
```ts
// Only internal transfers excluded per J. Scott framework — loans, fees, etc. are real expenses
const EXCLUDED_TRANSFER_CATEGORIES = new Set([
  'TRANSFER_OUT',
  'TRANSFER_IN',
]);

// Income = actual earnings only (not negative-amount transfers)
const INCOME_CATEGORIES = new Set([
  'INCOME',
]);
```

---

## Step 3 — Update `period` state

**Location:** L1241

**Remove:**
```ts
const [period, setPeriod] = useState<"7D" | "30D" | "90D" | "YTD">("30D");
```

**Replace with:**
```ts
const [period, setPeriod] = useState<Period>('MONTH');
```

---

## Step 4 — Remove `savingsRateMode` state

**Location:** L1242

**Remove:**
```ts
const [savingsRateMode, setSavingsRateMode] = useState<"dollar" | "pct">("dollar");
```

The savings rate card will show both dollar and pct simultaneously — no toggle needed.

---

## Step 5 — Refactor `trailingAvgIncome` → use `INCOME_CATEGORIES`

**Location:** L1284–1301

**Current:** Filters by `t.amount < 0` (sign only — catches transfers).

**Replace body with:**
```ts
function trailingAvgIncome(txns: Transaction[]): number {
  const now = new Date();
  const monthTotals: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    const monthIncome = txns
      .filter(t => {
        const d = new Date(t.date + 'T00:00:00');
        return d >= monthStart && d <= monthEnd &&
               t.amount < 0 &&
               INCOME_CATEGORIES.has(t.personal_finance_category?.primary ?? '');
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    if (monthIncome > 0) monthTotals.push(monthIncome);
  }
  return monthTotals.length > 0
    ? monthTotals.reduce((a, b) => a + b, 0) / monthTotals.length
    : 0;
}
```

**Keep the function** — it is still used for `monthly_income` / `trailingIncome`.

---

## Step 6 — Delete `currentMonthExpenses` and `prevMonthSavingsRate`

**Location:** L1303–1346

**Delete both functions entirely.** Expenses now come from period-filtered `periodExpenses`. The prev month delta is removed.

---

## Step 7 — Replace derived values block

**Location:** L1354–1359 (current `monthly_income`, `monthly_expenses`, `savings_rate_*` lines)

**Remove:**
```ts
const monthly_income = trailingAvgIncome(transactions);
const monthly_expenses = currentMonthExpenses(transactions);
const savings_rate_dollar = monthly_income - monthly_expenses;
const savings_rate_pct = monthly_income > 0 ? (savings_rate_dollar / monthly_income) * 100 : null;
const prev_savings_rate = prevMonthSavingsRate(transactions);
const savings_rate_delta = savings_rate_dollar - prev_savings_rate;
```

**Replace with:**
```ts
// Period-filtered expense helpers
const { start, end } = getPeriodRange(period);
const isInPeriod = (tx: Transaction) => {
  const d = new Date(tx.date + 'T00:00:00');
  return d >= start && d <= end;
};
const isExpense = (tx: Transaction) =>
  tx.amount > 0 &&
  !EXCLUDED_TRANSFER_CATEGORIES.has(tx.personal_finance_category?.primary ?? '');
const isIncome = (tx: Transaction) =>
  tx.amount < 0 &&
  INCOME_CATEGORIES.has(tx.personal_finance_category?.primary ?? '');

const periodTxs      = transactions.filter(isInPeriod);
const periodExpenses = periodTxs.filter(isExpense);
const periodIncomeTxs = periodTxs.filter(isIncome);

// J. Scott framework: trailing income (3-mo avg) vs period expenses
const trailingIncome   = trailingAvgIncome(transactions);
const totalSpentPeriod = periodExpenses.reduce((s, t) => s + t.amount, 0);
const totalIncomePeriod = periodIncomeTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
const savingsDollar    = trailingIncome - totalSpentPeriod;
const savingsRatePct   = trailingIncome > 0 ? (savingsDollar / trailingIncome) * 100 : null;

// For investable assets — keep monthly anchor independent of period selector
const monthly_expenses = totalSpentPeriod; // When period = MONTH this is correct; otherwise approximate
```

**Note:** `required_reserve` = `monthly_expenses * 3`. When the user selects WEEK or DAY this will understate the reserve. A cleaner fix would be a separate `monthlyExpensesForReserve` computed from last full calendar month, but per scope rules this is a follow-up. For now `monthly_expenses = totalSpentPeriod` matches prior behavior closely when MONTH is selected (the default).

---

## Step 8 — Recompute `sorted` / `total` / `topMerchants` / `dayAmounts` from `periodExpenses`

**Location:** L1261–1279

**Remove:** Current `sorted`, `total`, `merchantMap`, `topMerchants`, `dayAmounts` blocks (all sourced from all transactions).

**Replace with:**
```ts
// Category breakdown — period-filtered, transfers excluded
const periodSpending = periodExpenses.reduce<Record<string, number>>((acc, t) => {
  const key = t.personal_finance_category?.primary ?? 'OTHER';
  acc[key] = (acc[key] ?? 0) + t.amount;
  return acc;
}, {});
const sorted = Object.entries(periodSpending).sort((a, b) => b[1] - a[1]);
const total  = sorted.reduce((s, [, v]) => s + v, 0);

// Top merchants — period-filtered, transfers excluded
const merchantMap = new Map<string, number>();
for (const t of periodExpenses) {
  const name = t.merchant_name ?? t.name;
  merchantMap.set(name, (merchantMap.get(name) ?? 0) + t.amount);
}
const topMerchants = [...merchantMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

// Spending by weekday — period-filtered, transfers excluded
const dayAmounts = DAYS.map((_, i) => {
  const jsDay = i === 6 ? 0 : i + 1;
  return periodExpenses
    .filter(t => new Date(t.date + 'T00:00:00').getDay() === jsDay)
    .reduce((s, t) => s + t.amount, 0);
});
```

**Also update** the `SpendingChart` call at ~L1520 to pass no prop change — it already receives `spending` but that comes from the BudgetClient scope. Update the call to pass `periodSpending` instead:
```tsx
<SpendingChart spending={periodSpending} />
```

---

## Step 9 — Update `net` / `netPositive` (L1281–1282)

**Remove:**
```ts
const net = totalIncome - totalSpent;
const netPositive = net >= 0;
```

**Replace with:**
```ts
const netPositive = savingsDollar >= 0;
```

Use `savingsDollar` and `Math.abs(savingsDollar)` wherever `net` / `Math.abs(net)` appeared.

---

## Step 10 — Update savings rate card display (L1374–1412)

**Remove:**
- `$` / `%` toggle buttons (the `savingsRateMode` controls)
- `"↑ / ↓ vs last month"` delta line (uses deleted `savings_rate_delta`)

**Replace savings rate card body with:**
```tsx
<p className="text-[9px] uppercase tracking-[0.1em] text-(--color-text-tertiary)">Savings Rate</p>
<p className={`font-(--font-display) text-[28px] font-bold leading-none mt-2 ${srColor}`}>
  {savingsRatePct === null ? '—' : `${savingsRatePct < 0 ? '-' : ''}${Math.abs(savingsRatePct).toFixed(1)}%`}
</p>
<p className={`text-[13px] font-(--font-mono) mt-1 ${srColor}`}>
  {savingsDollar < 0 ? '-' : ''}${formatMoney(Math.abs(savingsDollar))} / mo
</p>
<div className="flex gap-4 mt-3 pt-3 border-t border-(--color-border-subtle)">
  <div>
    <p className="text-[9px] uppercase tracking-[0.08em] text-(--color-text-tertiary) mb-0.5">Income (3-mo avg)</p>
    <p className="text-[14px] font-(--font-mono) text-(--color-text-primary)">${formatMoney(trailingIncome)}</p>
  </div>
  <div>
    <p className="text-[9px] uppercase tracking-[0.08em] text-(--color-text-tertiary) mb-0.5">Expenses ({period.charAt(0) + period.slice(1).toLowerCase()})</p>
    <p className="text-[14px] font-(--font-mono) text-(--color-text-primary)">${formatMoney(totalSpentPeriod)}</p>
  </div>
</div>
```

Update `srColor`:
```ts
const srColor = savingsDollar > 0 ? "text-(--color-success)" : savingsDollar < 0 ? "text-(--color-danger)" : "text-(--color-text-primary)";
```

---

## Step 11 — Update period pills (L1447–1459)

**Remove:** `(["7D", "30D", "90D", "YTD"] as const)`

**Replace with:**
```tsx
{(["DAY", "WEEK", "MONTH", "QUARTER", "YEAR"] as const).map((p) => (
  <button
    key={p}
    onClick={() => setPeriod(p)}
    className={`px-3 py-1 rounded-(--radius-pill) text-[11px] font-medium transition-colors ${
      period === p
        ? "bg-(--color-accent) text-(--color-base)"
        : "bg-(--color-overlay) text-(--color-text-secondary) hover:text-(--color-text-primary)"
    }`}
  >
    {p.charAt(0) + p.slice(1).toLowerCase()}
  </button>
))}
```

---

## Step 12 — Update Spent / Income stat cards in period section (L1461–1477)

**Remove:** References to `totalSpent` / `totalIncome` props in these cards.

**Replace:**
- SPENT card: `totalSpentPeriod`
- INCOME card: `trailingIncome` with label "Income (3-mo avg)"
- Net line: `savingsDollar` with "You're up / down $X this period"

---

## Step 13 — Update Investment Readiness references (L1587–1598)

**Replace:**
- `savings_rate_dollar` → `savingsDollar`
- `monthly_expenses` remains (already re-bound to `totalSpentPeriod` in Step 7)

---

## Downstream effects

| Consumer | Impact |
|---|---|
| `OverviewPanel` | Gets `spending` prop from BudgetClient scope (L1926) — **unchanged**, still unfiltered |
| Mobile header stat cards (L2239–2246) | Use `totalSpent` / `totalIncome` from BudgetClient scope — **unchanged** |
| `SpendingChart` in Analytics | Update call to pass `periodSpending` instead of `spending` prop |
| Investment Readiness section | `savings_rate_dollar` → `savingsDollar` |

---

## File change summary

| Location (approx) | Change |
|---|---|
| ~L1215 (before AnalyticsPanel) | Add `Period` type, `getPeriodRange`, exclusion constants |
| L1241 | `period` state type → `Period`, default `'MONTH'` |
| L1242 | Delete `savingsRateMode` state |
| L1261–1279 | Replace `sorted`/`total`/`merchantMap`/`topMerchants`/`dayAmounts` — source → `periodExpenses` |
| L1281–1282 | Replace `net`/`netPositive` → `savingsDollar` |
| L1284–1301 | Refactor `trailingAvgIncome` body — add `INCOME_CATEGORIES` filter |
| L1303–1324 | Delete `currentMonthExpenses` |
| L1326–1346 | Delete `prevMonthSavingsRate` |
| L1354–1359 | Replace derived values block with unified period block |
| ~L1366 | `srColor` → uses `savingsDollar` |
| L1374–1412 | Savings rate card — remove toggle + delta, show pct + dollar + period label |
| ~L1447–1459 | Period pills → DAY/WEEK/MONTH/QUARTER/YEAR |
| L1461–1477 | Stat cards → `totalSpentPeriod` / `trailingIncome` |
| ~L1520 | `SpendingChart` → `periodSpending` |
| ~L1587–1598 | Investment Readiness → `savingsDollar` |

---

## Definition of done
- [ ] `Period` type and `getPeriodRange` added
- [ ] `EXCLUDED_TRANSFER_CATEGORIES` and `INCOME_CATEGORIES` constants defined
- [ ] `period` state typed as `Period`, default `'MONTH'`
- [ ] `savingsRateMode` state deleted
- [ ] `trailingAvgIncome` refactored to filter by `INCOME_CATEGORIES` (kept, not deleted)
- [ ] `currentMonthExpenses` deleted
- [ ] `prevMonthSavingsRate` deleted
- [ ] All analytics values (`sorted`, `topMerchants`, `dayAmounts`) source from `periodExpenses`
- [ ] `SpendingChart` receives `periodSpending`
- [ ] Savings rate card shows pct + dollar, no toggle, no delta, "3-mo avg income" label
- [ ] Period pills show Day / Week / Month / Quarter / Year, default Month
- [ ] Stat cards use `totalSpentPeriod` / `trailingIncome`
- [ ] `npm run build` — 0 errors / 0 warnings
