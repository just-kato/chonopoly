import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { resolveContext } from "@/lib/context";
import { getAssetSummary } from "@/lib/assets/assetService";
import { getDebtSummary } from "@/lib/debts/debtService";
import { getPlaidItems } from "@/lib/supabase/plaid";
import { plaidClient } from "@/lib/plaid";
import { log } from "@/lib/logger";

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const context_type = searchParams.get("context_type") ?? undefined;
  const context_id   = searchParams.get("context_id")   ?? undefined;

  const ctx = await resolveContext(context_type, context_id, user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ assets }, debts] = await Promise.all([
    getAssetSummary(user.id, ctx),
    getDebtSummary(user.id, ctx),
  ]);

  // Fetch cached Plaid balances — use goal_accounts cached_balance to avoid live Plaid calls
  // Fall back to live Plaid if needed (first-time net worth load)
  let liquid_assets = 0;
  const liquid_accounts: { name: string; balance: number; subtype: string | null }[] = [];

  try {
    const { data: items } = await getPlaidItems(user.id);
    if (items?.length) {
      const results = await Promise.all(
        items.map(item =>
          plaidClient.accountsGet({ access_token: item.access_token })
            .then(r => r.data.accounts
              .filter(a => ["depository", "investment"].includes(a.type))
              .map(a => ({ name: a.name, balance: a.balances.current ?? 0, subtype: a.subtype ?? null }))
            )
            .catch((err) => {
              log('error', 'Plaid accountsGet failed in net-worth', {
                route: '/api/net-worth',
                itemId: item.item_id,
                institution: item.institution_name,
                error: (err as { response?: { data?: unknown } })?.response?.data ?? err,
              });
              return [] as { name: string; balance: number; subtype: string | null }[];
            })
        )
      );
      for (const group of results) {
        for (const acct of group) {
          liquid_assets += acct.balance;
          liquid_accounts.push(acct);
        }
      }
    }
  } catch {
    // No Plaid items or connection issue — liquid assets = 0
  }

  const manual_assets  = assets.reduce((s, a) => s + a.current_value, 0);
  const total_assets   = liquid_assets + manual_assets;
  const total_debts    = debts.filter(d => d.status === "active").reduce((s, d) => s + d.current_balance, 0);
  const net_worth      = total_assets - total_debts;

  return NextResponse.json({
    liquid_assets,
    manual_assets,
    total_assets,
    total_debts,
    net_worth,
    liquid_accounts,
    assets,
    debts: debts.filter(d => d.status === "active"),
  });
}
