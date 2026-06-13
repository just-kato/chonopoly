"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2, Camera, Check, CheckCircle2, ChevronDown, Edit2,
  GripVertical, Lock, Plus, Shield, ShieldCheck, Sparkles, Target,
  TrendingUp, Trophy, Trash2, Wallet, X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PlaidConnectButton } from "@/components/budget/PlaidConnectButton";
import { getAvatarColors } from "@/lib/avatar";
import { updateProfile, uploadAvatar } from "@/lib/supabase/profile";
import { ActiveContext } from "@/lib/goals/types";
import { ViewState, formatMoney } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  email: string | null;
  onboarding_complete: boolean;
  pay_cycle_start_day: number;
  morning_report_enabled: boolean;
  dashboard_layout: string[] | null;
}

interface NetWorthData {
  net_worth: number;
  total_assets: number;
  total_debts: number;
}

interface PlaidAccount {
  plaid_account_id: string;
  account_name: string;
  account_subtype: string | null;
  current_balance: number;
  institution_name: string | null;
}

interface Dream {
  id: string;
  icon: string;
  title: string;
  description: string | null;
  goal_id: string | null;
  sort_order: number;
  goal?: { id: string; name: string; target_amount: number; current_balance: number } | null;
}

interface Milestone {
  id: string;
  milestone_key: string;
  earned_at: string;
}

interface GoalOption {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
}

interface BudgetSummary {
  status: string;
  percent_used: number;
}

interface Transaction {
  amount: number;
  personal_finance_category: { primary: string } | null;
  account_id: string;
}

interface PlaidAccountFull extends PlaidAccount {
  plaid_item_id: string;
}

interface BankGroup {
  itemId: string;
  institutionName: string | null;
  accounts: PlaidAccountFull[];
}

// ─── Milestone definitions ────────────────────────────────────────────────────

type MilestoneDef = { key: string; Icon: React.ComponentType<{ size?: number; className?: string }>; label: string; description: string };

const MILESTONE_DEFS: MilestoneDef[] = [
  { key: "bank_connected",           Icon: Building2,    label: "Bank connected",     description: "Linked your first bank account" },
  { key: "first_budget_created",     Icon: Wallet,       label: "First budget",       description: "Created your first spending budget" },
  { key: "first_goal_created",       Icon: Target,       label: "First goal",         description: "Set your first savings goal" },
  { key: "first_goal_achieved",      Icon: Trophy,       label: "Goal achieved",      description: "Reached a savings goal" },
  { key: "net_worth_positive",       Icon: TrendingUp,   label: "Net worth +",        description: "Your net worth turned positive" },
  { key: "emergency_fund_1mo",       Icon: Shield,       label: "1 mo cushion",       description: "Savings cover 1 month of expenses" },
  { key: "emergency_fund_3mo",       Icon: ShieldCheck,  label: "3 mo cushion",       description: "Savings cover 3 months of expenses" },
  { key: "first_month_under_budget", Icon: CheckCircle2, label: "Under budget",       description: "Finished a full month under budget" },
  { key: "zero_spend_day",           Icon: Sparkles,     label: "Zero spend day",     description: "A full day with no purchases" },
];

// ─── Health score helpers ─────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function computeHealthScore(
  transactions: Transaction[],
  budgets: BudgetSummary[],
  netWorth: NetWorthData | null,
  accounts: PlaidAccountFull[],
) {
  const debits = transactions.filter(t => t.amount > 0);
  const credits = transactions.filter(t => t.amount < 0);
  const totalSpent = debits.reduce((s, t) => s + t.amount, 0);
  const totalIncome = credits.reduce((s, t) => s + Math.abs(t.amount), 0);

  let savingsScore = 12;
  if (totalIncome > 0) {
    savingsScore = clamp(25 * (1 - totalSpent / totalIncome), 0, 25);
  }

  let dtiScore = 25;
  const totalDebts = netWorth?.total_debts ?? 0;
  const monthlyIncome = totalIncome;
  if (monthlyIncome > 0) {
    const dti = totalDebts / (monthlyIncome * 12);
    dtiScore = clamp(25 * (1 - dti / 0.5), 0, 25);
  }

  const savingsBalance = accounts
    .filter(a => a.account_subtype === "savings")
    .reduce((s, a) => s + a.current_balance, 0);
  const avgMonthlySpend = totalSpent > 0 ? totalSpent : 1;
  const monthsCovered = savingsBalance / avgMonthlySpend;
  const emergencyScore = clamp(25 * (monthsCovered / 6), 0, 25);

  const activeBudgets = budgets.filter(b => b.status === "active");
  let adherenceScore = 25;
  if (activeBudgets.length > 0) {
    const underCount = activeBudgets.filter(b => b.percent_used <= 100).length;
    adherenceScore = 25 * (underCount / activeBudgets.length);
  }

  const total = Math.round(savingsScore + dtiScore + emergencyScore + adherenceScore);
  return {
    total,
    components: [
      { label: "Savings rate",     score: Math.round(savingsScore),   max: 25 },
      { label: "Debt-to-income",   score: Math.round(dtiScore),       max: 25 },
      { label: "Emergency fund",   score: Math.round(emergencyScore), max: 25 },
      { label: "Budget adherence", score: Math.round(adherenceScore), max: 25 },
    ],
  };
}

function scoreColorClass(score: number) {
  if (score >= 70) return "text-(--color-success)";
  if (score >= 40) return "text-amber-400";
  return "text-(--color-danger)";
}

function scoreBarColor(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.7) return "var(--color-success)";
  if (pct >= 0.4) return "#f59e0b";
  return "var(--color-danger)";
}

// ─── Dream modal ──────────────────────────────────────────────────────────────

const EMOJI_OPTIONS = ["✨", "🏠", "🚗", "✈️", "🎓", "💍", "🌍", "🏖️", "🎸", "🐕", "🌱", "💻", "🍕", "⚽", "📚", "🎨", "🏋️", "🎯", "🚀", "💎"];

interface DreamModalProps {
  initial?: Dream;
  goals: GoalOption[];
  onSave: (d: { icon: string; title: string; description: string; goal_id: string | null }) => Promise<void>;
  onClose: () => void;
}

function DreamModal({ initial, goals, onSave, onClose }: DreamModalProps) {
  const [icon, setIcon] = useState(initial?.icon ?? "✨");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [goalId, setGoalId] = useState<string>(initial?.goal_id ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ icon, title: title.trim(), description: description.trim(), goal_id: goalId || null });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-(--color-surface) border border-(--color-border-default) rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{initial ? "Edit dream" : "Add a dream"}</p>
          <button onClick={onClose} className="text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors"><X size={15} /></button>
        </div>

        <div className="flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map(e => (
            <button
              key={e}
              onClick={() => setIcon(e)}
              className={`text-lg w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${icon === e ? "bg-(--color-accent)/20 ring-1 ring-(--color-accent)" : "hover:bg-(--color-border-subtle)"}`}
            >
              {e}
            </button>
          ))}
        </div>

        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Dream title"
          className="w-full bg-(--color-elevated) border border-(--color-border-default) rounded-[var(--radius-md)] px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-disabled) outline-none focus:border-(--color-accent)/50"
        />

        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full bg-(--color-elevated) border border-(--color-border-default) rounded-[var(--radius-md)] px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-disabled) outline-none focus:border-(--color-accent)/50 resize-none"
        />

        <select
          value={goalId}
          onChange={e => setGoalId(e.target.value)}
          className="w-full bg-(--color-elevated) border border-(--color-border-default) rounded-[var(--radius-md)] px-3 py-2 text-sm text-(--color-text-primary) outline-none focus:border-(--color-accent)/50"
        >
          <option value="">No linked goal</option>
          {goals.map(g => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>

        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="w-full py-2.5 text-sm font-semibold bg-white text-black rounded-xl hover:bg-white/90 disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving…" : initial ? "Save changes" : "Add dream"}
        </button>
      </div>
    </div>
  );
}

// ─── SortableCard ─────────────────────────────────────────────────────────────

interface SortableCardProps {
  id: string;
  gridColumn: string;
  children: React.ReactNode;
}

function SortableCard({ id, gridColumn, children }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    gridColumn,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    scale: isDragging ? "0.98" : undefined,
    cursor: isDragging ? "grabbing" : undefined,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/card">
      {/* Drag handle — visible on hover only */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 z-10 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-(--color-text-disabled) hover:text-(--color-text-secondary)"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>
      {children}
    </div>
  );
}

// ─── Card column spans ────────────────────────────────────────────────────────

const CARD_SPANS: Record<string, string> = {
  "net-worth":       "1 / 2",
  "financial-health":"2 / 4",
  "banks":           "1 / 2",
  "dreams":          "2 / 4",
};

// ─── Main component ───────────────────────────────────────────────────────────

interface ProfilePanelProps {
  activeContext: ActiveContext;
  onNavigate: (view: ViewState) => void;
}

export default function ProfilePanel({ activeContext, onNavigate }: ProfilePanelProps) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [netWorth, setNetWorth] = useState<NetWorthData | null>(null);
  const [accounts, setAccounts] = useState<PlaidAccountFull[]>([]);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [goalOptions, setGoalOptions] = useState<GoalOption[]>([]);
  const [budgetSummaries, setBudgetSummaries] = useState<BudgetSummary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Identity section state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emergencyFundChecked = useRef(false);

  // UI state
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [dreamModal, setDreamModal] = useState<{ mode: "add" } | { mode: "edit"; dream: Dream } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Drag-and-drop card order
  const DEFAULT_ORDER = ["net-worth", "financial-health", "banks", "dreams"];
  const [cardOrder, setCardOrder] = useState<string[]>(DEFAULT_ORDER);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const fetchAll = useCallback(async () => {
    const ctxParams = `context_type=${activeContext.type}&context_id=${activeContext.id}`;
    const [profileRes, nwRes, accountsRes, dreamsRes, milestonesRes, goalsRes, budgetsRes, txRes] = await Promise.all([
      fetch("/api/profile").then(r => r.ok ? r.json() : null),
      fetch(`/api/net-worth?${ctxParams}`).then(r => r.ok ? r.json() : null),
      fetch("/api/plaid/accounts").then(r => r.ok ? r.json() : null),
      fetch("/api/dreams").then(r => r.ok ? r.json() : null),
      fetch("/api/milestones").then(r => r.ok ? r.json() : null),
      fetch(`/api/goals/summary?${ctxParams}&context_type=personal&context_id=${activeContext.id}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/budget/summary?${ctxParams}`).then(r => r.ok ? r.json() : null),
      fetch("/api/plaid/transactions").then(r => r.ok ? r.json() : null),
    ]);

    if (profileRes) {
      setProfileData(profileRes);
      if (profileRes.dashboard_layout && Array.isArray(profileRes.dashboard_layout)) {
        setCardOrder(profileRes.dashboard_layout);
      }
    }
    if (nwRes) setNetWorth(nwRes);
    if (accountsRes?.accounts) setAccounts(accountsRes.accounts);
    if (dreamsRes?.dreams) setDreams(dreamsRes.dreams);
    if (milestonesRes?.milestones) setMilestones(milestonesRes.milestones);
    if (goalsRes?.goals) setGoalOptions(goalsRes.goals.map((g: GoalOption) => g));
    if (budgetsRes?.summaries) setBudgetSummaries(budgetsRes.summaries);
    if (txRes?.transactions) setTransactions(txRes.transactions);
  }, [activeContext.type, activeContext.id]);

  useEffect(() => {
    import("@/lib/supabase/profile").then(({ loadProfile }) => {
      loadProfile().then(p => {
        setAvatarUrl(p.avatar_url);
        setAvatarColor(p.avatar_color);
        setUsername(p.username ?? "");
        setNameInput(p.username ?? "");
      });
    });
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Emergency fund milestones — checked client-side once per mount (no plaid_accounts DB table)
  useEffect(() => {
    if (emergencyFundChecked.current) return;
    if (accounts.length === 0 || transactions.length === 0 || milestones.length === 0) return;
    emergencyFundChecked.current = true;

    const savingsBalance = accounts
      .filter(a => a.account_subtype === "savings")
      .reduce((s, a) => s + a.current_balance, 0);
    const monthlySpend = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    if (monthlySpend === 0) return;
    const monthsCovered = savingsBalance / monthlySpend;
    const earnedSet = new Set(milestones.map(m => m.milestone_key));
    const toCheck: string[] = [];
    if (!earnedSet.has("emergency_fund_1mo") && monthsCovered >= 1) toCheck.push("emergency_fund_1mo");
    if (!earnedSet.has("emergency_fund_3mo") && monthsCovered >= 3) toCheck.push("emergency_fund_3mo");

    if (toCheck.length === 0) return;
    Promise.all(toCheck.map(key =>
      fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_key: key }),
      })
    )).then(() => fetchAll()).catch(() => null);
  }, [accounts, transactions, milestones, fetchAll]);

  // Debounced save of card order to Supabase
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboard_layout: cardOrder }),
      });
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [cardOrder]);

  // ─── Identity handlers ────────────────────────────────────────────────────

  async function saveName() {
    setNameSaving(true);
    await updateProfile({ username: nameInput });
    setUsername(nameInput);
    setEditingName(false);
    setNameSaving(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { url } = await uploadAvatar(file);
    if (url) setAvatarUrl(url);
  }

  // ─── Profile settings ─────────────────────────────────────────────────────

  async function patchProfile(fields: Record<string, unknown>) {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    setProfileData(prev => prev ? { ...prev, ...fields } as ProfileData : prev);
  }

  // ─── Bank handlers ────────────────────────────────────────────────────────

  async function removeBank(itemId: string) {
    await fetch("/api/plaid/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId }),
    });
    setAccounts(prev => prev.filter(a => a.plaid_item_id !== itemId));
    setRemoveConfirm(null);
  }

  // ─── Dreams handlers ──────────────────────────────────────────────────────

  async function addDream(d: { icon: string; title: string; description: string; goal_id: string | null }) {
    await fetch("/api/dreams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    const res = await fetch("/api/dreams");
    if (res.ok) { const data = await res.json(); setDreams(data.dreams); }
  }

  async function editDream(id: string, d: { icon: string; title: string; description: string; goal_id: string | null }) {
    await fetch(`/api/dreams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    const res = await fetch("/api/dreams");
    if (res.ok) { const data = await res.json(); setDreams(data.dreams); }
  }

  async function deleteDream(id: string) {
    await fetch(`/api/dreams/${id}`, { method: "DELETE" });
    setDreams(prev => prev.filter(d => d.id !== id));
    setDeleteConfirmId(null);
  }

  // ─── Drag end ─────────────────────────────────────────────────────────────

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCardOrder(prev => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const bankGroups = accounts.reduce<BankGroup[]>((acc, a) => {
    const existing = acc.find(g => g.itemId === a.plaid_item_id);
    if (existing) { existing.accounts.push(a); }
    else { acc.push({ itemId: a.plaid_item_id, institutionName: a.institution_name, accounts: [a] }); }
    return acc;
  }, []);

  const healthScore = computeHealthScore(transactions, budgetSummaries, netWorth, accounts);
  const earnedKeys = new Set(milestones.map(m => m.milestone_key));
  const c = getAvatarColors(avatarColor);
  const initials = username ? username.slice(0, 2).toUpperCase() : "··";

  // ─── Card renderers ───────────────────────────────────────────────────────

  function renderNetWorth() {
    return (
      <div
        onClick={() => onNavigate("debts")}
        className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] cursor-pointer hover:border-[var(--color-border-strong)] transition-colors h-full"
        data-testid="profile-net-worth"
      >
        <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-tertiary)] mb-1">Net Worth</p>
        <p className={`font-[var(--font-display)] text-[28px] leading-none font-bold ${(netWorth?.net_worth ?? 0) >= 0 ? "text-(--color-success)" : "text-(--color-danger)"}`}>
          {netWorth
            ? `${netWorth.net_worth < 0 ? "-" : ""}$${formatMoney(Math.abs(netWorth.net_worth))}`
            : "—"
          }
        </p>
        <p className="text-[11px] font-[var(--font-mono)] text-[var(--color-text-secondary)] mt-2">
          Assets ${formatMoney(netWorth?.total_assets ?? 0)} · Debts ${formatMoney(netWorth?.total_debts ?? 0)}
        </p>
      </div>
    );
  }

  function renderFinancialHealth() {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] h-full">
        <p className="text-[9px] uppercase tracking-widest text-(--color-text-tertiary) mb-3">Financial Health</p>
        <div className="flex gap-6">
          <div className="flex flex-col justify-center flex-shrink-0 w-24">
            <p
              className={`font-[var(--font-display)] text-[52px] leading-none font-bold ${scoreColorClass(healthScore.total)}`}
              data-testid="health-score"
            >
              {healthScore.total}
            </p>
            <p className="text-[11px] text-[var(--color-text-disabled)] font-[var(--font-mono)]">/100</p>
          </div>
          <div className="flex flex-col justify-center gap-2 flex-1">
            {healthScore.components.map(comp => (
              <div key={comp.label} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--color-text-secondary)] w-28 flex-shrink-0">{comp.label}</span>
                <div className="flex-1 h-[3px] bg-[var(--color-border-subtle)] rounded-full">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${(comp.score / comp.max) * 100}%`, background: scoreBarColor(comp.score, comp.max) }}
                  />
                </div>
                <span className="text-[10px] font-[var(--font-mono)] text-[var(--color-text-tertiary)] w-8 text-right">{comp.score}/{comp.max}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderBanks() {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">Connected Banks</p>
          <PlaidConnectButton onSuccess={fetchAll} />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3" style={{ maxHeight: 160 }}>
          {bankGroups.length === 0 && (
            <p className="text-[12px] text-[var(--color-text-tertiary)]">No banks connected yet.</p>
          )}
          {bankGroups.map(group => (
            <div key={group.itemId} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-[var(--color-text-primary)]">{group.institutionName ?? "Bank"}</p>
                {removeConfirm === group.itemId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">Remove?</span>
                    <button onClick={() => removeBank(group.itemId)} className="text-[11px] text-red-400 hover:text-red-300 font-medium">Yes</button>
                    <button onClick={() => setRemoveConfirm(null)} className="text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">No</button>
                  </div>
                ) : (
                  <button onClick={() => setRemoveConfirm(group.itemId)} className="text-[11px] text-[var(--color-text-tertiary)] hover:text-red-400 transition-colors flex items-center gap-1">
                    <Trash2 size={10} />
                    Remove
                  </button>
                )}
              </div>
              {group.accounts.map(a => (
                <div key={a.plaid_account_id} className="flex items-center justify-between pl-3 py-0.5 border-l border-[var(--color-border-subtle)]">
                  <span className="text-[11px] font-[var(--font-mono)] text-[var(--color-text-secondary)]">{a.account_name}</span>
                  <span className="text-[11px] font-[var(--font-mono)] text-[var(--color-text-tertiary)]">${formatMoney(a.current_balance)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderDreams() {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">Dreams</p>
          <button
            onClick={() => setDreamModal({ mode: "add" })}
            className="flex items-center gap-1 text-[11px] text-[var(--color-accent)] hover:opacity-80 transition-opacity font-medium"
          >
            <Plus size={11} />
            Add
          </button>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 160 }}>
          {dreams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <span className="text-[32px]">✨</span>
              <p className="text-[13px] font-[var(--font-display)] text-[var(--color-text-primary)]">What are you working toward?</p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">Add a dream and link it to a savings goal</p>
            </div>
          ) : (
            <div className="space-y-1">
              {dreams.map(dream => (
                <div key={dream.id} className="flex items-center gap-3 p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-elevated)] transition-colors group">
                  <span className="text-[22px] flex-shrink-0">{dream.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">{dream.title}</p>
                    {dream.goal && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-[2px] bg-[var(--color-border-subtle)] rounded-full max-w-[80px]">
                          <div
                            className="h-full rounded-full bg-[var(--color-accent)]"
                            style={{ width: `${Math.min(100, (dream.goal.current_balance / dream.goal.target_amount) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-[var(--font-mono)] text-[var(--color-text-tertiary)]">
                          {Math.round((dream.goal.current_balance / dream.goal.target_amount) * 100)}% saved
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0">
                    <button onClick={() => setDreamModal({ mode: "edit", dream })} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors p-1">
                      <Edit2 size={11} />
                    </button>
                    {deleteConfirmId === dream.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteDream(dream.id)} className="text-red-400 hover:text-red-300 text-[11px] font-medium">Del</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="text-[var(--color-text-tertiary)] text-[11px]">×</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(dream.id)} className="text-[var(--color-text-tertiary)] hover:text-red-400 transition-colors p-1">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const cardRenderers: Record<string, () => React.ReactNode> = {
    "net-worth":        renderNetWorth,
    "financial-health": renderFinancialHealth,
    "banks":            renderBanks,
    "dreams":           renderDreams,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 profile-bento-grid"
      style={{
        display: "grid",
        /* gridTemplateColumns was repeat(3, minmax(0, 1fr)) — moved to Tailwind responsive classes above */
        gridAutoRows: "auto",
        gap: "12px",
        padding: "20px",
        alignContent: "start",
      }}
    >
      {/* ── Identity — locked, always row 1 ─────────────────────────────── */}
      <div
        style={{ gridColumn: "1 / -1" }}
        className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] px-5 py-3 flex items-center flex-wrap gap-x-4 gap-y-3 shadow-(--shadow-sm)"
      >
        <p className="text-[9px] uppercase tracking-widest text-(--color-text-tertiary) shrink-0">Identity</p>
        {/* Avatar 36px */}
        <div className="relative flex-shrink-0">
          <div className={`w-9 h-9 rounded-full border overflow-hidden flex items-center justify-center ${c.bg} ${c.border}`}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className={`${c.text} font-[var(--font-mono)] font-bold text-xs`}>{initials}</span>
            }
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--color-elevated)] border border-[var(--color-border-default)] flex items-center justify-center hover:bg-[var(--color-border-subtle)] transition-colors"
          >
            <Camera size={8} className="text-[var(--color-text-secondary)]" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>

        {/* Name + email */}
        <div className="flex flex-col gap-0.5 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                className="bg-[var(--color-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-2 py-1 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50 w-36"
              />
              <button onClick={saveName} disabled={nameSaving} className="text-[var(--color-success)] hover:opacity-80 disabled:opacity-40"><Check size={13} /></button>
              <button onClick={() => setEditingName(false)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"><X size={12} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{username || "—"}</p>
              <button onClick={() => { setNameInput(username); setEditingName(true); }} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors flex-shrink-0">
                <Edit2 size={10} />
              </button>
            </div>
          )}
          {profileData?.email && (
            <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">{profileData.email}</p>
          )}
        </div>

        <div className="flex-1" />

        {/* Pay cycle inline */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-[var(--color-text-tertiary)]">Pay cycle</span>
          <select
            value={profileData?.pay_cycle_start_day ?? 1}
            onChange={e => patchProfile({ pay_cycle_start_day: Number(e.target.value) })}
            className="bg-[var(--color-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-2 py-1 text-[12px] text-[var(--color-text-primary)] outline-none"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Morning report inline */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-[var(--color-text-tertiary)]">Morning report</span>
          <button
            onClick={() => patchProfile({ morning_report_enabled: !profileData?.morning_report_enabled })}
            className={`relative w-8 h-4 rounded-full transition-colors ${profileData?.morning_report_enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-default)]"}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${profileData?.morning_report_enabled ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* ── Draggable cards ──────────────────────────────────────────────── */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
          {cardOrder.map(id => (
            <SortableCard key={id} id={id} gridColumn={CARD_SPANS[id] ?? "auto"}>
              {cardRenderers[id]?.()}
            </SortableCard>
          ))}
        </SortableContext>
      </DndContext>

      {/* ── Milestones — locked, always last row ─────────────────────────── */}
      <div
        style={{ gridColumn: "1 / -1" }}
        className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow-sm)]"
      >
        <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-tertiary)] mb-3">Milestones</p>
        <div className="flex gap-4 overflow-x-auto pb-1">
          {MILESTONE_DEFS.map(def => {
            const earned = milestones.find(m => m.milestone_key === def.key);
            const { Icon } = def;
            return (
              <div
                key={def.key}
                title={def.description}
                className="flex flex-col items-center gap-1 flex-shrink-0 w-[60px]"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${earned ? "bg-[var(--color-accent)]/15" : "bg-[var(--color-elevated)] grayscale"}`}>
                  <Icon
                    size={16}
                    className={earned ? "text-[var(--color-accent)]" : "text-[var(--color-text-disabled)]"}
                  />
                </div>
                <p className={`text-[8px] text-center leading-tight ${earned ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-disabled)] opacity-40"}`}>
                  {def.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Dream modal ──────────────────────────────────────────────────── */}
      {dreamModal && (
        <DreamModal
          initial={dreamModal.mode === "edit" ? dreamModal.dream : undefined}
          goals={goalOptions}
          onSave={dreamModal.mode === "add"
            ? addDream
            : (d) => editDream(dreamModal.dream.id, d)
          }
          onClose={() => setDreamModal(null)}
        />
      )}
    </div>
  );
}
