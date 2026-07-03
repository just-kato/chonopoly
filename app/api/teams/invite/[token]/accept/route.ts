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

// POST /api/teams/invite/[token]/accept — accept a team invite
export async function POST(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;

  const { data: invite, error: lookupError } = await db()
    .from("team_invites")
    .select("id, team_id, email, role, invited_by, expires_at, accepted")
    .eq("token", token)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const now = new Date();
  if (new Date(invite.expires_at) < now) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  if (invite.accepted !== null) {
    return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  }

  // If the invite has an email, verify caller's email matches (case-insensitive)
  if (invite.email) {
    const callerEmail = user.email ?? "";
    if (callerEmail.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was sent to a different email address" },
        { status: 403 }
      );
    }
  }

  // Insert member — on conflict (already a member) do nothing
  const { error: memberError } = await db()
    .from("team_members")
    .upsert(
      {
        team_id: invite.team_id,
        user_id: user.id,
        role: invite.role,
        invited_by: invite.invited_by,
      },
      { onConflict: "team_id,user_id", ignoreDuplicates: true }
    );

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // Mark invite as accepted
  const { error: updateError } = await db()
    .from("team_invites")
    .update({ accepted: true })
    .eq("token", token);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Fetch team name for response
  const { data: team } = await db()
    .from("teams")
    .select("name")
    .eq("id", invite.team_id)
    .single();

  return NextResponse.json({
    team_id: invite.team_id,
    team_name: team?.name ?? null,
  });
}
