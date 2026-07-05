import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const EMAIL_FROM = process.env.EMAIL_FROM ?? "AgriFlow <onboarding@resend.dev>";
const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// ─── Send functions ───────────────────────────────────────────────────────────

export async function sendInvitationEmail({
  toEmail,
  inviterName,
  orgName,
  invitationId,
}: {
  toEmail: string;
  inviterName: string;
  orgName: string;
  invitationId: string;
}) {
  const acceptUrl = `${APP_URL}/accept-invitation?invitationId=${invitationId}`;
  await getResend().emails.send({
    from: EMAIL_FROM,
    to: toEmail,
    subject: `You're invited to join ${orgName} on AgriFlow`,
    html: invitationEmailHtml({ inviterName, orgName, acceptUrl }),
  });
}

export async function sendVerificationEmail({
  toEmail,
  userName,
  url,
}: {
  toEmail: string;
  userName: string;
  url: string;
}) {
  await getResend().emails.send({
    from: EMAIL_FROM,
    to: toEmail,
    subject: "Verify your email — AgriFlow",
    html: verificationEmailHtml({ userName, url }),
  });
}

// ─── HTML templates ───────────────────────────────────────────────────────────

function emailWrapper(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AgriFlow</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr>
            <td style="background:#16a34a;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.02em;">AgriFlow</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                If you didn&apos;t expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function invitationEmailHtml({
  inviterName,
  orgName,
  acceptUrl,
}: {
  inviterName: string;
  orgName: string;
  acceptUrl: string;
}) {
  return emailWrapper(`
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.02em;">
      You&apos;ve been invited
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      <strong style="color:#111827;">${inviterName}</strong> has invited you to join
      <strong style="color:#111827;">${orgName}</strong> on AgriFlow.
    </p>
    <a href="${acceptUrl}"
       style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;
              padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
      Accept invitation
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
      This invitation expires in 48 hours. If the button above doesn&apos;t work, copy this link:<br/>
      <a href="${acceptUrl}" style="color:#16a34a;word-break:break-all;">${acceptUrl}</a>
    </p>
  `);
}

function verificationEmailHtml({
  userName,
  url,
}: {
  userName: string;
  url: string;
}) {
  return emailWrapper(`
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.02em;">
      Verify your email
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${userName}, click the button below to verify your email address and finish setting up your AgriFlow account.
    </p>
    <a href="${url}"
       style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;
              padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
      Verify email address
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
      If the button above doesn&apos;t work, copy this link:<br/>
      <a href="${url}" style="color:#16a34a;word-break:break-all;">${url}</a>
    </p>
  `);
}
