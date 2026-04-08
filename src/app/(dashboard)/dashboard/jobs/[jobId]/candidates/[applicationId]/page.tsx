import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCandidateDetail } from '@/actions/candidates';
import { CandidateDetailClient } from '@/components/candidates/candidate-detail-client';

interface PageProps {
  params: Promise<{ jobId: string; applicationId: string }>;
}

export default async function CandidateDetailPage({ params }: PageProps) {
  const { jobId, applicationId } = await params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(jobId) || !uuidRegex.test(applicationId)) notFound();

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
  if (!membership) redirect('/dashboard');

  const result = await getCandidateDetail(applicationId);
  if (result.error || !result.data) notFound();

  const detail = result.data;

  const { data: job } = await supabase
    .from('jobs')
    .select('title')
    .eq('id', jobId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();

  const jobTitle = (job as { title: string } | null)?.title ?? '';

  const isAdmin = ['admin', 'owner'].includes(membership.role);

  return (
    <CandidateDetailClient
      detail={detail}
      applicationId={applicationId}
      jobId={jobId}
      jobTitle={jobTitle}
      isAdmin={isAdmin}
      currentUserId={user.id}
    />
  );
}
