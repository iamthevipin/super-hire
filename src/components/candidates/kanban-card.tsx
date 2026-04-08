'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Star } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FeedbackQuickPanel } from '@/components/candidates/feedback-quick-panel';
import type { ApplicationWithCandidate } from '@/types/candidates';

interface KanbanCardProps {
  application: ApplicationWithCandidate;
  jobId: string;
}

export function KanbanCard({ application, jobId }: KanbanCardProps) {
  const { candidate } = application;
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: application.id,
    data: { application },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const initials =
    `${candidate.first_name[0] ?? ''}${candidate.last_name[0] ?? ''}`.toUpperCase();

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-white rounded-lg border border-[#d4e0de] p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
      >
        <Link
          href={`/dashboard/jobs/${jobId}/candidates/${application.id}`}
          onClick={(e) => e.stopPropagation()}
          className="block"
        >
          <p className="text-sm font-medium text-[#141d1c] truncate">
            {candidate.first_name} {candidate.last_name}
          </p>
          <p className="text-xs text-[#8fa8a6] truncate mt-0.5">{candidate.email}</p>
          {candidate.phone && (
            <p className="text-xs text-[#8fa8a6] truncate">{candidate.phone}</p>
          )}
          {application.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {application.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-[#eaf2f1] text-[#3e6b66] px-1.5 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
              {application.tags.length > 3 && (
                <span className="text-[10px] text-[#8fa8a6]">
                  +{application.tags.length - 3}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="w-6 h-6 rounded-full bg-[#eaf2f1] text-[#8fa8a6] text-[10px] flex items-center justify-center">
              {initials}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled
                title="Email — Coming soon"
                className="text-[#b8c8c6] cursor-not-allowed p-1"
                onClick={(e) => e.preventDefault()}
              >
                <Mail size={12} />
              </button>
              <button
                type="button"
                title="Leave feedback"
                className="text-[#8fa8a6] hover:text-[#3e6b66] p-1 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowFeedbackPanel(true);
                }}
              >
                <Star size={12} />
              </button>
            </div>
          </div>
        </Link>
      </div>

      {showFeedbackPanel && (
        <FeedbackQuickPanel
          application={application}
          onClose={() => setShowFeedbackPanel(false)}
        />
      )}
    </>
  );
}
