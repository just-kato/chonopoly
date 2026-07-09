import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Params = { params: Promise<{ token: string }> };

// POST /api/teams/invite/[token]/decline — decline a team invite
export async function POST(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;

  // Update invite: set accepted = false and expire it immediately
  // Only updates if invite is still pending (accepted IS NULL)
  const { error } = await db()
    .from("team_invites")
    .update({ accepted: false, expires_at: new Date().toISOString() })
    .eq("token", token)
    .is("accepted", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
