import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getKanbanData } from '@/actions/kanban';
import { KanbanBoard } from '@/components/candidates/kanban-board';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const { jobId } = await params;

  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);
  if (!isValidUuid) notFound();

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

  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, status')
    .eq('id', jobId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!job) notFound();

  const columns = await getKanbanData(jobId);

  return (
    <div className="px-4 py-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 text-xs text-[#8fa8a6] mb-2">
          <Link href="/dashboard" className="hover:text-[#141d1c] transition-colors">
            Jobs
          </Link>
          <span>/</span>
          <span className="text-[#3e4947]">{job.title as string}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#141d1c]">{job.title as string}</h1>
          <Link
            href={`/dashboard/jobs/${jobId}/edit`}
            className="text-xs text-[#8fa8a6] border border-[#d4e0de] px-3 py-1.5 rounded-lg hover:bg-[#f4f9f8] transition-colors"
          >
            Edit job
          </Link>
        </div>
      </div>

      <KanbanBoard
        initialColumns={columns}
        jobId={jobId}
      />
    </div>
  );
}
