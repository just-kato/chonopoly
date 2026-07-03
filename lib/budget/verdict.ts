// Pure verdict functions for the Manage → Status page.
// All date math uses UTC midnights (B5), consistent with the budget system.

import { cycleDueDates } from "@/lib/bills/cycle";
import type { BudgetSummaryRow } from "@/components/budget/types";
import type { Bill } from "@/components/bills/BillsWidget";

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Extracted from BillsPanel.tsx:24 — single source of truth (A1).
// UTC-based per B5; BillsPanel imports this instead of defining its own copy.
// B3 pair alignment:
//   monthly  — "this cycle" = current UTC calendar month (matches current = this month's due_day)
//   weekly   — "this cycle" = within last 7 days (covers any payment on/after current = last due weekday)
//   yearly   — "this cycle" = current UTC calendar year (matches current = this year's Jan due_day)
//   one-time — paid once → forever paid (no cycle concept)
export function isPaidThisCycle(bill: Pick<Bill, "last_paid_at" | "recurrence">): boolean {
  if (!bill.last_paid_at) return false;
  const paid = new Date(bill.last_paid_at);
  const now  = new Date();
  if (bill.recurrence === "monthly")
    return paid.getUTCFullYear() === now.getUTCFullYear() && paid.getUTCMonth() === now.getUTCMonth();
  if (bill.recurrence === "weekly")
    return (now.getTime() - paid.getTime()) / 86_400_000 < 7;
  if (bill.recurrence === "yearly")
    return paid.getUTCFullYear() === now.getUTCFullYear();
  return !!bill.last_paid_at;
}

// Fraction of the budget period that has elapsed, clamped to [0, 1].
export function calcElapsedFraction(row: BudgetSummaryRow, today: Date): number {
  const t     = utcMidnight(today);
  const start = new Date(row.period_start + "T00:00:00Z");
  const end   = new Date(row.period_end   + "T00:00:00Z");
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (t.getTime() - start.getTime()) / total));
}

export type BudgetStatus = "on-track" | "warning" | "danger";

export function budgetRowStatus(row: BudgetSummaryRow): BudgetStatus {
  if (row.over_budget || row.percent_used >= 100) return "danger";
  if (row.percent_used >= 80) return "warning";
  return "on-track";
}

export type Verdict = "ok" | "attention" | "critical";

// Overall verdict for the status banner.
// "critical" = any budget over limit (B4: banner escalates on overdue only — over-budget is overdue spend).
// "attention" = any bill whose current-cycle due date has passed and is unpaid, subject to containment below.
// "ok"       = all clear.
export function computeVerdict(budgets: BudgetSummaryRow[], bills: Bill[], today: Date): Verdict {
  if (budgets.some(b => b.over_budget)) return "critical";
  const t = utcMidnight(today);
  const hasOverdueBill = bills.some(bill => {
    if (isPaidThisCycle(bill)) return false;
    const { current } = cycleDueDates(bill, today);
    if (current >= t) return false; // not yet past due this cycle

    // Containment for known schema limitations — real fix is a due_date schema change (parked).
    // "one-time": due_day rolls to the current month each month, so the bill appears perpetually
    //   overdue after its first due_day passes. Exclude from banner; row-level styling still fires.
    if (bill.recurrence === "one-time") return false;
    // "yearly": due_day encodes day-of-January only, so the bill stays "past due" for ~11 months.
    //   Cap banner escalation at 30 days after the current-cycle due date.
    if (bill.recurrence === "yearly") {
      return (t.getTime() - current.getTime()) / 86_400_000 <= 30;
    }
    // monthly and weekly: genuinely new obligations each cycle — escalate uncapped.
    return true;
  });
  if (hasOverdueBill) return "attention";
  return "ok";
}
