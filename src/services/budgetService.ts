import { createClient } from "@supabase/supabase-js";
import { sendBudgetWarningEmail, sendBudgetOverEmail } from "./notificationService";

const db = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// ─── Period helpers ───────────────────────────────────────────────────────────

export function getPeriodForDate(date: Date, payCycleStartDay: number): string {
  const day = date.getDate();
  let year = date.getFullYear();
  let month = date.getMonth();
  if (day < payCycleStartDay) {
    month -= 1;
    if (month < 0) { month = 11; year -= 1; }
  }
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function currentPeriod(payCycleStartDay: number): string {
  return getPeriodForDate(new Date(), payCycleStartDay);
}

function periodBounds(period: string, startDay: number): { start: string; end: string } {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(y, m - 1, startDay);
  const end = new Date(new Date(y, m, startDay).getTime() - 86_400_000);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(start), end: fmt(end) };
}

function prevPeriodKey(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getPayCycleStartDay(userId: string): Promise<number> {
  const { data } = await db()
    .from("profiles")
    .select("pay_cycle_start_day")
    .eq("id", userId)
    .single();
  return data?.pay_cycle_start_day ?? 1;
}

// ─── getBudgetSummary ─────────────────────────────────────────────────────────

export async function getBudgetSummary(userId: string, period: string) {
  const { data: budgets } = await db()
    .from("budgets")
    .select("id, monthly_limit, categories(name, color, icon)")
    .eq("user_id", userId);

  if (!budgets?.length) return [];

  const { data: periods } = await db()
    .from("budget_periods")
    .select("budget_id, effective_limit, amount_spent")
    .eq("user_id", userId)
    .eq("period", period);

  const periodMap = new Map((periods ?? []).map((p) => [p.budget_id, p]));

  return budgets.map((b) => {
    const cat = (Array.isArray(b.categories) ? b.categories[0] : b.categories) as
      | { name: string; color: string; icon: string }
      | null;
    const p = periodMap.get(b.id);
    const effectiveLimit = p?.effective_limit ?? b.monthly_limit;
    const amountSpent = p?.amount_spent ?? 0;
    const amountRemaining = Math.max(0, effectiveLimit - amountSpent);
    const percentUsed = effectiveLimit > 0 ? (amountSpent / effectiveLimit) * 100 : 0;

    return {
      budget_id: b.id,
      category_name: cat?.name ?? "Unknown",
      category_color: cat?.color ?? "#71717a",
      category_icon: cat?.icon ?? "📦",
      monthly_limit: b.monthly_limit,
      effective_limit: effectiveLimit,
      amount_spent: amountSpent,
      amount_remaining: amountRemaining,
      percent_used: Math.round(percentUsed * 10) / 10,
      over_budget: amountSpent > effectiveLimit,
      period,
    };
  });
}

// ─── recalculateBudgetPeriod ──────────────────────────────────────────────────

export async function recalculateBudgetPeriod(
  userId: string,
  categoryId: string,
  period: string
): Promise<void> {
  const startDay = await getPayCycleStartDay(userId);
  const { start, end } = periodBounds(period, startDay);

  const { data: txRows } = await db()
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("category_id", categoryId)
    .gte("date", start)
    .lte("date", end)
    .gt("amount", 0);

  const totalSpent = (txRows ?? []).reduce((s, t) => s + Number(t.amount), 0);

  const { data: budget } = await db()
    .from("budgets")
    .select("id, monthly_limit")
    .eq("user_id", userId)
    .eq("category_id", categoryId)
    .maybeSingle();

  if (!budget) return;

  const { data: existing } = await db()
    .from("budget_periods")
    .select("id, effective_limit, notified_80, notified_over")
    .eq("budget_id", budget.id)
    .eq("period", period)
    .maybeSingle();

  const effectiveLimit = existing?.effective_limit ?? budget.monthly_limit;

  const { data: upserted } = await db()
    .from("budget_periods")
    .upsert(
      {
        budget_id: budget.id,
        user_id: userId,
        period,
        effective_limit: effectiveLimit,
        amount_spent: totalSpent,
        notified_80: existing?.notified_80 ?? false,
        notified_over: existing?.notified_over ?? false,
      },
      { onConflict: "budget_id,period" }
    )
    .select()
    .single();

  if (!upserted) return;

  const pct = (upserted.amount_spent / upserted.effective_limit) * 100;
  const updates: Record<string, boolean> = {};

  const { data: authUser } = await db().auth.admin.getUserById(userId);
  const { data: profile } = await db()
    .from("profiles")
    .select("username, pay_cycle_start_day")
    .eq("id", userId)
    .single();
  const { data: budgetMeta } = await db()
    .from("budgets")
    .select("categories(name)")
    .eq("id", budget.id)
    .single();

  const user = {
    id: userId,
    email: authUser?.user?.email ?? "",
    username: profile?.username ?? null,
    pay_cycle_start_day: profile?.pay_cycle_start_day ?? 1,
  };

  const catName =
    ((budgetMeta?.categories as unknown) as { name: string } | null)?.name ?? "Budget";

  if (pct >= 80 && !upserted.notified_80) {
    sendBudgetWarningEmail(user, { ...budget, category: { name: catName }, period: upserted }, pct).catch(console.error);
    updates.notified_80 = true;
  }

  if (pct >= 100 && !upserted.notified_over) {
    sendBudgetOverEmail(
      user,
      { ...budget, category: { name: catName }, period: upserted },
      upserted.amount_spent - upserted.effective_limit
    ).catch(console.error);
    updates.notified_over = true;
  }

  if (Object.keys(updates).length > 0) {
    await db().from("budget_periods").update(updates).eq("id", upserted.id);
  }
}

// ─── rolloverBudgets ──────────────────────────────────────────────────────────

export async function rolloverBudgets(userId: string): Promise<void> {
  const startDay = await getPayCycleStartDay(userId);
  const period = currentPeriod(startDay);
  const prev = prevPeriodKey(period);

  const { data: budgets } = await db()
    .from("budgets")
    .select("id, monthly_limit, rollover_enabled")
    .eq("user_id", userId);

  for (const budget of budgets ?? []) {
    const { data: exists } = await db()
      .from("budget_periods")
      .select("id")
      .eq("budget_id", budget.id)
      .eq("period", period)
      .maybeSingle();

    if (exists) continue;

    let effectiveLimit = budget.monthly_limit;

    if (budget.rollover_enabled) {
      const { data: prevPeriod } = await db()
        .from("budget_periods")
        .select("effective_limit, amount_spent")
        .eq("budget_id", budget.id)
        .eq("period", prev)
        .maybeSingle();

      if (prevPeriod) {
        const unspent = Math.max(0, prevPeriod.effective_limit - prevPeriod.amount_spent);
        effectiveLimit = budget.monthly_limit + unspent;
      }
    }

    await db().from("budget_periods").insert({
      budget_id: budget.id,
      user_id: userId,
      period,
      effective_limit: effectiveLimit,
      amount_spent: 0,
    });
  }
}
