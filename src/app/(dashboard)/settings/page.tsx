import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { SettingsNav } from '@/components/settings/settings-nav';
import { TeamMembersTab } from '@/components/settings/team-members-tab';

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export interface MemberRow {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'invited' | 'expired';
  joinedAt: string;
  inviteId?: string;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { tab = 'profile' } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('enterprise_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) redirect('/onboarding');

  // Fetch enterprise members and pending invites in parallel
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from('enterprise_members')
      .select('id, user_id, role, created_at')
      .eq('enterprise_id', membership.enterprise_id)
      .order('created_at', { ascending: true }),
    supabase
      .from('pending_invites')
      .select('id, enterprise_id, email, role, invited_by, status, created_at, expires_at')
      .eq('enterprise_id', membership.enterprise_id)
      .neq('status', 'active')
      .order('created_at', { ascending: false }),
  ]);

  // Fetch all auth users in a single Admin API call, then map by ID
  const admin = createAdminClient();
  const { data: { users: allUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const memberRows: MemberRow[] = (members ?? []).map((member) => {
    const authUser = userMap.get(member.user_id as string);
    return {
      id: member.id as string,
      userId: member.user_id as string,
      name:
        (authUser?.user_metadata?.full_name as string | undefined) ??
        authUser?.email ??
        'Unknown',
      email: authUser?.email ?? '',
      role: member.role as string,
      status: 'active' as const,
      joinedAt: member.created_at as string,
    };
  });

  // Add pending invite rows
  const inviteRows: MemberRow[] = (invites ?? []).map((inv) => {
    const emailName = inv.email.split('@')[0] ?? inv.email;
    return {
      id: inv.id as string,
      userId: null,
      name: emailName,
      email: inv.email as string,
      role: inv.role as string,
      status: (inv.status === 'invited' ? 'invited' : 'expired') as 'invited' | 'expired',
      joinedAt: inv.created_at as string,
      inviteId: inv.id as string,
    };
  });

  const allRows: MemberRow[] = [...memberRows, ...inviteRows];

  return (
    <div className="flex gap-6 max-w-6xl mx-auto">
      {/* Sidebar */}
      <aside className="w-60 shrink-0">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-[#141d1c] px-2 mb-3">Settings</p>
          <SettingsNav activeTab={tab} />
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {tab === 'team' && (
          <TeamMembersTab
            rows={allRows}
            userRole={membership.role as string}
          />
        )}

        {tab === 'profile' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-[#141d1c] mb-1">Enterprise Profile</h1>
            <p className="text-sm text-[#3e4947]">Manage your company details</p>
            <div className="mt-8 text-sm text-[#8fa8a6]">
              Enterprise profile settings coming soon.
            </div>
          </div>
        )}

        {tab === 'subscription' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-[#141d1c] mb-1">Subscription</h1>
            <p className="text-sm text-[#3e4947]">Manage your plan</p>
            <div className="mt-8 text-sm text-[#8fa8a6]">
              Subscription management coming soon.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

