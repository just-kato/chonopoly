import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function serviceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Compute the next due date for a bill from its recurrence rules and last_paid_at.
// Returns a Date representing the next upcoming due occurrence on or after today.
function computeNextDueDate(bill: {
  due_day: number;
  recurrence: string;
  last_paid_at: string | null;
}): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (bill.recurrence === "monthly") {
    // Next occurrence of due_day in current or next month
    const candidate = new Date(today.getFullYear(), today.getMonth(), bill.due_day);
    if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
    return candidate;
  }

  if (bill.recurrence === "weekly") {
    // due_day = ISO weekday 1–7 (Mon–Sun)
    const isoDay = bill.due_day < 1 ? 1 : bill.due_day > 7 ? 7 : bill.due_day;
    const todayIso = today.getDay() === 0 ? 7 : today.getDay();
    let daysUntil = isoDay - todayIso;
    if (daysUntil < 0) daysUntil += 7;
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + daysUntil);
    return candidate;
  }

  if (bill.recurrence === "yearly") {
    // due_day = day-of-year (1–366)
    const candidate = new Date(today.getFullYear(), 0, bill.due_day);
    if (candidate < today) candidate.setFullYear(candidate.getFullYear() + 1);
    return candidate;
  }

  // one-time: due_day is day-of-month; use current month if not yet paid
  const candidate = new Date(today.getFullYear(), today.getMonth(), bill.due_day);
  return candidate;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = serviceDb();

    const { data: bills, error } = await db
      .from("bills")
      .select(`
        *,
        bill_payments (
          id, paid_at, amount, period, created_at
        )
      `)
      .eq("owner_id", user.id)
      .eq("is_active", true)
      .order("due_day", { ascending: true });

    if (error) {
      console.error("[GET /api/bills] Supabase query error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const billsWithDueDate = (bills ?? []).map(bill => {
      // Keep only the 3 most recent payments
      const payments = [...(bill.bill_payments ?? [])]
        .sort((a: { paid_at: string }, b: { paid_at: string }) =>
          new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
        )
        .slice(0, 3);

      const nextDueDate = computeNextDueDate(bill);

      return {
        ...bill,
        bill_payments: payments,
        next_due_date: nextDueDate.toISOString().split("T")[0],
      };
    });

    return NextResponse.json({ bills: billsWithDueDate });
  } catch (err) {
    console.error("[GET /api/bills] Uncaught exception:", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      raw: err,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name: string;
    amount: number;
    due_day: number;
    recurrence: string;
    category_id?: string;
    is_auto_detected?: boolean;
    plaid_merchant?: string;
  };

  const { name, amount, due_day, recurrence, category_id, is_auto_detected, plaid_merchant } = body;
  if (!name || !amount || !due_day || !recurrence) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = serviceDb();
  const { data, error } = await db
    .from("bills")
    .insert({
      owner_id: user.id,
      owner_type: "personal",
      name,
      amount,
      due_day,
      recurrence,
      category_id: category_id ?? null,
      is_auto_detected: is_auto_detected ?? false,
      plaid_merchant: plaid_merchant ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bill: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { bill_id: string; [key: string]: unknown };
  const { bill_id, ...fields } = body;
  if (!bill_id) return NextResponse.json({ error: "Missing bill_id" }, { status: 400 });

  // Strip fields that must not be updated externally
  const { id: _id, owner_id: _oid, created_at: _ca, ...safeFields } = fields as Record<string, unknown>;
  void _id; void _oid; void _ca;

  const db = serviceDb();
  const { data, error } = await db
    .from("bills")
    .update(safeFields)
    .eq("id", bill_id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bill: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { bill_id: string };
  const { bill_id } = body;
  if (!bill_id) return NextResponse.json({ error: "Missing bill_id" }, { status: 400 });

  const db = serviceDb();
  const { error } = await db
    .from("bills")
    .update({ is_active: false })
    .eq("id", bill_id)
    .eq("owner_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
