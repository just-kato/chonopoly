import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Params = { params: Promise<{ id: string }> };

// GET /api/teams/[id] — fetch team + members; caller must be a member
export async function GET(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify caller is a member
  const { data: membership } = await db()
    .from("team_members")
    .select("role")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: team, error: teamError } = await db()
    .from("teams")
    .select("id, name, description, org_id")
    .eq("id", id)
    .single();

  if (teamError || !team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const { data: members, error: membersError } = await db()
    .from("team_members")
    .select("id, user_id, role, joined_at, invited_by")
    .eq("team_id", id);

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  return NextResponse.json({ team, members: members ?? [] });
}

// PATCH /api/teams/[id] — update team name; caller must be org_owner or org_admin
export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: membership } = await db()
    .from("team_members")
    .select("role")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (membership.role !== "org_owner" && membership.role !== "org_admin") {
    return NextResponse.json({ error: "Forbidden — insufficient role" }, { status: 403 });
  }

  const body: unknown = await request.json();
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).name !== "string"
  ) {
    return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
  }

  const name = ((body as Record<string, unknown>).name as string).trim();
  if (!name) {
    return NextResponse.json({ error: "name must not be empty" }, { status: 400 });
  }

  const { data: updated, error } = await db()
    .from("teams")
    .update({ name })
    .eq("id", id)
    .select("id, name")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ team: updated });
}

// DELETE /api/teams/[id] — delete team; caller must be org_owner
export async function DELETE(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: membership } = await db()
    .from("team_members")
    .select("role")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (membership.role !== "org_owner") {
    return NextResponse.json({ error: "Forbidden — must be org_owner to delete team" }, { status: 403 });
  }

  const { error } = await db().from("teams").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
