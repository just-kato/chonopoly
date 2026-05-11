import { createClient } from "./client";

export type Profile = {
  username: string | null;
  last_chapter_id: string | null;
  last_tab_slug: string | null;
  role: "admin" | "user";
  avatar_url: string | null;
  avatar_color: string | null;
};

const EMPTY: Profile = {
  username: null,
  last_chapter_id: null,
  last_tab_slug: null,
  role: "user",
  avatar_url: null,
  avatar_color: "amber",
};

export async function loadProfile(): Promise<Profile> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const { data } = await supabase
    .from("profiles")
    .select("username, last_chapter_id, last_tab_slug, role, avatar_url, avatar_color")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? EMPTY;
}

export async function saveLastPosition(chapterId: string, tabSlug: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").upsert(
    { id: user.id, last_chapter_id: chapterId, last_tab_slug: tabSlug, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
}

export async function updateProfile(fields: {
  username?: string | null;
  avatarUrl?: string | null;
  avatarColor?: string | null;
}): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      ...(fields.username !== undefined && { username: fields.username || null }),
      ...(fields.avatarUrl !== undefined && { avatar_url: fields.avatarUrl }),
      ...(fields.avatarColor !== undefined && { avatar_color: fields.avatarColor }),
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

export async function uploadAvatar(file: File): Promise<{ url?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: `${data.publicUrl}?t=${Date.now()}` };
}
