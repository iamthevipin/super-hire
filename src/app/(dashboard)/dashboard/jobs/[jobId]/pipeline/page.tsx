import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getStages } from '@/actions/pipeline';
import { PipelineBuilder } from '@/components/jobs/pipeline-builder';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function PipelinePage({ params }: PageProps) {
  const { jobId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('role, enterprise_id')
    .eq('user_id', user.id)
    .single();

  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';
  if (!isAdmin) redirect('/dashboard');

  const { data: job } = await supabase
    .from('jobs')
    .select('id, title')
    .eq('id', jobId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();

  if (!job) notFound();

  const stages = await getStages(jobId);

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-2">
        <Link
          href="/dashboard"
          className="text-xs text-[#8fa8a6] hover:text-[#141d1c] transition-colors"
        >
          Jobs
        </Link>
        <span className="text-xs text-[#b8c8c6] mx-1">/</span>
        <span className="text-xs text-[#3e4947]">{job.title as string}</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#141d1c]">Pipeline</h1>
        <p className="text-sm text-[#8fa8a6] mt-1">
          Customize the hiring stages for this job. Locked stages cannot be modified.
        </p>
      </div>

      <PipelineBuilder jobId={jobId} stages={stages} />
    </div>
  );
}
