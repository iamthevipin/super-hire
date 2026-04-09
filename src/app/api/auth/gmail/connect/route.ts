import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

const GMAIL_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'].join(' ');

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || !['admin', 'owner'].includes(membership.role as string)) {
    return new Response('Forbidden', { status: 403 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return new Response('OAuth not configured', { status: 500 });
  }

  const redirectUri = `${appUrl}/api/auth/gmail/callback`;

  const state = Buffer.from(
    JSON.stringify({ userId: user.id, returnTo: request.nextUrl.searchParams.get('returnTo') ?? '/settings?tab=integrations' })
  ).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return redirect(`${GMAIL_AUTH_URL}?${params.toString()}`);
}
