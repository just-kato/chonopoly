import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function serviceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { bill_id: string; amount: number; period: string };
  const { bill_id, amount, period } = body;
  if (!bill_id || !amount || !period) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = serviceDb();

  // Ownership check
  const { data: bill, error: fetchErr } = await db
    .from("bills")
    .select("id, owner_id")
    .eq("id", bill_id)
    .eq("owner_id", user.id)
    .single();

  if (fetchErr || !bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  // Insert payment record
  const { error: payErr } = await db
    .from("bill_payments")
    .insert({ bill_id, amount, period });

  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });

  // Update bill: record payment time, reset notification flags for new cycle
  const { data: updated, error: updateErr } = await db
    .from("bills")
    .update({
      last_paid_at: new Date().toISOString(),
      notified_3day: false,
      notified_today: false,
    })
    .eq("id", bill_id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ bill: updated });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { bill_id: string; payment_id: string };
  const { bill_id, payment_id } = body;
  if (!bill_id || !payment_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = serviceDb();

  // Ownership check
  const { data: bill, error: fetchErr } = await db
    .from("bills")
    .select("id, owner_id")
    .eq("id", bill_id)
    .eq("owner_id", user.id)
    .single();

  if (fetchErr || !bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  // Delete the specified payment row
  const { error: delErr } = await db
    .from("bill_payments")
    .delete()
    .eq("id", payment_id)
    .eq("bill_id", bill_id);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  // Find new last_paid_at from remaining payments (most recent)
  const { data: remaining } = await db
    .from("bill_payments")
    .select("paid_at")
    .eq("bill_id", bill_id)
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: updated, error: updateErr } = await db
    .from("bills")
    .update({
      last_paid_at: remaining?.paid_at ?? null,
      notified_3day: false,
      notified_today: false,
    })
    .eq("id", bill_id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ bill: updated });
}
