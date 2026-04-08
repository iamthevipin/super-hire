'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { KanbanCard } from '@/components/candidates/kanban-card';
import type { KanbanColumn as KanbanColumnType } from '@/types/candidates';

interface KanbanColumnProps {
  column: KanbanColumnType;
  jobId: string;
  onAddCandidate?: () => void;
}

export function KanbanColumn({ column, jobId, onAddCandidate }: KanbanColumnProps) {
  const { stage, applications } = column;
  const isApplied = stage.name.toLowerCase() === 'applied';
  const isRejected = stage.name.toLowerCase() === 'rejected';

  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { stage },
  });

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 rounded-t-lg',
          isRejected ? 'bg-red-50 border border-red-200' : 'bg-[#eaf2f1] border border-[#d4e0de]'
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              isRejected ? 'text-red-700' : 'text-[#141d1c]'
            )}
          >
            {stage.name}
          </span>
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-medium',
              isRejected
                ? 'bg-red-100 text-red-600'
                : 'bg-white text-[#3e6b66]'
            )}
          >
            {applications.length}
          </span>
        </div>
        {isApplied && onAddCandidate && (
          <button
            type="button"
            onClick={onAddCandidate}
            className="text-xs text-[#3e6b66] hover:text-[#141d1c] font-medium transition-colors"
          >
            + Add
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 p-2 rounded-b-lg border-x border-b min-h-[200px] flex-1 transition-colors',
          isRejected ? 'border-red-200 bg-red-50/50' : 'border-[#d4e0de] bg-[#f4f9f8]',
          isOver && !isApplied && 'ring-2 ring-[#3e6b66] ring-inset'
        )}
      >
        <SortableContext
          items={applications.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((application) => (
            <KanbanCard key={application.id} application={application} jobId={jobId} />
          ))}
        </SortableContext>
        {applications.length === 0 && (
          <p className="text-xs text-[#b8c8c6] text-center mt-4">No candidates</p>
        )}
      </div>
    </div>
  );
}
