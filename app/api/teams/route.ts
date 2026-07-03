import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/teams — create org + team + team_members (org_owner) atomically
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  // 1. Create organization
  const { data: org, error: orgError } = await db()
    .from("organizations")
    .insert({ name, owner_id: user.id })
    .select("id")
    .single();

  if (orgError || !org) {
    return NextResponse.json(
      { error: orgError?.message ?? "Failed to create organization" },
      { status: 500 }
    );
  }

  // 2. Create team
  const { data: team, error: teamError } = await db()
    .from("teams")
    .insert({ org_id: org.id, name })
    .select("id, name")
    .single();

  if (teamError || !team) {
    return NextResponse.json(
      { error: teamError?.message ?? "Failed to create team" },
      { status: 500 }
    );
  }

  // 3. Add caller as org_owner
  const { error: memberError } = await db()
    .from("team_members")
    .insert({ team_id: team.id, user_id: user.id, role: "org_owner" });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ team: { id: team.id, name: team.name } }, { status: 201 });
}
