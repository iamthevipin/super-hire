import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface GoogleUserInfo {
  email: string;
}

interface OAuthState {
  userId: string;
  returnTo: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (error || !code || !stateRaw) {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=oauth_denied`);
  }

  let state: OAuthState;
  try {
    state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf-8')) as OAuthState;
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=invalid_state`);
  }

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=not_configured`);
  }

  const redirectUri = `${appUrl}/api/auth/gmail/callback`;

  // Exchange authorization code for tokens
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=token_exchange_failed`);
  }

  const tokens = (await tokenRes.json()) as TokenResponse;

  // Fetch Gmail address from Google
  const userInfoRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=userinfo_failed`);
  }

  const userInfo = (await userInfoRes.json()) as GoogleUserInfo;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state.userId) {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=session_mismatch`);
  }

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('enterprise_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=no_enterprise`);
  }

  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const upsertPayload: Record<string, unknown> = {
    user_id: user.id,
    enterprise_id: membership.enterprise_id,
    provider: 'gmail',
    gmail_address: userInfo.email,
    access_token: tokens.access_token,
    token_expires_at: tokenExpiresAt,
    updated_at: new Date().toISOString(),
  };

  if (tokens.refresh_token) {
    upsertPayload.refresh_token = tokens.refresh_token;
  }

  const { error: upsertError } = await supabase
    .from('user_integrations')
    .upsert(upsertPayload, { onConflict: 'user_id,provider' });

  if (upsertError) {
    console.error('[gmail/callback] upsert error:', JSON.stringify(upsertError));
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=save_failed`);
  }

  return NextResponse.redirect(`${appUrl}${state.returnTo}`);
}
