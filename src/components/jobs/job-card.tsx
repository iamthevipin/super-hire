'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { JobWithStats } from '@/types/jobs';
import { JobActionMenu } from './job-action-menu';
import { DeleteJobDialog } from './delete-job-dialog';

const ARRANGEMENT_LABEL: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  on_site: 'On-site',
};

interface JobCardProps {
  job: JobWithStats;
  isAdmin: boolean;
}

export function JobCard({ job, isAdmin }: JobCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const arrangementLabel = job.work_arrangement
    ? (ARRANGEMENT_LABEL[job.work_arrangement] ?? job.work_arrangement)
    : null;
  const postedAt = formatRelativeDate(job.created_at);

  return (
    <>
      <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
        <Link
          href={`/dashboard/jobs/${job.id}`}
          className="flex-1 min-w-0 group"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-base font-bold text-[#141d1c] group-hover:text-[#117a72] transition-colors truncate">
              {job.title}
            </h3>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {arrangementLabel && <Tag label={arrangementLabel} />}
            {job.location && <Tag label={job.location} />}
            {job.salary && <Tag label={job.salary} />}
          </div>

          <div className="flex items-center gap-4 text-xs text-[#8fa8a6]">
            <span>
              <span className="font-semibold text-[#3e4947]">{job.candidateCount}</span>{' '}
              {job.candidateCount === 1 ? 'candidate' : 'candidates'}
            </span>
            <span>Posted {postedAt}</span>
            {job.status === 'closed' && (
              <span className="px-2 py-0.5 rounded-full bg-[#f0ece6] text-[#8fa8a6] font-semibold">
                Closed
              </span>
            )}
          </div>
        </Link>

        <JobActionMenu
          jobId={job.id}
          status={job.status}
          isAdmin={isAdmin}
          onDeleteRequest={() => setDeleteOpen(true)}
        />
      </div>

      {deleteOpen && (
        <DeleteJobDialog
          jobId={job.id}
          jobTitle={job.title}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f0ece6] text-[#3e4947]">
      {label}
    </span>
  );
}

function formatRelativeDate(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
