import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { sendExistingUserInviteEmail, sendNewUserInviteEmail } from "@/lib/teams/inviteEmailService";

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Params = { params: Promise<{ id: string }> };

const INVITE_ALLOWED_ROLES = ["org_owner", "org_admin", "team_manager"] as const;
type InviteAllowedRole = (typeof INVITE_ALLOWED_ROLES)[number];

function canInvite(role: string): role is InviteAllowedRole {
  return (INVITE_ALLOWED_ROLES as readonly string[]).includes(role);
}

// POST /api/teams/[id]/invite — create an invite; caller must be org_owner/org_admin/team_manager
export async function POST(request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify caller is a member with permission to invite
  const { data: membership } = await db()
    .from("team_members")
    .select("role")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !canInvite(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await request.json();
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, role } = body as Record<string, unknown>;

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Missing required field: email" }, { status: 400 });
  }
  if (typeof role !== "string" || !role.trim()) {
    return NextResponse.json({ error: "Missing required field: role" }, { status: 400 });
  }

  // team_manager can only invite team_member role
  if (membership.role === "team_manager" && role !== "team_member") {
    return NextResponse.json(
      { error: "team_manager can only invite with role 'team_member'" },
      { status: 403 }
    );
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await db().from("team_invites").insert({
    team_id: id,
    email: email.trim().toLowerCase(),
    invited_by: user.id,
    role,
    token,
    expires_at: expiresAt,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Fetch team name and inviter email, then send the appropriate invite email
  try {
    const [{ data: team }, { data: inviterProfile }] = await Promise.all([
      db().from("teams").select("name").eq("id", id).single(),
      db().from("profiles").select("email").eq("id", user.id).maybeSingle(),
    ]);

    const teamName = team?.name ?? "";
    const inviterEmail = inviterProfile?.email ?? user.email ?? "";
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
    const expiresAtDate = new Date(expiresAt);
    const inviteeEmail = email.trim().toLowerCase();

    // Check if the invitee already has an account
    const { data: existingUser } = await db()
      .from("profiles")
      .select("id")
      .eq("email", inviteeEmail)
      .maybeSingle();

    if (existingUser) {
      sendExistingUserInviteEmail({
        to: inviteeEmail,
        teamName,
        inviterEmail,
        role,
        acceptUrl,
        expiresAt: expiresAtDate,
      });
    } else {
      sendNewUserInviteEmail({
        to: inviteeEmail,
        teamName,
        inviterEmail,
        role,
        acceptUrl,
        expiresAt: expiresAtDate,
      });
    }
  } catch {
    // Email failure must not fail the invite creation
  }

  return NextResponse.json({ ok: true, token }, { status: 201 });
}
