import { createClient } from "./client";

export type Profile = {
  username: string | null;
  display_name: string | null;
  last_chapter_id: string | null;
  last_tab_slug: string | null;
  role: "admin" | "user";
};

const EMPTY: Profile = {
  username: null,
  display_name: null,
  last_chapter_id: null,
  last_tab_slug: null,
  role: "user",
};

export async function loadProfile(): Promise<Profile> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, last_chapter_id, last_tab_slug, role")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? EMPTY;
}

export async function saveLastPosition(
  chapterId: string,
  tabSlug: string
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      last_chapter_id: chapterId,
      last_tab_slug: tabSlug,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

export async function updateProfile(fields: {
  username?: string | null;
  displayName?: string | null;
}): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      ...(fields.username !== undefined && { username: fields.username || null }),
      ...(fields.displayName !== undefined && { display_name: fields.displayName || null }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    if (error.code === "23505") return { error: "That username is already taken." };
    return { error: error.message };
  }

  return {};
}
