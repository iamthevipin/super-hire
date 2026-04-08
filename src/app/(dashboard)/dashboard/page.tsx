import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getJobs, getJobMetrics } from '@/actions/jobs';
import { MetricCards } from '@/components/jobs/metric-cards';
import { FilterChips } from '@/components/jobs/filter-chips';
import { JobCard } from '@/components/jobs/job-card';
import type { JobStatus } from '@/types/jobs';

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { status: rawStatus } = await searchParams;
  const status: JobStatus = rawStatus === 'closed' ? 'closed' : 'open';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: membership } = await supabase
      .from('enterprise_members')
      .select('role')
      .eq('user_id', user.id)
      .single();
    isAdmin = membership?.role === 'admin' || membership?.role === 'owner';
  }

  const [jobs, metrics] = await Promise.all([getJobs(status), getJobMetrics()]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#141d1c]">Jobs</h1>
        {isAdmin && (
          <Link
            href="/dashboard/jobs/new"
            className="px-4 py-2 rounded-lg bg-[#141d1c] text-white text-sm font-semibold hover:bg-[#1f2e2c] transition-colors"
          >
            New Job
          </Link>
        )}
      </div>

      <MetricCards metrics={metrics} />

      <FilterChips />

      {jobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#8fa8a6] text-sm">
            {status === 'open' ? 'No active jobs yet.' : 'No closed jobs.'}
          </p>
          {isAdmin && status === 'open' && (
            <Link
              href="/dashboard/jobs/new"
              className="mt-4 inline-block px-4 py-2 rounded-lg bg-[#141d1c] text-white text-sm font-semibold hover:bg-[#1f2e2c] transition-colors"
            >
              Create your first job
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
