'use client';

import { useState, useEffect, useCallback } from 'react';
import { StarRating } from '@/components/candidates/star-rating';
import {
  setStageRating,
  clearStageRating,
  upsertFeedbackComment,
  deleteFeedbackComment,
  getFeedbackForCandidate,
  getMyFeedbackForStage,
} from '@/actions/feedback';
import type { StageFeedbackGroup } from '@/types/feedback';

const EXCLUDED_STAGES = ['applied', 'hired', 'rejected'];

interface FeedbackTabProps {
  candidateId: string;
  currentStageId: string;
  currentStageName: string;
  currentUserId: string;
}

export function FeedbackTab({
  candidateId,
  currentStageId,
  currentStageName,
  currentUserId,
}: FeedbackTabProps) {
  const [groups, setGroups] = useState<StageFeedbackGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myRating, setMyRating] = useState<number | null>(null);
  const [myComment, setMyComment] = useState('');
  const [myCommentId, setMyCommentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set([currentStageId]));

  const isExcluded = EXCLUDED_STAGES.includes(currentStageName.toLowerCase());

  const load = useCallback(async () => {
    setLoading(true);
    const [feedbackResult, myResult] = await Promise.all([
      getFeedbackForCandidate(candidateId),
      !isExcluded ? getMyFeedbackForStage(candidateId, currentStageId) : Promise.resolve({ rating: null, comment: null }),
    ]);
    setLoading(false);
    if (feedbackResult.error) {
      setError(feedbackResult.error);
      return;
    }
    setGroups(feedbackResult.data ?? []);
    if (!isExcluded) {
      setMyRating(myResult.rating ?? null);
      if (myResult.comment) {
        setMyComment(myResult.comment.body);
        setMyCommentId(myResult.comment.id);
      }
    }
  }, [candidateId, currentStageId, isExcluded]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const errors: string[] = [];

    if (myRating !== null) {
      const r = await setStageRating(candidateId, currentStageId, myRating);
      if (r.error) errors.push(r.error);
    } else if (myCommentId) {
      const r = await clearStageRating(candidateId, currentStageId);
      if (r.error) errors.push(r.error);
    }

    if (myComment.trim()) {
      const r = await upsertFeedbackComment(candidateId, currentStageId, myComment.trim());
      if (r.error) errors.push(r.error);
    }

    setSubmitting(false);
    if (errors.length > 0) {
      setSubmitError(errors.join('. '));
      return;
    }
    await load();
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteFeedbackComment(commentId);
    await load();
  };

  const handleEditSave = async (commentId: string) => {
    if (!editBody.trim()) return;
    const r = await upsertFeedbackComment(
      candidateId,
      groups.find((g) => g.comments.some((c) => c.id === commentId))?.stage.id ?? currentStageId,
      editBody.trim()
    );
    if (!r.error) {
      setEditingCommentId(null);
      setEditBody('');
      await load();
    }
  };

  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  if (loading) {
    return <p className="text-sm text-[#8fa8a6] py-8 text-center">Loading feedback...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 py-8 text-center">{error}</p>;
  }

  return (
    <div className="space-y-6">
      {!isExcluded && (
        <div className="border border-[#d4e0de] rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-[#3e4947] uppercase tracking-wide">
            Your feedback for {currentStageName}
          </p>
          <div>
            <p className="text-xs text-[#8fa8a6] mb-1">Rating</p>
            <StarRating value={myRating} onChange={setMyRating} />
          </div>
          <div>
            <p className="text-xs text-[#8fa8a6] mb-1">Comment</p>
            <textarea
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
              placeholder="Share your thoughts on this candidate..."
              rows={3}
              className="w-full text-sm border border-[#d4e0de] rounded-lg px-3 py-2 text-[#3e4947] placeholder-[#b8c8c6] focus:outline-none focus:border-[#3e6b66] resize-none"
            />
          </div>
          {submitError && <p className="text-xs text-red-600">{submitError}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm bg-[#141d1c] text-white rounded-lg hover:bg-[#3e4947] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save feedback'}
          </button>
        </div>
      )}

      {isExcluded && (
        <div className="border border-[#d4e0de] rounded-lg p-4">
          <p className="text-sm text-[#8fa8a6]">
            Feedback is not available for the {currentStageName} stage.
          </p>
        </div>
      )}

      {groups.length === 0 && (
        <p className="text-sm text-[#8fa8a6] text-center py-4">
          No feedback yet. Be the first to leave feedback on this candidate.
        </p>
      )}

      {groups.map((group) => {
        const isExpanded = expandedStages.has(group.stage.id);
        const hasContent = group.rating !== null || group.comments.length > 0;
        if (!hasContent) return null;

        return (
          <div key={group.stage.id} className="border border-[#d4e0de] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleStage(group.stage.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#f4f9f8] hover:bg-[#eaf2f1] transition-colors"
            >
              <span className="text-sm font-medium text-[#3e4947]">{group.stage.name}</span>
              <div className="flex items-center gap-3">
                {group.rating !== null && (
                  <StarRating value={group.rating} readOnly size="sm" />
                )}
                <span className="text-xs text-[#8fa8a6]">{isExpanded ? '-' : '+'}</span>
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 space-y-3">
                {group.rating !== null && (
                  <div className="flex items-center gap-2 pb-2 border-b border-[#d4e0de]">
                    <span className="text-xs text-[#8fa8a6]">Stage rating:</span>
                    <StarRating value={group.rating} readOnly size="sm" />
                  </div>
                )}

                {group.comments.length === 0 && (
                  <p className="text-xs text-[#b8c8c6]">No comments for this stage.</p>
                )}

                {group.comments.map((comment) => (
                  <div key={comment.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#3e4947]">{comment.user_name}</span>
                      <span className="text-[10px] text-[#b8c8c6]">
                        {new Date(comment.updated_at).toLocaleDateString()}
                        {comment.created_at !== comment.updated_at && ' (edited)'}
                      </span>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={3}
                          className="w-full text-sm border border-[#d4e0de] rounded-lg px-3 py-2 text-[#3e4947] focus:outline-none focus:border-[#3e6b66] resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditSave(comment.id)}
                            className="text-xs text-[#3e6b66] border border-[#d4e0de] px-3 py-1 rounded hover:bg-[#f4f9f8]"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="text-xs text-[#8fa8a6] px-3 py-1 rounded hover:bg-[#f4f9f8]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-[#3e4947] whitespace-pre-wrap">{comment.body}</p>
                        {comment.user_id === currentUserId && (
                          <div className="flex gap-3 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditBody(comment.body);
                              }}
                              className="text-xs text-[#3e6b66] hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
