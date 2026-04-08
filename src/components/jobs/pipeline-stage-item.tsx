'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { renameStage, deleteStage, moveStageUp, moveStageDown } from '@/actions/pipeline';
import type { PipelineStage } from '@/types/jobs';

interface PipelineStageItemProps {
  stage: PipelineStage;
  isFirst: boolean;
  isLast: boolean;
}

export function PipelineStageItem({ stage, isFirst, isLast }: PipelineStageItemProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRename() {
    if (name.trim() === stage.name) {
      setEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await renameStage(stage.id, name.trim());
      if ('error' in result) {
        setError(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteStage(stage.id);
      if ('error' in result) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleMoveUp() {
    startTransition(async () => {
      await moveStageUp(stage.id);
      router.refresh();
    });
  }

  function handleMoveDown() {
    startTransition(async () => {
      await moveStageDown(stage.id);
      router.refresh();
    });
  }

  return (
    <div className={cn('bg-white rounded-xl border border-[#e0d9d0] px-4 py-3', isPending && 'opacity-50')}>
      <div className="flex items-center gap-3">
        {/* Reorder controls — only for non-locked stages */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={handleMoveUp}
            disabled={stage.is_locked || isFirst || isPending}
            className="p-0.5 text-[#b8c8c6] hover:text-[#141d1c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Move stage up"
          >
            <ChevronUp />
          </button>
          <button
            type="button"
            onClick={handleMoveDown}
            disabled={stage.is_locked || isLast || isPending}
            className="p-0.5 text-[#b8c8c6] hover:text-[#141d1c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Move stage down"
          >
            <ChevronDown />
          </button>
        </div>

        {/* Stage name — inline edit for non-locked */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setName(stage.name);
                  setEditing(false);
                }
              }}
              maxLength={60}
              className="w-full text-sm font-semibold text-[#141d1c] border-b border-[#141d1c] outline-none bg-transparent pb-0.5"
            />
          ) : (
            <span className="text-sm font-semibold text-[#141d1c]">{stage.name}</span>
          )}
        </div>

        {/* Lock badge */}
        {stage.is_locked ? (
          <span className="text-xs text-[#8fa8a6] border border-[#e0d9d0] rounded-full px-2 py-0.5">
            locked
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setName(stage.name);
                setEditing(true);
                setError(null);
              }}
              disabled={isPending}
              className="p-1.5 text-[#8fa8a6] hover:text-[#141d1c] transition-colors disabled:opacity-50"
              aria-label="Rename stage"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="p-1.5 text-[#8fa8a6] hover:text-red-500 transition-colors disabled:opacity-50"
              aria-label="Delete stage"
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

function ChevronUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="2,9 7,4 12,9" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="2,5 7,10 12,5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,3.5 12,3.5" />
      <path d="M5.5 3.5V2.5H8.5V3.5" />
      <rect x="3" y="3.5" width="8" height="9" rx="1" />
      <line x1="5.5" y1="6" x2="5.5" y2="10" />
      <line x1="8.5" y1="6" x2="8.5" y2="10" />
    </svg>
  );
}
