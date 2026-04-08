'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/types/jobs';

export function FilterChips() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get('status') ?? 'open') as JobStatus;

  function select(status: JobStatus) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('status', status);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 mb-6">
      <Chip
        label="Active Jobs"
        active={current === 'open'}
        onClick={() => select('open')}
      />
      <Chip
        label="Closed Jobs"
        active={current === 'closed'}
        onClick={() => select('closed')}
      />
    </div>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors',
        active
          ? 'bg-[#141d1c] text-white border-[#141d1c]'
          : 'bg-white text-[#3e4947] border-[#e0d9d0] hover:border-[#141d1c] hover:text-[#141d1c]'
      )}
    >
      {label}
    </button>
  );
}
