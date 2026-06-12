import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await db()
    .from("profiles")
    .select("onboarding_complete, pay_cycle_start_day, morning_report_enabled, dashboard_layout")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    email: user.email ?? null,
    onboarding_complete: data?.onboarding_complete ?? false,
    pay_cycle_start_day: data?.pay_cycle_start_day ?? 1,
    morning_report_enabled: data?.morning_report_enabled ?? true,
    dashboard_layout: data?.dashboard_layout ?? null,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as Record<string, unknown>;
  const allowed = ["pay_cycle_start_day", "morning_report_enabled", "onboarding_complete", "dashboard_layout"];
  const patch: Record<string, unknown> = { id: user.id, updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = body[key];
  }

  const { error } = await db()
    .from("profiles")
    .upsert(patch, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
