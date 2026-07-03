"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronRight,
  Receipt, Target, Wallet,
  UtensilsCrossed, Car, Film, ShoppingBag, House, HeartPulse,
  Sparkles, Plane, Zap, Wrench, TrendingUp, Banknote, Building2,
  CircleDot, ArrowDownLeft, ArrowUpRight, type LucideIcon,
} from "lucide-react";
import { ActiveContext, GoalSummary } from "@/lib/goals/types";
import { BudgetSummaryRow, ViewState, formatMoney } from "@/components/budget/types";
import { budgetRowStatus, computeVerdict, isPaidThisCycle } from "@/lib/budget/verdict";
import { cycleDueDates } from "@/lib/bills/cycle";
import type { Bill } from "@/components/bills/BillsWidget";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed, Car, Film, ShoppingBag, House, HeartPulse,
  Sparkles, Plane, Zap, Wrench, TrendingUp, Banknote, Building2,
  CircleDot, ArrowDownLeft, ArrowUpRight,
};

function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name] ?? CircleDot;
}

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function fmtDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

// Sun–Sat bounds for the week containing `today` (UTC)
function currentWeekBounds(today: Date): { weekStart: string; weekEnd: string } {
  const t = utcMidnight(today);
  const sunday = new Date(t);
  sunday.setUTCDate(t.getUTCDate() - t.getUTCDay());
  const saturday = new Date(sunday);
  saturday.setUTCDate(sunday.getUTCDate() + 6);
  return { weekStart: fmtDateStr(sunday), weekEnd: fmtDateStr(saturday) };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerdictBanner({ verdict }: { verdict: ReturnType<typeof computeVerdict> }) {
  if (verdict === "ok") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-(--color-success)/8 border border-(--color-success)/20" data-testid="verdict-banner">
        <CheckCircle2 size={16} className="text-(--color-success) shrink-0" />
        <p className="text-[13px] text-(--color-success) font-medium">All budgets and bills on track</p>
      </div>
    );
  }
  if (verdict === "attention") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-(--color-warning)/8 border border-(--color-warning)/20" data-testid="verdict-banner">
        <AlertTriangle size={16} className="text-(--color-warning) shrink-0" />
        <p className="text-[13px] text-(--color-warning) font-medium">You have overdue bills this cycle</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-(--color-danger)/8 border border-(--color-danger)/20" data-testid="verdict-banner">
      <AlertTriangle size={16} className="text-(--color-danger) shrink-0" />
      <p className="text-[13px] text-(--color-danger) font-medium">One or more budgets are over limit</p>
    </div>
  );
}

function BudgetStatusRow({
  row,
  onClick,
}: {
  row: BudgetSummaryRow;
  onClick: () => void;
}) {
  const status = budgetRowStatus(row);
  const barColor =
    status === "danger"   ? "var(--color-danger)"
    : status === "warning" ? "var(--color-warning)"
    : "var(--color-success)";
  const pctCapped = Math.min(row.percent_used, 100);
  const Icon = getCategoryIcon(row.category_icon);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-(--color-border-subtle)/40 transition-colors text-left"
      data-testid={`status-budget-row-${row.budget_id}`}
    >
      {/* Category icon */}
      <div
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
        style={{ background: row.category_color + "30", color: row.category_color }}
      >
        <Icon size={14} />
      </div>

      {/* Name + progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[13px] font-medium text-(--color-text-primary) truncate">
            {row.name ?? row.category_name}
          </p>
          <span
            className="text-[12px] font-(--font-mono) font-semibold shrink-0 ml-2"
            style={{ color: barColor }}
          >
            {Math.round(row.percent_used)}%
          </span>
        </div>
        <div className="h-[4px] bg-(--color-border-subtle) rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${pctCapped}%`, background: barColor }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-(--color-text-tertiary) font-(--font-mono)">
            ${formatMoney(row.amount_spent)} / ${formatMoney(row.effective_limit)}
          </span>
          <span className="text-[11px] text-(--color-text-tertiary) capitalize shrink-0 ml-2">
            {row.period_type}
          </span>
        </div>
      </div>

      <ChevronRight size={14} className="text-(--color-text-disabled) shrink-0" />
    </button>
  );
}

// ─── StatusPage ───────────────────────────────────────────────────────────────

interface StatusPageProps {
  activeContext: ActiveContext;
  goals: GoalSummary[];
  onManageAll: () => void;
  onBudgetDrillDown: (budget: BudgetSummaryRow) => void;
  onGoTo: (view: ViewState) => void;
}

export default function StatusPage({
  activeContext,
  goals,
  onManageAll,
  onBudgetDrillDown,
  onGoTo,
}: StatusPageProps) {
  const [budgets, setBudgets] = useState<BudgetSummaryRow[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/budget/summary").then(r => r.ok ? r.json() : { summaries: [] }),
      fetch(`/api/bills?context_type=${activeContext.type}&context_id=${activeContext.id}`)
        .then(r => r.ok ? r.json() : { bills: [] }),
    ]).then(([budgetData, billsData]) => {
      setBudgets((budgetData.summaries ?? []).filter((s: BudgetSummaryRow) => s.status === "active"));
      setBills(billsData.bills ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activeContext.type, activeContext.id]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse p-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-(--color-elevated)" />)}
      </div>
    );
  }

  const today = new Date();
  const verdict = computeVerdict(budgets, bills, today);

  // Sort: danger → warning → on-track, then by soonest period_end
  const sortedBudgets = [...budgets].sort((a, b) => {
    const order = { danger: 0, warning: 1, "on-track": 2 };
    const sa = order[budgetRowStatus(a)];
    const sb = order[budgetRowStatus(b)];
    if (sa !== sb) return sa - sb;
    return a.period_end.localeCompare(b.period_end);
  });

  // Bills due within current Sun–Sat week, unpaid (B4)
  const { weekStart, weekEnd } = currentWeekBounds(today);
  const billsDueThisWeek = bills.filter(bill => {
    if (isPaidThisCycle(bill)) return false;
    const { current } = cycleDueDates(bill, today);
    const ds = fmtDateStr(utcMidnight(current));
    return ds >= weekStart && ds <= weekEnd;
  });

  const hasBudgets = sortedBudgets.length > 0;
  const hasGoals = goals.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20 lg:pb-8" data-testid="status-page">
      {/* Verdict banner */}
      <VerdictBanner verdict={verdict} />

      {/* Budget rows */}
      <div className="bg-(--color-surface) border border-(--color-border-default) rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border-subtle)">
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-(--color-text-tertiary)" />
            <span className="text-[12px] font-semibold text-(--color-text-primary) uppercase tracking-[0.08em]">Budgets</span>
          </div>
          <button
            onClick={onManageAll}
            className="text-[12px] text-(--color-accent) hover:opacity-80 transition-opacity font-medium"
            data-testid="manage-all-btn"
          >
            Manage all
          </button>
        </div>

        {hasBudgets ? (
          <div className="divide-y divide-(--color-border-subtle)">
            {sortedBudgets.map(row => (
              <BudgetStatusRow
                key={row.budget_id}
                row={row}
                onClick={() => onBudgetDrillDown(row)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 px-6 text-center">
            <Wallet size={28} className="text-(--color-text-disabled) mb-3" />
            <p className="text-[14px] font-medium text-(--color-text-primary) mb-1">No budgets yet</p>
            <p className="text-[12px] text-(--color-text-tertiary) mb-4">Set a spending limit per category to start tracking.</p>
            <button
              onClick={onManageAll}
              className="px-4 py-2 text-[12px] font-semibold bg-(--color-accent) text-(--color-base) rounded-(--radius-md) hover:opacity-90 transition-opacity"
            >
              Create first budget
            </button>
          </div>
        )}
      </div>

      {/* Bills this week */}
      <button
        onClick={() => onGoTo("bills")}
        className="w-full flex items-center gap-3 bg-(--color-surface) border border-(--color-border-default) rounded-xl px-4 py-4 hover:bg-(--color-border-subtle)/30 transition-colors text-left"
        data-testid="bills-week-row"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-(--color-warning)/15">
          <Receipt size={14} className="text-(--color-warning)" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-(--color-text-primary)">Bills due this week</p>
          <p className="text-[11px] text-(--color-text-tertiary) mt-0.5">
            {billsDueThisWeek.length === 0
              ? "All caught up"
              : `${billsDueThisWeek.length} unpaid bill${billsDueThisWeek.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {billsDueThisWeek.length > 0 && (
          <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-(--color-warning)/15 text-(--color-warning)">
            {billsDueThisWeek.length}
          </span>
        )}
        <ChevronRight size={14} className="text-(--color-text-disabled) shrink-0" />
      </button>

      {/* Goals */}
      {hasGoals && (
        <div className="bg-(--color-surface) border border-(--color-border-default) rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border-subtle)">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-(--color-text-tertiary)" />
              <span className="text-[12px] font-semibold text-(--color-text-primary) uppercase tracking-[0.08em]">Goals</span>
            </div>
            <button
              onClick={() => onGoTo("goals")}
              className="text-[12px] text-(--color-accent) hover:opacity-80 transition-opacity font-medium"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-(--color-border-subtle)">
            {goals.slice(0, 4).map(goal => {
              const pct = Math.min(100, Math.round(goal.percent_complete));
              return (
                <div key={goal.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="text-[18px] shrink-0">{goal.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[13px] font-medium text-(--color-text-primary) truncate">{goal.name}</p>
                      <span className="text-[12px] font-(--font-mono) text-(--color-text-secondary) shrink-0 ml-2">{pct}%</span>
                    </div>
                    <div className="h-[4px] bg-(--color-border-subtle) rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-(--color-accent)"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {goal.target_date && (
                      <p className="text-[11px] text-(--color-text-disabled) mt-1">
                        Target: {new Date(goal.target_date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
