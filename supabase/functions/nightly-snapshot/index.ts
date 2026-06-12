// Edge function — nightly budget snapshot writer
// Schedule: 11:55 PM UTC daily via pg_cron (registered in step5 migration)
// Deploy: supabase functions deploy nightly-snapshot

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM     = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@parkhawkinsproperties.com";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
}

function groupByCategory(
  txs: { merchant_name: string | null; amount: number; category_primary: string | null }[]
): { category: string; total: number; transactions: { merchant: string; amount: number }[] }[] {
  const map = new Map<string, { total: number; transactions: { merchant: string; amount: number }[] }>();
  for (const tx of txs) {
    const cat = tx.category_primary ?? "OTHER";
    if (!map.has(cat)) map.set(cat, { total: 0, transactions: [] });
    const entry = map.get(cat)!;
    entry.total += tx.amount;
    entry.transactions.push({ merchant: tx.merchant_name ?? "Unknown", amount: tx.amount });
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);
}

function buildMorningReportHtml(
  grouped: { category: string; total: number; transactions: { merchant: string; amount: number }[] }[],
  totalSpent: number,
  date: string,
  name: string,
  goalName?: string
): string {
  let body: string;
  if (totalSpent > 0) {
    const rows = grouped.map(g =>
      `<tr style="border-top:1px solid #e5e7eb;">
         <td style="padding:8px 0; color:#555; font-size:13px;">${g.category}</td>
         <td style="text-align:right; font-weight:600;">${fmt(g.total)}</td>
       </tr>
       ${g.transactions.map(t =>
         `<tr>
            <td style="padding:2px 0 2px 16px; color:#9ca3af; font-size:12px;">${t.merchant}</td>
            <td style="text-align:right; color:#9ca3af; font-size:12px;">${fmt(t.amount)}</td>
          </tr>`
       ).join("")}`
    ).join("");
    body = `
      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        ${rows}
        <tr style="border-top:2px solid #111;">
          <td style="padding:8px 0; font-weight:600;">Total spent</td>
          <td style="text-align:right; font-weight:700;">${fmt(totalSpent)}</td>
        </tr>
      </table>`;
  } else {
    const goalLine = goalName
      ? `Every dollar saved gets you closer to <strong>${goalName}</strong>.`
      : `A good day for your wallet.`;
    body = `<p style="font-size:24px; margin:16px 0;">🎉</p><p>${goalLine}</p>`;
  }
  return `
    <div style="font-family:sans-serif; max-width:480px; margin:0 auto; color:#111;">
      <p>Hey ${name},</p>
      ${body}
      <p style="margin-top:24px;">
        <a href="https://chonopoly.vercel.app/finances" style="color:#00d4aa;">Open your finances →</a>
      </p>
      <p style="color:#9ca3af; font-size:12px; margin-top:16px;">Park Hawkins Properties · Finance Tracker</p>
    </div>`;
}

Deno.serve(async () => {
  const today = new Date().toISOString().split("T")[0];

  // ── 1. All active budgets covering today ──────────────────────────────────
  const { data: budgets, error: budgetsErr } = await db
    .from("budgets")
    .select("id, goal_id, owner_id, owner_type, category_id, period_start, period_end, total_limit")
    .eq("status", "active")
    .lte("period_start", today)
    .gte("period_end", today);

  if (budgetsErr) {
    console.error("[nightly-snapshot] failed to fetch budgets:", budgetsErr.message);
    return new Response(JSON.stringify({ error: budgetsErr.message }), { status: 500 });
  }
  if (!budgets?.length) {
    console.log("[nightly-snapshot] no active budgets today");
    return new Response(JSON.stringify({ ok: true, processed: 0 }));
  }

  const budgetIds = budgets.map(b => b.id);
  const goalIds   = [...new Set(budgets.map(b => b.goal_id))];

  // ── 2. goal_accounts batch — which Plaid accounts belong to each goal ────
  // Only spending accounts are watched for transaction attribution
  const { data: goalAccountRows } = await db
    .from("goal_accounts")
    .select("goal_id, plaid_account_id")
    .in("goal_id", goalIds)
    .eq("account_role", "spending");

  const goalAccountMap = new Map<string, Set<string>>();
  for (const row of goalAccountRows ?? []) {
    if (!goalAccountMap.has(row.goal_id)) goalAccountMap.set(row.goal_id, new Set());
    goalAccountMap.get(row.goal_id)!.add(row.plaid_account_id);
  }

  const allLinkedAccountIds = [...new Set((goalAccountRows ?? []).map(r => r.plaid_account_id))];

  // ── 3. Transactions — period-to-date across all linked accounts ───────────
  const queryStart = budgets.map(b => b.period_start).reduce((a, b) => (a < b ? a : b));

  const { data: txRows } = await db
    .from("plaid_transactions")
    .select("plaid_account_id, category_primary, amount, date")
    .in("plaid_account_id", allLinkedAccountIds)
    .gte("date", queryStart)
    .lte("date", today)
    .eq("pending", false)
    .gt("amount", 0);

  const allTx = txRows ?? [];

  // ── 4. Most recent prior snapshot per budget (carry forward notified state) ─
  const { data: prevSnapshotRows } = await db
    .from("budget_daily_snapshots")
    .select("budget_id, notified_80, notified_over")
    .in("budget_id", budgetIds)
    .lt("date", today)
    .order("date", { ascending: false });

  // Deduplicate: first occurrence per budget_id is the most recent (DESC order)
  const prevSnapshotMap = new Map<string, { notified_80: boolean; notified_over: boolean }>();
  for (const s of prevSnapshotRows ?? []) {
    if (!prevSnapshotMap.has(s.budget_id)) {
      prevSnapshotMap.set(s.budget_id, { notified_80: s.notified_80, notified_over: s.notified_over });
    }
  }

  // ── 5. Compute snapshot values and collect notification work ──────────────
  type SnapshotRow = {
    budget_id: string;
    date: string;
    daily_rate: number;
    amount_spent: number;
    remaining_after: number;
    days_remaining_after: number;
    notified_80: boolean;
    notified_over: boolean;
  };

  type NotifyWork = {
    owner_id: string;
    pct: number;
    remaining: number;
    over_by: number;
    newly_80: boolean;
    newly_over: boolean;
  };

  const snapshotRows: SnapshotRow[] = [];
  const notifyMap = new Map<string, NotifyWork>(); // keyed by budget_id

  for (const budget of budgets) {
    const linkedAccounts = goalAccountMap.get(budget.goal_id) ?? new Set<string>();

    const amountSpent = allTx
      .filter(tx =>
        tx.category_primary === budget.category_id &&
        tx.date >= budget.period_start &&
        tx.date <= today &&
        linkedAccounts.has(tx.plaid_account_id)
      )
      .reduce((s, tx) => s + Number(tx.amount), 0);

    const totalLimit     = Number(budget.total_limit);
    const remainingAfter = totalLimit - amountSpent;

    const todayMs = new Date(today + "T00:00:00Z").getTime();
    const endMs   = new Date(budget.period_end + "T00:00:00Z").getTime();
    const daysRemainingAfter = Math.max(0, Math.round((endMs - todayMs) / 86_400_000));

    const dailyRate = daysRemainingAfter > 0
      ? Math.max(0, remainingAfter) / daysRemainingAfter
      : 0;

    const prev        = prevSnapshotMap.get(budget.id) ?? { notified_80: false, notified_over: false };
    const pct         = totalLimit > 0 ? (amountSpent / totalLimit) * 100 : 0;
    const newN80      = prev.notified_80 || pct >= 80;
    const newNOver    = prev.notified_over || pct >= 100;

    snapshotRows.push({
      budget_id:            budget.id,
      date:                 today,
      daily_rate:           Math.round(dailyRate * 100) / 100,
      amount_spent:         Math.round(amountSpent * 100) / 100,
      remaining_after:      Math.round(remainingAfter * 100) / 100,
      days_remaining_after: daysRemainingAfter,
      notified_80:          newN80,
      notified_over:        newNOver,
    });

    const newly80   = pct >= 80  && !prev.notified_80;
    const newlyOver = pct >= 100 && !prev.notified_over;

    if ((newly80 || newlyOver) && budget.owner_type === "personal") {
      notifyMap.set(budget.id, {
        owner_id:  budget.owner_id,
        pct,
        remaining: Math.max(0, remainingAfter),
        over_by:   Math.max(0, amountSpent - totalLimit),
        newly_80:  newly80,
        newly_over: newlyOver,
      });
    }
  }

  // ── 6. Batch UPSERT all snapshots ─────────────────────────────────────────
  const { error: upsertErr } = await db
    .from("budget_daily_snapshots")
    .upsert(snapshotRows, { onConflict: "budget_id,date" });

  if (upsertErr) {
    console.error("[nightly-snapshot] upsert failed:", upsertErr.message);
    return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500 });
  }

  // ── 7. Send notification emails for newly-crossed thresholds ─────────────
  for (const [, notify] of notifyMap) {
    const { data: authUser } = await db.auth.admin.getUserById(notify.owner_id);
    const userEmail = authUser?.user?.email;
    if (!userEmail) continue;

    const { data: profile } = await db
      .from("profiles")
      .select("username")
      .eq("id", notify.owner_id)
      .maybeSingle();
    const name = profile?.username ?? "there";

    if (notify.newly_80) {
      await sendEmail(
        userEmail,
        `Heads up — you've used ${Math.round(notify.pct)}% of your budget`,
        `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111;">
          <h2 style="margin-bottom:4px;">Spending alert</h2>
          <p>Hey ${name},</p>
          <p>You've used <strong>${Math.round(notify.pct)}%</strong> of your budget this period.
             You have <strong>${fmt(notify.remaining)}</strong> remaining.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Park Hawkins Properties · Budget Tracker</p>
        </div>`
      );
    }

    if (notify.newly_over) {
      await sendEmail(
        userEmail,
        `You're over your budget this period`,
        `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111;">
          <h2 style="margin-bottom:4px;color:#dc2626;">Over budget</h2>
          <p>Hey ${name},</p>
          <p>You've exceeded your budget by <strong style="color:#dc2626;">${fmt(notify.over_by)}</strong> this period.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Park Hawkins Properties · Budget Tracker</p>
        </div>`
      );
    }
  }

  // ── 8. Bill due-soon and due-today notifications ──────────────────────────

  function computeBillNextDueDate(bill: { due_day: number; recurrence: string }): string {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (bill.recurrence === "monthly") {
      const candidate = new Date(now.getFullYear(), now.getMonth(), bill.due_day);
      if (candidate < now) candidate.setMonth(candidate.getMonth() + 1);
      return candidate.toISOString().split("T")[0];
    }
    if (bill.recurrence === "weekly") {
      const iso = bill.due_day < 1 ? 1 : bill.due_day > 7 ? 7 : bill.due_day;
      const todayIso = now.getDay() === 0 ? 7 : now.getDay();
      let daysUntil = iso - todayIso;
      if (daysUntil < 0) daysUntil += 7;
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + daysUntil);
      return candidate.toISOString().split("T")[0];
    }
    if (bill.recurrence === "yearly") {
      const candidate = new Date(now.getFullYear(), 0, bill.due_day);
      if (candidate < now) candidate.setFullYear(candidate.getFullYear() + 1);
      return candidate.toISOString().split("T")[0];
    }
    return new Date(now.getFullYear(), now.getMonth(), bill.due_day).toISOString().split("T")[0];
  }

  const in3Days = new Date();
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysStr = in3Days.toISOString().split("T")[0];

  const { data: activeBills } = await db
    .from("bills")
    .select("id, owner_id, name, amount, due_day, recurrence, last_paid_at, notified_3day, notified_today")
    .eq("is_active", true)
    .eq("owner_type", "personal");

  for (const bill of activeBills ?? []) {
    const nextDue = computeBillNextDueDate(bill);
    const isDueToday = nextDue === today;
    const isDueSoon  = nextDue === in3DaysStr;

    if (!isDueToday && !isDueSoon) continue;

    const { data: authUser } = await db.auth.admin.getUserById(bill.owner_id);
    const userEmail = authUser?.user?.email;
    if (!userEmail) continue;

    const { data: profile } = await db
      .from("profiles")
      .select("username")
      .eq("id", bill.owner_id)
      .maybeSingle();
    const name = profile?.username ?? "there";

    if (isDueToday && !bill.notified_today) {
      await sendEmail(
        userEmail,
        `${bill.name} is due today — ${fmt(Number(bill.amount))}`,
        `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111;">
          <h2 style="margin-bottom:4px;">Bill due today</h2>
          <p>Hey ${name},</p>
          <p>Your <strong>${bill.name}</strong> payment of <strong>${fmt(Number(bill.amount))}</strong> is due today.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Park Hawkins Properties · Finance Tracker</p>
        </div>`
      );
      await db.from("bills").update({ notified_today: true }).eq("id", bill.id);
    } else if (isDueSoon && !bill.notified_3day) {
      await sendEmail(
        userEmail,
        `Your ${bill.name} is due in 3 days — ${fmt(Number(bill.amount))}`,
        `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111;">
          <h2 style="margin-bottom:4px;">Upcoming bill</h2>
          <p>Hey ${name},</p>
          <p>Your <strong>${bill.name}</strong> payment of <strong>${fmt(Number(bill.amount))}</strong>
             is due in <strong>3 days</strong> on ${new Date(nextDue + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Park Hawkins Properties · Finance Tracker</p>
        </div>`
      );
      await db.from("bills").update({ notified_3day: true }).eq("id", bill.id);
    }
  }

  // ── Morning report emails (send at 7am UTC) ──────────────────────────────
  const currentHour = new Date().getUTCHours();
  if (currentHour === 7) {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: profiles } = await db
      .from("profiles")
      .select("id, username, morning_report_sent_date")
      .or(`morning_report_sent_date.is.null,morning_report_sent_date.lt.${yesterdayStr}`);

    for (const profile of profiles ?? []) {
      const { data: txs } = await db
        .from("plaid_transactions")
        .select("merchant_name, amount, category_primary, date")
        .eq("user_id", profile.id)
        .eq("date", yesterdayStr)
        .eq("pending", false)
        .gt("amount", 0);

      const grouped = groupByCategory(txs ?? []);
      const totalSpent = (txs ?? []).reduce((s: number, t: { amount: number }) => s + t.amount, 0);

      const { data: authUser } = await db.auth.admin.getUserById(profile.id);
      const email = authUser?.user?.email;
      if (!email) continue;

      const { data: goal } = await db
        .from("savings_goals")
        .select("name")
        .eq("owner_id", profile.id)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const dateFormatted = yesterday.toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
      const subject = totalSpent > 0
        ? `Your money on ${dateFormatted} — ${fmt(totalSpent)}`
        : `You didn't spend anything on ${dateFormatted} 🎉`;

      await sendEmail(
        email,
        subject,
        buildMorningReportHtml(grouped, totalSpent, dateFormatted, profile.username ?? "there", goal?.name)
      );
      await db.from("profiles").update({ morning_report_sent_date: yesterdayStr }).eq("id", profile.id);
    }
  }

  // ── 9. Milestone checks ──────────────────────────────────────────────────
  // Emergency fund milestones require live Plaid balances (no DB table) — checked client-side.
  // All other milestones are checked here nightly.

  const MILESTONE_META: Record<string, { icon: string; label: string; description: string }> = {
    bank_connected:           { icon: "🏦", label: "Bank connected",         description: "Linked your first bank account" },
    first_budget_created:     { icon: "📊", label: "First budget",           description: "Created your first spending budget" },
    first_goal_created:       { icon: "🎯", label: "First goal",             description: "Set your first savings goal" },
    first_goal_achieved:      { icon: "🏆", label: "Goal achieved!",         description: "Reached a savings goal" },
    net_worth_positive:       { icon: "📈", label: "Net worth positive",     description: "Your net worth turned positive" },
    first_month_under_budget: { icon: "✅", label: "Under budget",           description: "Finished a full month under budget" },
    zero_spend_day:           { icon: "🌟", label: "Zero spend day",         description: "A full day with no purchases" },
  };

  function buildMilestoneHtml(name: string, icon: string, label: string, description: string): string {
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <p>Hey ${name},</p>
        <div style="text-align:center;padding:24px;background:#f9fafb;border-radius:12px;margin:16px 0;">
          <div style="font-size:48px;margin-bottom:8px;">${icon}</div>
          <p style="font-size:18px;font-weight:600;margin:0 0 4px;">${label}</p>
          <p style="font-size:13px;color:#6b7280;margin:0;">${description}</p>
        </div>
        <p style="margin-top:24px;">
          <a href="https://chonopoly.vercel.app/finances" style="color:#00d4aa;">View your profile →</a>
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Park Hawkins Properties · Finance Tracker</p>
      </div>`;
  }

  // Get all users with at least one connected bank
  const { data: plaidItemUsers } = await db
    .from("plaid_items")
    .select("user_id");

  const uniqueUserIds = [...new Set((plaidItemUsers ?? []).map(r => r.user_id))];

  for (const userId of uniqueUserIds) {
    // Fetch existing earned milestones for this user
    const { data: existing } = await db
      .from("milestones")
      .select("milestone_key")
      .eq("owner_id", userId);
    const earned = new Set((existing ?? []).map((m: { milestone_key: string }) => m.milestone_key));

    const toEarn: string[] = [];
    const thirtyAgo = new Date(today);
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const thirtyAgoStr = thirtyAgo.toISOString().split("T")[0];

    // bank_connected — always true if user has plaid_items
    if (!earned.has("bank_connected")) toEarn.push("bank_connected");

    // first_budget_created
    if (!earned.has("first_budget_created")) {
      const { count } = await db.from("budgets").select("*", { count: "exact", head: true })
        .eq("owner_id", userId).eq("owner_type", "personal");
      if ((count ?? 0) > 0) toEarn.push("first_budget_created");
    }

    // first_goal_created
    if (!earned.has("first_goal_created")) {
      const { count } = await db.from("savings_goals").select("*", { count: "exact", head: true })
        .eq("owner_id", userId);
      if ((count ?? 0) > 0) toEarn.push("first_goal_created");
    }

    // first_goal_achieved
    if (!earned.has("first_goal_achieved")) {
      const { count } = await db.from("savings_goals").select("*", { count: "exact", head: true })
        .eq("owner_id", userId).eq("status", "achieved");
      if ((count ?? 0) > 0) toEarn.push("first_goal_achieved");
    }

    // net_worth_positive
    if (!earned.has("net_worth_positive")) {
      const [{ data: manualAssets }, { data: debts }] = await Promise.all([
        db.from("assets").select("current_value").eq("owner_id", userId).eq("owner_type", "personal"),
        db.from("debts").select("current_balance").eq("owner_id", userId).eq("owner_type", "personal"),
      ]);
      const assetsTotal = (manualAssets ?? []).reduce((s: number, a: { current_value: number }) => s + Number(a.current_value), 0);
      const debtsTotal  = (debts ?? []).reduce((s: number, d: { current_balance: number }) => s + Number(d.current_balance), 0);
      if (assetsTotal - debtsTotal > 0) toEarn.push("net_worth_positive");
    }

    // first_month_under_budget
    if (!earned.has("first_month_under_budget")) {
      const { data: closedBudgets } = await db
        .from("budgets")
        .select("id, total_limit")
        .eq("owner_id", userId).eq("owner_type", "personal")
        .lt("period_end", today);
      if ((closedBudgets ?? []).length > 0) {
        const closedIds = (closedBudgets ?? []).map((b: { id: string }) => b.id);
        const { data: snaps } = await db
          .from("budget_daily_snapshots")
          .select("budget_id, amount_spent")
          .in("budget_id", closedIds)
          .order("date", { ascending: false });
        const lastSpent = new Map<string, number>();
        for (const s of snaps ?? []) {
          if (!lastSpent.has(s.budget_id)) lastSpent.set(s.budget_id, Number(s.amount_spent));
        }
        const allUnder = (closedBudgets ?? []).every((b: { id: string; total_limit: number }) =>
          (lastSpent.get(b.id) ?? 0) <= Number(b.total_limit)
        );
        if (allUnder) toEarn.push("first_month_under_budget");
      }
    }

    // zero_spend_day
    if (!earned.has("zero_spend_day")) {
      const { data: txDays } = await db
        .from("plaid_transactions")
        .select("date")
        .eq("user_id", userId)
        .gte("date", thirtyAgoStr).lte("date", today)
        .eq("pending", false).gt("amount", 0);
      const daysWithSpend = new Set((txDays ?? []).map((t: { date: string }) => t.date));
      for (let i = 1; i <= 30; i++) {
        const d = new Date(today + "T00:00:00Z");
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split("T")[0];
        if (!daysWithSpend.has(dStr)) { toEarn.push("zero_spend_day"); break; }
      }
    }

    if (toEarn.length === 0) continue;

    // Insert new milestones (UNIQUE constraint prevents double-insert)
    const inserts = toEarn.map(key => ({ owner_id: userId, milestone_key: key }));
    const { data: inserted } = await db
      .from("milestones")
      .insert(inserts)
      .select("milestone_key");

    // Send email for each newly inserted milestone
    if ((inserted ?? []).length > 0) {
      const { data: authUser } = await db.auth.admin.getUserById(userId);
      const userEmail = authUser?.user?.email;
      if (!userEmail) continue;
      const { data: profile } = await db.from("profiles").select("username").eq("id", userId).maybeSingle();
      const name = profile?.username ?? "there";

      for (const row of inserted ?? []) {
        const meta = MILESTONE_META[row.milestone_key];
        if (!meta) continue;
        await sendEmail(
          userEmail,
          `You earned a milestone: ${meta.label}`,
          buildMilestoneHtml(name, meta.icon, meta.label, meta.description)
        );
      }

      // Mark all newly inserted milestones as notified
      await db.from("milestones")
        .update({ notified: true })
        .eq("owner_id", userId)
        .in("milestone_key", (inserted ?? []).map((r: { milestone_key: string }) => r.milestone_key));
    }
  }

  const result = { ok: true, processed: snapshotRows.length, notified: notifyMap.size };
  console.log(`[nightly-snapshot] done —`, result);
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
});
