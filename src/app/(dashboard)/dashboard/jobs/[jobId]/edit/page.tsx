import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CreateJobForm } from '@/components/jobs/create-job-form';
import type { Job } from '@/types/jobs';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function EditJobPage({ params }: PageProps) {
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
    .select('id, enterprise_id, title, location, work_arrangement, salary, description_overview, description_responsibilities, description_requirements, status, created_by, created_at, updated_at')
    .eq('id', jobId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();

  if (!job) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
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
        <h1 className="text-2xl font-bold text-[#141d1c]">Edit Job</h1>
        <p className="text-sm text-[#8fa8a6] mt-1">Update the job details below.</p>
      </div>

      <CreateJobForm job={job as unknown as Job} />
    </div>
  );
}
