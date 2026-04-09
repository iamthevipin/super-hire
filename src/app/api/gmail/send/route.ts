import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logActivity } from '@/actions/activity';

const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const TOKEN_REFRESH_URL = 'https://oauth2.googleapis.com/token';

const sendSchema = z.object({
  candidateId: z.string().uuid(),
  applicationId: z.string().uuid().nullable(),
  toEmail: z.string().email(),
  toName: z.string().min(1),
  subject: z.string().min(1).max(998),
  bodyHtml: z.string().min(1),
  bodyText: z.string().min(1),
});

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface GmailIntegrationRow {
  id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  gmail_address: string;
  enterprise_id: string;
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string } | null> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const res = await fetch(TOKEN_REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as TokenResponse;
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  return { accessToken: data.access_token, expiresAt };
}

function buildRfc2822Message(params: {
  from: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
}): string {
  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, '')}`;
  const lines = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    params.bodyText,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    params.bodyHtml,
    '',
    `--${boundary}--`,
  ];
  return lines.join('\r\n');
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('enterprise_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'No enterprise' }, { status: 403 });
  }

  if (!['admin', 'owner'].includes(membership.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  const { candidateId, applicationId, toEmail, toName, subject, bodyHtml, bodyText } = parsed.data;

  // Verify candidateId belongs to the caller's enterprise (prevents IDOR)
  const { data: candidate } = await supabase
    .from('candidates')
    .select('id')
    .eq('id', candidateId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }

  // Fetch the caller's Gmail integration
  const { data: integration, error: integrationError } = await supabase
    .from('user_integrations')
    .select('id, access_token, refresh_token, token_expires_at, gmail_address, enterprise_id')
    .eq('user_id', user.id)
    .eq('provider', 'gmail')
    .single();

  if (integrationError || !integration) {
    return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 });
  }

  const row = integration as GmailIntegrationRow;

  // Check if token needs refreshing (refresh if within 60 seconds of expiry)
  let accessToken = row.access_token;
  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  const needsRefresh = expiresAt - Date.now() < 60_000;

  if (needsRefresh && row.refresh_token) {
    const refreshed = await refreshAccessToken(row.refresh_token);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      await supabase
        .from('user_integrations')
        .update({
          access_token: refreshed.accessToken,
          token_expires_at: refreshed.expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
    } else {
      return NextResponse.json({ error: 'Token refresh failed. Please reconnect Gmail.' }, { status: 401 });
    }
  }

  // Fetch sender display name from user metadata
  const senderName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    row.gmail_address;

  const fromHeader = `${senderName} <${row.gmail_address}>`;
  const toHeader = `${toName} <${toEmail}>`;

  const rawMessage = buildRfc2822Message({
    from: fromHeader,
    to: toHeader,
    subject,
    bodyText,
    bodyHtml,
  });

  const encodedMessage = Buffer.from(rawMessage).toString('base64url');

  // Send via Gmail API
  const gmailRes = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!gmailRes.ok) {
    const errBody = await gmailRes.text();
    console.error('[gmail/send] Gmail API error:', gmailRes.status, errBody);
    return NextResponse.json(
      { error: 'Failed to send email. Please try again.' },
      { status: 502 }
    );
  }

  // Persist email record
  const { error: insertError } = await supabase.from('candidate_emails').insert({
    enterprise_id: membership.enterprise_id,
    candidate_id: candidateId,
    sender_user_id: user.id,
    sender_name: senderName,
    sender_gmail_address: row.gmail_address,
    subject,
    body_html: bodyHtml,
    body_text: bodyText,
    sent_at: new Date().toISOString(),
  });

  if (insertError) {
    // Email was sent — DB persistence failed; suppress to avoid confusing the caller
    // In production, wire this to a proper server logger or alerting system
  }

  // Log activity
  await logActivity({
    supabase,
    enterprise_id: membership.enterprise_id as string,
    candidate_id: candidateId,
    application_id: applicationId,
    event_type: 'email_sent',
    actor_id: user.id,
    actor_name: senderName,
    description: `Sent email: ${subject}`,
    metadata: { subject, to: toEmail },
  });

  return NextResponse.json({ success: true });
}
