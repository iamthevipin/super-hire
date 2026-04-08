import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function sendInviteEmail(
  to: string,
  enterpriseName: string,
  invitedByName: string,
  inviteToken: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not configured');
  if (!fromEmail) throw new Error('RESEND_FROM_EMAIL is not configured');

  const inviteUrl = `${appUrl}/join?token=${inviteToken}`;
  const safeEnterpriseName = escapeHtml(enterpriseName);
  const safeInvitedByName = escapeHtml(invitedByName);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: `You've been invited to join ${safeEnterpriseName} on Super Hire`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 32px; background: #ffffff;">
        <div style="margin-bottom: 32px;">
          <span style="font-size: 20px; font-weight: 800; color: #117a72;">Super Hire</span>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; color: #141d1c; margin: 0 0 12px;">
          You've been invited to join ${safeEnterpriseName}
        </h1>
        <p style="font-size: 15px; color: #3e4947; margin: 0 0 32px; line-height: 1.6;">
          <strong>${safeInvitedByName}</strong> has invited you to join
          <strong>${safeEnterpriseName}</strong> on Super Hire — a hiring pipeline for fast-moving teams.
        </p>
        <a
          href="${inviteUrl}"
          style="
            display: inline-block;
            background-color: #117a72;
            color: #ffffff;
            padding: 14px 36px;
            border-radius: 999px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
          "
        >
          Accept Invitation
        </a>
        <p style="font-size: 13px; color: #8fa8a6; margin-top: 32px; line-height: 1.5;">
          This invitation expires in 7 days. If you did not expect this email, you can safely ignore it.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Resend: ${error.message}`);
}
