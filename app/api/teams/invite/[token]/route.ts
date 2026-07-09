import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Params = { params: Promise<{ token: string }> };

// GET /api/teams/invite/[token] — look up invite metadata (no auth required)
export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;

  const { data: invite, error } = await db()
    .from("team_invites")
    .select("team_id, email, role, expires_at, accepted")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const now = new Date();
  const expired = new Date(invite.expires_at) < now;

  if (expired || invite.accepted !== null) {
    return NextResponse.json(
      { error: "Invite is expired or already used" },
      { status: 410 }
    );
  }

  // Fetch team name separately
  const { data: team } = await db()
    .from("teams")
    .select("name")
    .eq("id", invite.team_id)
    .single();

  return NextResponse.json({
    team_name: team?.name ?? null,
    role: invite.role,
    email: invite.email,
    expires_at: invite.expires_at,
  });
}
