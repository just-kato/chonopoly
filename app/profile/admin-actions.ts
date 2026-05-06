"use server";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export type UserRow = {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  role: "admin" | "user";
  created_at: string;
  invited: boolean;
};

function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (data?.role !== "admin") throw new Error("Not authorized.");
  return user;
}

export async function listUsers(): Promise<UserRow[]> {
  const caller = await assertAdmin();
  const admin = serviceClient();

  const [{ data: authData }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("id, username, display_name, role"),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  return (authData?.users ?? [])
    .filter((u) => u.id !== caller.id)
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      username: profileMap.get(u.id)?.username ?? null,
      display_name: profileMap.get(u.id)?.display_name ?? null,
      role: (profileMap.get(u.id)?.role ?? "user") as "admin" | "user",
      created_at: u.created_at,
      // invited_at is set for email invites; treat as pending until email is confirmed
      invited: !!u.invited_at && !u.email_confirmed_at,
    }))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function updateUserRole(
  userId: string,
  role: "admin" | "user"
): Promise<{ error?: string }> {
  await assertAdmin();
  const admin = serviceClient();

  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };
  return {};
}

export async function updateUserProfile(
  userId: string,
  fields: { display_name?: string; username?: string }
): Promise<{ error?: string }> {
  await assertAdmin();
  const admin = serviceClient();

  const { error } = await admin
    .from("profiles")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    if (error.code === "23505") return { error: "That username is already taken." };
    return { error: error.message };
  }
  return {};
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  await assertAdmin();
  const admin = serviceClient();

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return {};
}

async function getRedirectOrigin(): Promise<string> {
  const headersList = await headers();
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    headersList.get("origin") ??
    `https://${headersList.get("host")}`
  );
}

async function sendInviteEmail(email: string): Promise<{ error?: string }> {
  const admin = serviceClient();
  const origin = await getRedirectOrigin();

  // Generate the invite link without Supabase sending the email
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${origin}/setup` },
  });

  if (linkError) return { error: linkError.message };

  const inviteUrl = data?.properties?.action_link;
  if (!inviteUrl) return { error: "Failed to generate invite link." };

  // Send via Resend SDK directly
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@chonopoly.vercel.app";

  const { error: emailError } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "You're invited to GA Real Estate Exam Prep",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0f0f11; color: #e8e6df;">
        <div style="margin-bottom: 24px;">
          <span style="background: #f59e0b; color: #000; font-family: monospace; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.1em;">
            GA EXAM PREP
          </span>
        </div>
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #fff;">
          You've been invited
        </h1>
        <p style="color: #7a7870; margin: 0 0 28px; line-height: 1.6;">
          You've been invited to access the Georgia Real Estate Exam Prep study guide.
          Click the button below to set up your account.
        </p>
        <a href="${inviteUrl}"
           style="display: inline-block; background: #f59e0b; color: #000; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          Accept invitation →
        </a>
        <p style="color: #4a4a55; font-size: 12px; margin: 28px 0 0;">
          This link expires in 24 hours. If you weren't expecting this, you can ignore this email.
        </p>
      </div>
    `,
  });

  if (emailError) return { error: emailError.message };
  return {};
}

export async function inviteUser(email: string): Promise<{ error?: string }> {
  await assertAdmin();
  return sendInviteEmail(email);
}

export async function resendInvite(email: string): Promise<{ error?: string }> {
  await assertAdmin();
  return sendInviteEmail(email);
}
