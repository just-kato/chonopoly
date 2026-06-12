"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  UtensilsCrossed, Car, Film, ShoppingBag, House, HeartPulse,
  Sparkles, Plane, Zap, Wrench, TrendingUp, Banknote, Building2,
  CircleDot, ArrowDownLeft, ArrowUpRight, type LucideIcon,
} from "lucide-react";
import { formatDate, formatMoney, CATEGORY_META } from "./types";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed, Car, Film, ShoppingBag, House, HeartPulse,
  Sparkles, Plane, Zap, Wrench, TrendingUp, Banknote, Building2,
  CircleDot, ArrowDownLeft, ArrowUpRight,
};

function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name] ?? CircleDot;
}

interface BudgetRow {
  budget_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  total_limit: number;
  amount_spent: number;
  amount_remaining: number;
  daily_rate: number;
  over_budget: boolean;
  period_type: string;
  period_end: string;
  days_remaining: number;
  status: "active" | "paused";
}

interface SnapshotRow {
  date: string;
  daily_rate: number;
  amount_spent: number;
  remaining_after: number;
  days_remaining_after: number;
}

interface Props {
  budget: BudgetRow;
  onBack: () => void;
}

type Tab = "daily" | "weekly" | "monthly";

function isoWeekLabel(date: string): string {
  const d = new Date(date + "T00:00:00");
  const dow = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${formatDate(monday.toISOString().split("T")[0])} – ${formatDate(sunday.toISOString().split("T")[0])}`;
}

function monthLabel(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function BudgetDrillDown({ budget, onBack }: Props) {
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("daily");

  useEffect(() => {
    setSnapshotsLoading(true);
    setSnapshotsError(null);
    fetch(`/api/budget/snapshots?budget_id=${budget.budget_id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => { setSnapshots(d.snapshots ?? []); setSnapshotsLoading(false); })
      .catch(e => { setSnapshotsError(String(e)); setSnapshotsLoading(false); });
  }, [budget.budget_id]);

  const Icon = getCategoryIcon(budget.category_icon);
  const meta = CATEGORY_META[budget.category_icon] ?? CATEGORY_META["OTHER"];
  const percentUsed = budget.total_limit > 0 ? (budget.amount_spent / budget.total_limit) * 100 : 0;

  // snapshots are DESC — reverse for chronological order before deriving per-day spend
  const chronological = [...snapshots].reverse();

  const dailyRows = chronological.map((s, i) => {
    const prevAmountSpent = i === 0 ? 0 : chronological[i - 1].amount_spent;
    const spentThatDay = Math.max(0, s.amount_spent - prevAmountSpent);
    return { ...s, spent_that_day: spentThatDay };
  }).reverse(); // back to DESC for display

  const weeklyRows = (() => {
    const map = new Map<string, { label: string; total: number }>();
    for (const row of dailyRows) {
      const key = row.date.slice(0, 10);
      const weekKey = isoWeekLabel(key);
      const existing = map.get(weekKey);
      if (existing) {
        existing.total += row.spent_that_day;
      } else {
        map.set(weekKey, { label: weekKey, total: row.spent_that_day });
      }
    }
    return [...map.values()];
  })();

  const monthlyRows = (() => {
    if (budget.period_type !== "yearly") {
      const total = chronological.reduce((s, r, i) => {
        const prev = i === 0 ? 0 : chronological[i - 1].amount_spent;
        return s + Math.max(0, r.amount_spent - prev);
      }, 0);
      return [{ label: `${budget.period_type} period total`, total }];
    }
    const map = new Map<string, { label: string; total: number }>();
    for (const row of dailyRows) {
      const mKey = row.date.slice(0, 7);
      const label = monthLabel(row.date);
      const existing = map.get(mKey);
      if (existing) {
        existing.total += row.spent_that_day;
      } else {
        map.set(mKey, { label, total: row.spent_that_day });
      }
    }
    return [...map.values()];
  })();

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-[#7a7870] hover:text-white transition-colors"
      >
        <ChevronLeft size={15} />
        Back
      </button>

      {/* Header card */}
      <div className="bg-[#1e1e24] border border-[#2e2e38] rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: budget.category_color + "22", color: budget.category_color }}
          >
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-semibold">{budget.category_name}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/6 text-[#7a7870] capitalize">{budget.period_type}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${budget.status === "paused" ? "bg-white/6 text-[#55534e]" : "bg-emerald-500/10 text-emerald-400"}`}>
                {budget.status}
              </span>
            </div>

            <div className="mt-3">
              {budget.over_budget ? (
                <p className="text-2xl font-(--font-mono) font-semibold text-red-400">
                  ${formatMoney(budget.amount_spent - budget.total_limit)} over
                </p>
              ) : budget.status === "paused" ? (
                <p className="text-2xl font-(--font-mono) font-semibold text-[#55534e]">Paused</p>
              ) : (
                <p className="text-2xl font-(--font-mono) font-semibold">
                  ${formatMoney(budget.daily_rate)}<span className="text-base font-normal text-[#7a7870]">/day</span>
                </p>
              )}
              <p className="text-sm text-[#7a7870] mt-1">
                <span className={percentUsed >= 100 ? "text-red-400" : percentUsed >= 75 ? "text-yellow-400" : "text-white"}>
                  ${formatMoney(budget.amount_spent)}
                </span>
                <span className="text-[#55534e]"> spent of </span>
                ${formatMoney(budget.total_limit)}
              </p>
              <p className="text-xs text-[#55534e] mt-1">
                {budget.days_remaining === 0 ? "ends today" : `${budget.days_remaining}d left`}
                {" · ends "}{formatDate(budget.period_end)}
              </p>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-[#2e2e38] rounded-full overflow-hidden mt-3">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(percentUsed, 100)}%`,
                  background: percentUsed >= 100 ? "#ef4444" : percentUsed >= 75 ? "#eab308" : budget.category_color,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown section */}
      <div className="bg-[#1e1e24] border border-[#2e2e38] rounded-xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-[#2e2e38]">
          {(["daily", "weekly", "monthly"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${tab === t ? "text-white border-b-2 border-white -mb-px" : "text-[#7a7870] hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {snapshotsLoading && (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-[#1e1e24] rounded animate-pulse" />
            ))}
          </div>
        )}

        {snapshotsError && (
          <p className="px-4 py-6 text-sm text-red-400">{snapshotsError}</p>
        )}

        {!snapshotsLoading && !snapshotsError && snapshots.length === 0 && (
          <p className="px-4 py-8 text-sm text-[#7a7870] text-center leading-relaxed max-w-sm mx-auto">
            Snapshots are calculated nightly. Check back tomorrow for a day-by-day breakdown. Current figures shown above are calculated live.
          </p>
        )}

        {!snapshotsLoading && !snapshotsError && snapshots.length > 0 && (
          <div className="divide-y divide-[#2e2e38]">
            {tab === "daily" && dailyRows.map(row => (
              <div key={row.date} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-white">{formatDate(row.date)}</p>
                  <p className="text-[10px] text-[#55534e] mt-0.5">${formatMoney(row.daily_rate)}/day remaining pace</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-(--font-mono)">${formatMoney(row.spent_that_day)}</p>
                  <p className="text-[10px] text-[#55534e] mt-0.5">${formatMoney(row.remaining_after)} left</p>
                </div>
              </div>
            ))}

            {tab === "weekly" && weeklyRows.map((row, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <p className="text-xs text-white">{row.label}</p>
                <p className="text-sm font-(--font-mono)">${formatMoney(row.total)}</p>
              </div>
            ))}

            {tab === "monthly" && monthlyRows.map((row, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <p className="text-xs text-white">{row.label}</p>
                <p className="text-sm font-(--font-mono)">${formatMoney(row.total)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
