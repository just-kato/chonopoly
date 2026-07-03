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

// POST /api/teams/[id]/transfer-ownership — caller must be org_owner
// Body: { new_owner_id: string }
export async function POST(request: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: callerMembership } = await db()
    .from("team_members")
    .select("role")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!callerMembership || callerMembership.role !== "org_owner") {
    return NextResponse.json({ error: "Forbidden — must be org_owner" }, { status: 403 });
  }

  const body: unknown = await request.json();
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).new_owner_id !== "string"
  ) {
    return NextResponse.json({ error: "Missing required field: new_owner_id" }, { status: 400 });
  }

  const newOwnerId = (body as Record<string, unknown>).new_owner_id as string;

  if (newOwnerId === user.id) {
    return NextResponse.json({ error: "Cannot transfer ownership to yourself" }, { status: 400 });
  }

  const { data: targetMembership } = await db()
    .from("team_members")
    .select("role")
    .eq("team_id", id)
    .eq("user_id", newOwnerId)
    .maybeSingle();

  if (!targetMembership) {
    return NextResponse.json({ error: "Target user is not a member of this team" }, { status: 404 });
  }

  // Demote current owner to team_manager
  const { error: demoteError } = await db()
    .from("team_members")
    .update({ role: "team_manager" })
    .eq("team_id", id)
    .eq("user_id", user.id);

  if (demoteError) return NextResponse.json({ error: demoteError.message }, { status: 500 });

  // Promote new owner
  const { error: promoteError } = await db()
    .from("team_members")
    .update({ role: "org_owner" })
    .eq("team_id", id)
    .eq("user_id", newOwnerId);

  if (promoteError) return NextResponse.json({ error: promoteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
