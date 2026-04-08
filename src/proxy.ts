import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isDashboard  = pathname.startsWith('/dashboard') || pathname.startsWith('/settings')
  const isOnboarding = pathname === '/onboarding'
  const isAuthRoute  =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/verify-otp')

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!user) {
    if (isDashboard || isOnboarding) {
      return redirectTo(request, supabaseResponse, '/login')
    }
    return supabaseResponse
  }

  // ── Authenticated — only query DB for routes that need it ─────────────────
  if (isDashboard || isOnboarding || isAuthRoute) {
    const hasEnterprise = await checkEnterprise(user.id)

    // Trying to reach /dashboard without an enterprise → onboarding
    if (isDashboard && !hasEnterprise) {
      return redirectTo(request, supabaseResponse, '/onboarding')
    }

    // Already set up enterprise but landed on /onboarding again → dashboard
    if (isOnboarding && hasEnterprise) {
      return redirectTo(request, supabaseResponse, '/dashboard')
    }

    // Authenticated user hitting /login or /signup → send them home
    if (isAuthRoute) {
      return redirectTo(
        request,
        supabaseResponse,
        hasEnterprise ? '/dashboard' : '/onboarding'
      )
    }
  }

  return supabaseResponse
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function redirectTo(
  request: NextRequest,
  supabaseResponse: NextResponse,
  destination: string
): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = destination
  url.search = ''
  const response = NextResponse.redirect(url)

  // Forward session cookies so the browser keeps the refreshed session.
  supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) => {
    response.cookies.set({ name, value, ...opts })
  })

  return response
}

async function checkEnterprise(userId: string): Promise<boolean> {
  // Use the service role key so this query bypasses RLS entirely.
  // The user has already been verified by updateSession above — this is a
  // purely internal existence check, not a user-facing data read.
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('enterprise_members')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  return data !== null
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
