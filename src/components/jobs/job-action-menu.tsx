'use client';

import { useRef, useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { closeJob, reopenJob } from '@/actions/jobs';
import type { JobStatus } from '@/types/jobs';

interface JobActionMenuProps {
  jobId: string;
  status: JobStatus;
  isAdmin: boolean;
  onDeleteRequest: () => void;
}

export function JobActionMenu({ jobId, status, isAdmin, onDeleteRequest }: JobActionMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleToggleStatus() {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const result = status === 'open' ? await closeJob(jobId) : await reopenJob(jobId);
      if ('error' in result) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  if (!isAdmin) return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="p-1.5 rounded-md text-[#8fa8a6] hover:text-[#141d1c] hover:bg-[#f0ece6] transition-colors disabled:opacity-50"
        aria-label="Job actions"
      >
        <KebabIcon />
      </button>

      {error && (
        <p className="absolute right-0 top-9 z-20 w-64 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {open && (
        <div className="absolute right-0 top-9 z-20 w-48 rounded-xl bg-white border border-[#e0d9d0] shadow-lg py-1">
          <button
            type="button"
            onClick={handleToggleStatus}
            className={cn(
              'w-full text-left px-4 py-2 text-sm transition-colors',
              'hover:bg-[#f0ece6] text-[#3e4947]'
            )}
          >
            {status === 'open' ? 'Close Job' : 'Reopen Job'}
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push(`/dashboard/jobs/${jobId}/edit`);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-[#f0ece6] text-[#3e4947] transition-colors"
          >
            Edit Details
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push(`/dashboard/jobs/${jobId}/pipeline`);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-[#f0ece6] text-[#3e4947] transition-colors"
          >
            Edit Pipeline
          </button>

          <hr className="my-1 border-[#e0d9d0]" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDeleteRequest();
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 transition-colors"
          >
            Delete Job
          </button>
        </div>
      )}
    </div>
  );
}

function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  );
}
