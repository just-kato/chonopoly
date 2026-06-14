import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlaidItems } from "@/lib/supabase/plaid";
import { syncPlaidItem } from "@/lib/plaid-sync";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: items } = await getPlaidItems(user.id);
  if (!items.length) return NextResponse.json({ synced: 0, updated: 0 });

  let synced = 0;
  let updated = 0;

  for (const item of items) {
    const result = await syncPlaidItem(user.id, item.item_id, item.access_token);
    synced += result.synced;
    updated += result.updated;
  }

  return NextResponse.json({ synced, updated });
}
