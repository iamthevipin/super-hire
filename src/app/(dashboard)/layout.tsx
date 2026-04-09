import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { WELCOME_CONTEXT_COOKIE } from '@/lib/constants/auth';
import { WelcomeModalContainer } from '@/components/auth/welcome-modal';
import { ComposeProvider } from '@/components/email/compose-provider';
import { ComposeManager } from '@/components/email/compose-manager';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const welcomeRaw = cookieStore.get(WELCOME_CONTEXT_COOKIE)?.value;

  let welcomeData: { enterpriseName: string; role: string } | null = null;
  if (welcomeRaw) {
    try {
      welcomeData = JSON.parse(welcomeRaw) as { enterpriseName: string; role: string };
    } catch {
      welcomeData = null;
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? '';

  return (
    <ComposeProvider>
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0eb' }}>
      {/* Top nav */}
      <header className="h-14 flex items-center px-6 bg-transparent">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-[#117a72] no-underline mr-10"
        >
          <svg width="14" height="18" viewBox="0 0 16 20" fill="none" aria-hidden="true">
            <path d="M9 0L0 11h7l-2 9L16 9H9l2-9z" fill="#117a72" />
          </svg>
          <span className="text-base font-extrabold tracking-tight text-[#141d1c]">
            Super Hire
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-sm font-medium text-[#3e4947] hover:text-[#141d1c] rounded-md hover:bg-black/5 transition-colors"
          >
            Jobs
          </Link>
          <Link
            href="/dashboard/talent"
            className="px-3 py-1.5 text-sm font-medium text-[#3e4947] hover:text-[#141d1c] rounded-md hover:bg-black/5 transition-colors"
          >
            Talent Pool
          </Link>
          <Link
            href="/dashboard/career-site"
            className="px-3 py-1.5 text-sm font-medium text-[#3e4947] hover:text-[#141d1c] rounded-md hover:bg-black/5 transition-colors"
          >
            Career Site
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#3e4947] hover:bg-black/5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          <div className="w-8 h-8 rounded-full bg-[#117a72] overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">
                {fullName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="px-6 py-6">{children}</main>

      {welcomeData && (
        <WelcomeModalContainer
          enterpriseName={welcomeData.enterpriseName}
          role={welcomeData.role}
          shouldClear
        />
      )}
      <ComposeManager />
    </div>
    </ComposeProvider>
  );
}
