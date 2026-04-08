'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { KanbanColumn } from '@/components/candidates/kanban-column';
import { KanbanCard } from '@/components/candidates/kanban-card';
import { RejectReasonModal } from '@/components/candidates/reject-reason-modal';
import { AddCandidateModal } from '@/components/candidates/add-candidate-modal';
import { BulkImportModal } from '@/components/candidates/bulk-import-modal';
import { moveCandidateStage } from '@/actions/kanban';
import type { KanbanColumn as KanbanColumnType, ApplicationWithCandidate } from '@/types/candidates';

interface KanbanBoardProps {
  initialColumns: KanbanColumnType[];
  jobId: string;
}

interface PendingMove {
  applicationId: string;
  newStageId: string;
}

export function KanbanBoard({ initialColumns, jobId }: KanbanBoardProps) {
  const router = useRouter();
  const [columns, setColumns] = useState<KanbanColumnType[]>(initialColumns);

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);
  const [activeApplication, setActiveApplication] = useState<ApplicationWithCandidate | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const findApplication = useCallback(
    (applicationId: string): ApplicationWithCandidate | undefined => {
      for (const col of columns) {
        const found = col.applications.find((a) => a.id === applicationId);
        if (found) return found;
      }
    },
    [columns]
  );

  const performMove = useCallback(
    (applicationId: string, newStageId: string, rejectionReason?: string) => {
      const application = findApplication(applicationId);
      if (!application) return;

      const prevColumns = columns;

      setColumns((prev) =>
        prev.map((col) => {
          if (col.applications.some((a) => a.id === applicationId)) {
            return {
              ...col,
              applications: col.applications.filter((a) => a.id !== applicationId),
            };
          }
          if (col.stage.id === newStageId) {
            const targetStage = col.stage;
            return {
              ...col,
              applications: [
                ...col.applications,
                {
                  ...application,
                  pipeline_stage_id: newStageId,
                  pipeline_stage: targetStage,
                  rejection_reason: rejectionReason ?? null,
                },
              ],
            };
          }
          return col;
        })
      );

      moveCandidateStage(applicationId, newStageId, rejectionReason).then((result) => {
        if (result.error) {
          setColumns(prevColumns);
          setMoveError(result.error);
        } else {
          router.refresh();
        }
      }).catch(() => {
        setColumns(prevColumns);
        setMoveError('Failed to move candidate. Please try again.');
      });
    },
    [columns, findApplication, router]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveApplication(null);
      const { active, over } = event;
      if (!over) return;

      const applicationId = active.id as string;
      const newStageId = over.id as string;

      const sourceCol = columns.find((col) =>
        col.applications.some((a) => a.id === applicationId)
      );
      if (!sourceCol || sourceCol.stage.id === newStageId) return;

      const targetCol = columns.find((col) => col.stage.id === newStageId);
      if (!targetCol) return;

      const isApplied = targetCol.stage.name.toLowerCase() === 'applied';
      if (isApplied) return;

      const isRejected = targetCol.stage.name.toLowerCase() === 'rejected';
      if (isRejected) {
        setPendingMove({ applicationId, newStageId });
        return;
      }

      performMove(applicationId, newStageId);
    },
    [columns, performMove]
  );

  const handleRejectConfirm = useCallback(
    (reason: string) => {
      if (!pendingMove) return;
      performMove(pendingMove.applicationId, pendingMove.newStageId, reason);
      setPendingMove(null);
    },
    [pendingMove, performMove]
  );

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-4">
        <button
          type="button"
          onClick={() => setShowBulkModal(true)}
          className="px-3 py-1.5 text-sm border border-[#d4e0de] text-[#3e4947] rounded-lg hover:bg-[#f4f9f8] transition-colors"
        >
          Bulk import
        </button>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 text-sm bg-[#141d1c] text-white rounded-lg hover:bg-[#3e4947] transition-colors"
        >
          Add candidate
        </button>
      </div>

      {moveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {moveError}
          <button
            type="button"
            onClick={() => setMoveError(null)}
            className="ml-2 underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => {
          const app = findApplication(e.active.id as string);
          if (app) setActiveApplication(app);
        }}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.stage.id}
              column={column}
              jobId={jobId}
              onAddCandidate={
                column.stage.name.toLowerCase() === 'applied'
                  ? () => setShowAddModal(true)
                  : undefined
              }
            />
          ))}
        </div>
        <DragOverlay>
          {activeApplication && (
            <KanbanCard application={activeApplication} jobId={jobId} />
          )}
        </DragOverlay>
      </DndContext>

      {pendingMove && (
        <RejectReasonModal
          onConfirm={handleRejectConfirm}
          onCancel={() => setPendingMove(null)}
        />
      )}

      {showAddModal && (
        <AddCandidateModal
          jobId={jobId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            router.refresh();
          }}
        />
      )}

      {showBulkModal && (
        <BulkImportModal
          jobId={jobId}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
