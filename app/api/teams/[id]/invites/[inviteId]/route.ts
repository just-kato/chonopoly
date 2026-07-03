import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Params = { params: Promise<{ id: string; inviteId: string }> };

// DELETE /api/teams/[id]/invites/[inviteId] — cancel a pending invite; caller must be org_owner or org_admin
export async function DELETE(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, inviteId } = await params;

  const { data: membership } = await db()
    .from("team_members")
    .select("role")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminRoles = ["org_owner", "org_admin"];
  if (!adminRoles.includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden — insufficient role" }, { status: 403 });
  }

  const { data: invite } = await db()
    .from("team_invites")
    .select("id")
    .eq("id", inviteId)
    .eq("team_id", id)
    .is("accepted", null)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Invite not found or already accepted" }, { status: 404 });

  const { error } = await db()
    .from("team_invites")
    .delete()
    .eq("id", inviteId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
