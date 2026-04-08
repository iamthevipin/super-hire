'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { StarRating } from '@/components/candidates/star-rating';
import {
  setStageRating,
  clearStageRating,
  upsertFeedbackComment,
  getMyFeedbackForStage,
} from '@/actions/feedback';
import type { ApplicationWithCandidate } from '@/types/candidates';

const EXCLUDED_STAGES = ['applied', 'hired', 'rejected'];

interface FeedbackQuickPanelProps {
  application: ApplicationWithCandidate;
  onClose: () => void;
}

export function FeedbackQuickPanel({ application, onClose }: FeedbackQuickPanelProps) {
  const stageName = application.pipeline_stage?.name ?? '';
  const stageId = application.pipeline_stage_id ?? '';
  const candidateId = application.candidate_id;
  const isExcluded = EXCLUDED_STAGES.includes(stageName.toLowerCase()) || !stageId;

  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isExcluded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    getMyFeedbackForStage(candidateId, stageId).then((result) => {
      setRating(result.rating);
      setComment(result.comment?.body ?? '');
      setLoading(false);
    });
  }, [candidateId, stageId, isExcluded]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const errors: string[] = [];

    if (rating !== null) {
      const r = await setStageRating(candidateId, stageId, rating);
      if (r.error) errors.push(r.error);
    } else {
      const r = await clearStageRating(candidateId, stageId);
      if (r.error) errors.push(r.error);
    }

    if (comment.trim()) {
      const r = await upsertFeedbackComment(candidateId, stageId, comment.trim());
      if (r.error) errors.push(r.error);
    }

    setSubmitting(false);
    if (errors.length > 0) {
      setError(errors.join('. '));
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-[#d4e0de] shadow-xl w-full max-w-sm mx-4 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#141d1c]">
              {application.candidate.first_name} {application.candidate.last_name}
            </p>
            <p className="text-xs text-[#8fa8a6]">{stageName} stage</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8fa8a6] hover:text-[#3e4947] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {isExcluded ? (
          <p className="text-sm text-[#8fa8a6]">
            Feedback is not available for the {stageName} stage.
          </p>
        ) : loading ? (
          <p className="text-sm text-[#8fa8a6]">Loading...</p>
        ) : (
          <>
            <div>
              <p className="text-xs text-[#8fa8a6] mb-1.5">Rating</p>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div>
              <p className="text-xs text-[#8fa8a6] mb-1.5">Your comment</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
                className="w-full text-sm border border-[#d4e0de] rounded-lg px-3 py-2 text-[#3e4947] placeholder-[#b8c8c6] focus:outline-none focus:border-[#3e6b66] resize-none"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-2 text-sm bg-[#141d1c] text-white rounded-lg hover:bg-[#3e4947] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save feedback'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
