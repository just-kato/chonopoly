import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data } = await supabase
      .from("team_members")
      .select("teams(id, name)")
      .eq("user_id", user.id);

    type TeamRow = { teams: { id: string; name: string } | { id: string; name: string }[] | null };
    const teams = ((data as unknown as TeamRow[]) ?? [])
      .map(r => r.teams)
      .filter((t): t is { id: string; name: string } => t != null && !Array.isArray(t));

    return NextResponse.json({ teams });
  } catch {
    // team_members or teams table may not exist yet
    return NextResponse.json({ teams: [] });
  }
}
