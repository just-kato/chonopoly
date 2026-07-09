import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@parkhawkinsproperties.com";
function resend() { return new Resend(process.env.RESEND_API_KEY); }

const ROLE_LABELS: Record<string, string> = {
  org_owner: "Owner",
  org_admin: "Admin",
  team_manager: "Manager",
  team_member: "Member",
  viewer: "Viewer",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function fmtExpiry(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function sendExistingUserInviteEmail(opts: {
  to: string;
  teamName: string;
  inviterEmail: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}): void {
  const { to, teamName, inviterEmail, role, acceptUrl, expiresAt } = opts;
  const label = roleLabel(role);

  resend().emails
    .send({
      from: FROM,
      to,
      subject: `You've been invited to join ${teamName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111">
          <h2 style="margin-bottom:4px">Team invitation</h2>
          <p><strong>${inviterEmail}</strong> has invited you to join <strong>${teamName}</strong> as a <strong>${label}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#555">Team</td><td style="text-align:right;font-weight:600">${teamName}</td></tr>
            <tr><td style="padding:6px 0;color:#555">Role</td><td style="text-align:right;font-weight:600">${label}</td></tr>
            <tr><td style="padding:6px 0;color:#555">Invited by</td><td style="text-align:right;font-weight:600">${inviterEmail}</td></tr>
            <tr style="border-top:1px solid #e5e7eb">
              <td style="padding:8px 0;color:#555">Expires</td>
              <td style="text-align:right;font-weight:600">${fmtExpiry(expiresAt)}</td>
            </tr>
          </table>
          <a href="${acceptUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin-top:8px">Accept invitation</a>
          <p style="color:#555;font-size:13px;margin-top:16px">If you weren't expecting this invitation, you can ignore this email.</p>
        </div>
      `,
    })
    .catch(console.error);
}

export function sendNewUserInviteEmail(opts: {
  to: string;
  teamName: string;
  inviterEmail: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}): void {
  const { to, teamName, inviterEmail, role, acceptUrl, expiresAt } = opts;
  const label = roleLabel(role);

  resend().emails
    .send({
      from: FROM,
      to,
      subject: `You've been invited to join ${teamName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111">
          <h2 style="margin-bottom:4px">Team invitation</h2>
          <p><strong>${inviterEmail}</strong> has invited you to join <strong>${teamName}</strong> as a <strong>${label}</strong>.</p>
          <p style="color:#555;font-size:14px">You'll need to create an account to join — click the link below to get started.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#555">Team</td><td style="text-align:right;font-weight:600">${teamName}</td></tr>
            <tr><td style="padding:6px 0;color:#555">Role</td><td style="text-align:right;font-weight:600">${label}</td></tr>
            <tr><td style="padding:6px 0;color:#555">Invited by</td><td style="text-align:right;font-weight:600">${inviterEmail}</td></tr>
            <tr style="border-top:1px solid #e5e7eb">
              <td style="padding:8px 0;color:#555">Expires</td>
              <td style="text-align:right;font-weight:600">${fmtExpiry(expiresAt)}</td>
            </tr>
          </table>
          <a href="${acceptUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin-top:8px">Create account &amp; accept invitation</a>
          <p style="color:#555;font-size:13px;margin-top:16px">If you weren't expecting this invitation, you can ignore this email.</p>
        </div>
      `,
    })
    .catch(console.error);
}
