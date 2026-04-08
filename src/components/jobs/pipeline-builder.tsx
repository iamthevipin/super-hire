'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addStage } from '@/actions/pipeline';
import { PipelineStageItem } from './pipeline-stage-item';
import type { PipelineStage } from '@/types/jobs';

interface PipelineBuilderProps {
  jobId: string;
  stages: PipelineStage[];
}

export function PipelineBuilder({ jobId, stages }: PipelineBuilderProps) {
  const router = useRouter();
  const [addingAfter, setAddingAfter] = useState<number | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nonLockedStages = stages.filter((s) => !s.is_locked);

  function handleAddStage(afterPosition: number) {
    if (!newStageName.trim()) {
      setAddError('Stage name is required');
      return;
    }
    setAddError(null);
    startTransition(async () => {
      const result = await addStage(jobId, newStageName.trim(), afterPosition);
      if ('error' in result) {
        setAddError(result.error);
      } else {
        setNewStageName('');
        setAddingAfter(null);
        router.refresh();
      }
    });
  }

  function cancelAdd() {
    setAddingAfter(null);
    setNewStageName('');
    setAddError(null);
  }

  return (
    <div className="space-y-2">
      {stages.map((stage) => {
        const isFirstNonLocked = !stage.is_locked && nonLockedStages[0]?.id === stage.id;
        const isLastNonLocked = !stage.is_locked && nonLockedStages[nonLockedStages.length - 1]?.id === stage.id;

        return (
          <div key={stage.id}>
            <PipelineStageItem
              stage={stage}
              isFirst={isFirstNonLocked}
              isLast={isLastNonLocked}
            />

            {/* Add stage button — shown between non-locked and before Hired/Rejected */}
            {!stage.is_locked && (
              <>
                {addingAfter === stage.position ? (
                  <div className="mt-2 mb-2 pl-8 flex items-start gap-2">
                    <div className="flex-1">
                      <input
                        autoFocus
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddStage(stage.position);
                          if (e.key === 'Escape') cancelAdd();
                        }}
                        maxLength={60}
                        placeholder="Stage name"
                        className="w-full rounded-lg border border-[#141d1c] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#141d1c]/10"
                      />
                      {addError && <p className="mt-1 text-xs text-red-600">{addError}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddStage(stage.position)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-lg bg-[#141d1c] text-white text-sm font-semibold disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={cancelAdd}
                      disabled={isPending}
                      className="px-3 py-2 rounded-lg border border-[#e0d9d0] text-sm text-[#3e4947] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center my-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAddingAfter(stage.position);
                        setNewStageName('');
                        setAddError(null);
                      }}
                      className="text-xs text-[#8fa8a6] hover:text-[#141d1c] flex items-center gap-1 transition-colors"
                    >
                      <span className="text-base leading-none">+</span>
                      <span>Add stage here</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      <div className="pt-4 flex justify-end">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="px-5 py-2.5 rounded-lg bg-[#141d1c] text-white text-sm font-semibold hover:bg-[#1f2e2c] transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
