import { createClient } from "./client";

export type Profile = {
  username: string | null;
  last_chapter_id: string | null;
  last_tab_slug: string | null;
  role: "admin" | "user";
  avatar_url: string | null;
  avatar_color: string | null;
  onboarding_complete: boolean;
  pay_cycle_start_day: number | null;
  morning_report_enabled: boolean;
  health_score_last_calculated: string | null;
};

const EMPTY: Profile = {
  username: null,
  last_chapter_id: null,
  last_tab_slug: null,
  role: "user",
  avatar_url: null,
  avatar_color: "amber",
  onboarding_complete: false,
  pay_cycle_start_day: 1,
  morning_report_enabled: true,
  health_score_last_calculated: null,
};

export async function loadProfile(): Promise<Profile> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const { data } = await supabase
    .from("profiles")
    .select("username, last_chapter_id, last_tab_slug, role, avatar_url, avatar_color, onboarding_complete, pay_cycle_start_day, morning_report_enabled, health_score_last_calculated")
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

export async function updateProfileSettings(fields: {
  pay_cycle_start_day?: number;
  morning_report_enabled?: boolean;
  onboarding_complete?: boolean;
}): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const patch: Record<string, unknown> = { id: user.id, updated_at: new Date().toISOString() };
  if (fields.pay_cycle_start_day !== undefined) patch.pay_cycle_start_day = fields.pay_cycle_start_day;
  if (fields.morning_report_enabled !== undefined) patch.morning_report_enabled = fields.morning_report_enabled;
  if (fields.onboarding_complete !== undefined) patch.onboarding_complete = fields.onboarding_complete;

  const { error } = await supabase.from("profiles").upsert(patch, { onConflict: "id" });
  if (error) return { error: error.message };
  return {};
}

export async function uploadAvatar(file: File): Promise<{ url?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("PH assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from("PH assets").getPublicUrl(path);
  return { url: `${data.publicUrl}?t=${Date.now()}` };
}
