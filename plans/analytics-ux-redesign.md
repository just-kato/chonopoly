# Plan: Analytics Page — UX Redesign & Label Clarity

## Scope
Labels and layout only — no calculation logic changes, no chart component changes, no API changes.
All changes inside `components/BudgetClient.tsx`, `AnalyticsPanel` function only.
Mobile/desktop: doc says wrap mobile changes in `lg:hidden` / `hidden lg:block` as needed — but all current Analytics content is desktop-only (the panel is gated behind `connected.length > 0 && !loading`). No mobile-specific wrapping needed for this pass.

---

## Step 1 — Add `formatDateRange` helper

**Location:** After `getPeriodRange` function (~L1260), before `EXCLUDED_TRANSFER_CATEGORIES`.

**Add:**
```ts
function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', opts);
  const endStr   = end.toLocaleDateString('en-US', opts);
  const year     = end.getFullYear();
  if (startStr === endStr) return `${startStr}, ${year}`;
  return `${startStr} – ${endStr}, ${year}`;
}
```

---

## Step 2 — Savings rate card (Row 1 Left, ~L1394–1440)

**Current:**
- Eyebrow: "Savings Rate"
- Hero: `XX.X%` (just the pct)
- Sub: `$X / mo` in color
- Footer: "Income (3-mo avg)" + "Expenses (Month)"

**New layout:**
```tsx
<p className="text-[10px] uppercase tracking-[0.1em] text-(--color-text-tertiary)">Are you saving money?</p>

{/* Hero — pct + dollar together */}
<div className="flex items-baseline gap-3 mt-2">
  <p className={`font-(--font-display) text-[48px] font-bold leading-none ${srColor}`}>
    {savingsRatePct === null ? '—' : `${savingsRatePct < 0 ? '-' : ''}${Math.abs(savingsRatePct).toFixed(1)}%`}
  </p>
  <p className={`text-[20px] font-(--font-mono) leading-none ${srColor}`}>
    {savingsDollar >= 0 ? '+' : '−'}${formatMoney(Math.abs(savingsDollar))}/mo
  </p>
</div>

<p className="text-[12px] text-(--color-text-secondary) mt-1">
  of your income saved {period === 'MONTH' ? 'this month' : period === 'WEEK' ? 'this week' : period === 'DAY' ? 'today' : `this ${period.charAt(0) + period.slice(1).toLowerCase()}`}
</p>

<div className="flex gap-6 mt-4 pt-4 border-t border-(--color-border-subtle)">
  <div>
    <p className="text-[10px] uppercase tracking-[0.08em] text-(--color-text-tertiary) mb-0.5">Avg Monthly Income</p>
    <p className="text-[16px] font-(--font-mono) text-(--color-text-primary)">${formatMoney(trailingIncome)}</p>
    <p className="text-[10px] text-(--color-text-tertiary) mt-0.5">3-month average · varies monthly</p>
  </div>
  <div>
    <p className="text-[10px] uppercase tracking-[0.08em] text-(--color-text-tertiary) mb-0.5">
      {period === 'MONTH' ? 'This Month' : period === 'WEEK' ? 'This Week' : period === 'DAY' ? 'Today' : `This ${period.charAt(0) + period.slice(1).toLowerCase()}`} Expenses
    </p>
    <p className="text-[16px] font-(--font-mono) text-(--color-text-primary)">${formatMoney(totalSpentPeriod)}</p>
    <p className="text-[10px] text-(--color-text-tertiary) mt-0.5">transfers not included</p>
  </div>
</div>
```

---

## Step 3 — Period pills + date range display (~L1460–1495)

**Current:** Pills only, no date range shown.

**Add** date range + transaction count below the pills:
```tsx
<p className="text-[11px] text-(--color-text-tertiary) mt-2">
  {formatDateRange(start, end)} · {periodExpenses.length} transaction{periodExpenses.length !== 1 ? 's' : ''}
</p>
```

**Also remove** the "You're up / down $X this period" net line below the stat cards — this duplicates the savings rate hero. Replace with nothing (just delete the `<p>` block).

---

## Step 4 — Stat card labels (~L1475–1488)

**Current:**
- "SPENT" → `totalSpentPeriod`
- "Income (3-mo avg)" → `trailingIncome`

**New labels:**
- `SPENT ({periodLabel})` where `periodLabel` = "Today" / "This Week" / "This Month" / "This Quarter" / "This Year"
- `AVG MONTHLY INCOME` — static, since it's always 3-month trailing

**Helper inline:** `const periodLabel = period === 'DAY' ? 'Today' : period === 'WEEK' ? 'This Week' : period === 'MONTH' ? 'This Month' : period === 'QUARTER' ? 'This Quarter' : 'This Year'`

Add this const just before the `return` statement in `AnalyticsPanel`.

---

## Step 5 — Section headers

| Section | Current header | New header |
|---|---|---|
| Col 1 "By Category" | `By category` | `Where your money went` |
| Col 3 "Top Merchants" | `Top merchants` | `Top merchants this {periodLabel.toLowerCase()}` (e.g. "Top merchants this month") |
| Row 4 "Spending by Day" | `Spending by day` | `Spending by day of week` |

---

## Step 6 — Investable Assets card subtitle (~L1437–1460)

**Current:** "You can responsibly invest $X today" / "Build your reserve — $X short"

**Add** explicit calculation breakdown below the existing description:
```tsx
<p className="text-[11px] text-(--color-text-tertiary) mt-1">
  ${formatMoney(liquid_assets)} liquid − ${formatMoney(required_reserve)} reserve (3 × ${formatMoney(monthly_expenses)}/mo)
</p>
```

The existing description line stays. This adds a second line showing the math.

---

## File change summary

| Location (approx) | Change |
|---|---|
| ~L1260 (after `getPeriodRange`) | Add `formatDateRange` helper |
| ~L1388 (before `return`) | Add `periodLabel` const |
| L1394–1440 (savings rate card) | New layout — hero pct+dollar, explanatory labels, 3-mo avg note |
| ~L1437 (investable assets) | Add calculation breakdown line |
| ~L1460–1462 (period pills) | Add date range + transaction count below pills |
| ~L1465–1495 (stat cards + net line) | Update labels; remove net "You're up/down" line |
| ~L1501 (By Category header) | "By category" → "Where your money went" |
| ~L1533 (Top Merchants header) | "Top merchants" → "Top merchants this {period}" |
| ~L1569 (Spending by day header) | "Spending by day" → "Spending by day of week" |

---

## What is NOT changed
- `srColor`, `invColor`, calculation logic, chart components
- `calcLiquidAssets`, `trailingAvgIncome`, `getPeriodRange`, exclusion constants
- Investable assets math
- Investment Readiness section (Row 5) — already well labeled per doc
- TrendCharts (Row 6)

---

## Definition of done
- [ ] `formatDateRange` added
- [ ] `periodLabel` const added
- [ ] Savings rate card: eyebrow "Are you saving money?", hero 48px pct + 20px dollar side-by-side, explanatory sub-label, footer with "3-month average · varies monthly" + "transfers not included"
- [ ] Date range + transaction count shown below period pills
- [ ] "You're up/down $X this period" net line removed
- [ ] Stat card labels updated: `SPENT (This Month)` + `AVG MONTHLY INCOME`
- [ ] Section headers updated: "Where your money went", "Top merchants this month", "Spending by day of week"
- [ ] Investable assets calculation breakdown added
- [ ] `npm run build` — 0 errors / 0 warnings
