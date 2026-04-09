import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const GMAIL_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export async function GET(request: NextRequest) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const clientId = process.env.GMAIL_CLIENT_ID;

    if (!appUrl || !clientId) {
      return new NextResponse('OAuth not configured', { status: 500 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${appUrl}/login`);
    }

    const { data: membership } = await supabase
      .from('enterprise_members')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!membership || !['admin', 'owner'].includes(membership.role as string)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const redirectUri = `${appUrl}/api/auth/gmail/callback`;

    const statePayload = {
      userId: user.id,
      returnTo: request.nextUrl.searchParams.get('returnTo') ?? '/settings?tab=integrations',
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return NextResponse.redirect(`${GMAIL_AUTH_URL}?${params.toString()}`);
  } catch (err) {
    console.error('[gmail/connect] unhandled error:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
