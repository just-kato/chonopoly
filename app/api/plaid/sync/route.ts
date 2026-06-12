import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";
import { getPlaidItems } from "@/lib/supabase/plaid";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { invalidateBudgetCache } from "@/lib/budget/budgetService";
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function serviceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: items } = await getPlaidItems(user.id);
  if (!items.length) return NextResponse.json({ synced: 0, updated: 0 });

  const startDate = daysAgo(30);
  const endDate   = daysAgo(0);
  const db = serviceDb();

  let synced = 0;
  let updated = 0;

  for (const item of items) {
    try {
      const res = await plaidClient.transactionsGet({
        access_token: item.access_token,
        start_date: startDate,
        end_date: endDate,
        options: { count: 500, include_personal_finance_category: true },
      });

      const rows = res.data.transactions.map((tx) => ({
        user_id:              user.id,
        plaid_transaction_id: tx.transaction_id,
        plaid_account_id:     tx.account_id,
        plaid_item_id:        item.item_id,
        merchant_name:        tx.merchant_name ?? tx.name ?? null,
        amount:               tx.amount,
        date:                 tx.date,
        category_primary:     tx.personal_finance_category?.primary ?? null,
        category_detailed:    tx.personal_finance_category?.detailed ?? null,
        pending:              tx.pending ?? false,
        currency_code:        tx.iso_currency_code ?? null,
        synced_at:            new Date().toISOString(),
      }));

      if (!rows.length) continue;

      const { error, data } = await db
        .from("plaid_transactions")
        .upsert(rows, { onConflict: "user_id,plaid_transaction_id" })
        .select("id");

      if (error) {
        console.error("[sync] upsert error for item", item.item_id, error.message);
        continue;
      }

      synced += rows.filter(r => !r.pending).length;
      updated += data?.length ?? 0;
    } catch (err) {
      console.error("[sync] Plaid error for item", item.item_id, err);
    }
  }

  invalidateBudgetCache({ type: "personal", id: user.id });

  // Auto-detect recurring bills: merchants that appear 2+ times at ~monthly intervals
  const sixtyDaysAgo = daysAgo(60);
  const { data: txs } = await db
    .from("plaid_transactions")
    .select("merchant_name, amount, date")
    .eq("user_id", user.id)
    .gte("date", sixtyDaysAgo)
    .gt("amount", 0)
    .not("merchant_name", "is", null);

  const merchantMap: Record<string, { dates: string[]; amounts: number[] }> = {};
  for (const tx of txs ?? []) {
    if (!tx.merchant_name) continue;
    if (!merchantMap[tx.merchant_name]) merchantMap[tx.merchant_name] = { dates: [], amounts: [] };
    merchantMap[tx.merchant_name].dates.push(tx.date as string);
    merchantMap[tx.merchant_name].amounts.push(tx.amount as number);
  }

  for (const [merchant, { dates, amounts }] of Object.entries(merchantMap)) {
    if (dates.length < 2) continue;
    const sorted = [...dates].sort();
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const d1 = new Date(sorted[i - 1]);
      const d2 = new Date(sorted[i]);
      gaps.push((d2.getTime() - d1.getTime()) / 86400000);
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    if (avgGap < 20 || avgGap > 45) continue; // not monthly-ish

    const { data: existing } = await db
      .from("bills")
      .select("id")
      .eq("owner_id", user.id)
      .eq("plaid_merchant", merchant)
      .eq("is_active", true)
      .maybeSingle();
    if (existing) continue;

    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const dueDay = new Date(sorted[sorted.length - 1]).getDate();
    await db.from("bills").insert({
      owner_id: user.id,
      owner_type: "personal",
      name: merchant,
      amount: Math.round(avgAmount * 100) / 100,
      due_day: dueDay,
      recurrence: "monthly",
      is_auto_detected: true,
      plaid_merchant: merchant,
    });
  }

  return NextResponse.json({ synced, updated });
}
