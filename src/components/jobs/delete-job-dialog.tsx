'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteJob } from '@/actions/jobs';

interface DeleteJobDialogProps {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
}

export function DeleteJobDialog({ jobId, jobTitle, onClose }: DeleteJobDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteJob(jobId);
      if ('error' in result) {
        onClose();
        // Surface error by re-triggering — parent handles toast/inline
        alert(result.error);
      } else {
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-lg font-bold text-[#141d1c] mb-2">Delete Job</h2>
        <p className="text-sm text-[#3e4947] mb-1">
          Are you sure you want to delete{' '}
          <span className="font-semibold">{jobTitle}</span>?
        </p>
        <p className="text-xs text-[#8fa8a6] mb-6">
          This action cannot be undone. Jobs with candidates in the pipeline cannot be deleted.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-[#e0d9d0] text-[#3e4947] hover:border-[#141d1c] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
