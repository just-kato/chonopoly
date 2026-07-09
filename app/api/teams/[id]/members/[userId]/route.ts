import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Params = { params: Promise<{ id: string; userId: string }> };

const ADMIN_ROLES = ["org_owner", "org_admin"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

function isAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

async function countOrgOwners(teamId: string): Promise<number> {
  const { count } = await db()
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("role", "org_owner");
  return count ?? 0;
}

// PATCH /api/teams/[id]/members/[userId] — update role; caller must be org_owner or org_admin
export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, userId } = await params;

  // Verify caller is admin
  const { data: callerMembership } = await db()
    .from("team_members")
    .select("role")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!callerMembership || !isAdminRole(callerMembership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await request.json();
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).role !== "string"
  ) {
    return NextResponse.json({ error: "Missing required field: role" }, { status: 400 });
  }

  const newRole = (body as Record<string, unknown>).role as string;

  // Fetch current role of the target member
  const { data: targetMembership } = await db()
    .from("team_members")
    .select("role")
    .eq("team_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!targetMembership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Prevent demoting the last org_owner
  if (targetMembership.role === "org_owner" && newRole !== "org_owner") {
    const ownerCount = await countOrgOwners(id);
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last org_owner" },
        { status: 400 }
      );
    }
  }

  const { error } = await db()
    .from("team_members")
    .update({ role: newRole })
    .eq("team_id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/teams/[id]/members/[userId] — remove member
// Caller must be org_owner/org_admin OR self; cannot remove last org_owner
export async function DELETE(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, userId } = await params;

  const isSelf = user.id === userId;

  const { data: callerMembership } = await db()
    .from("team_members")
    .select("role")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!callerMembership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const callerIsAdmin = isAdminRole(callerMembership.role);

  if (!isSelf && !callerIsAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch target member's current role
  const { data: targetMembership } = await db()
    .from("team_members")
    .select("role")
    .eq("team_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!targetMembership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Prevent removing the last org_owner
  if (targetMembership.role === "org_owner") {
    const ownerCount = await countOrgOwners(id);
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last org_owner" },
        { status: 400 }
      );
    }
  }

  const { error } = await db()
    .from("team_members")
    .delete()
    .eq("team_id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
