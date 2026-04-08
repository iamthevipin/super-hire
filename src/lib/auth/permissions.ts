import { createClient } from '@/lib/supabase/server';

export type EnterpriseRole = 'owner' | 'admin' | 'member';

export function isAdmin(role: string): boolean {
  return role === 'admin' || role === 'owner';
}

export function isMember(role: string): boolean {
  return role === 'member';
}

// Derives the authenticated user's role from their own membership row.
// Never accepts an enterpriseId parameter — enterprise is always derived server-side.
export async function getUserRole(): Promise<EnterpriseRole | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('enterprise_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return (data?.role as EnterpriseRole | undefined) ?? null;
}
