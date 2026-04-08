'use client';

import { useState, useEffect, useCallback } from 'react';
import { getActivityForCandidate } from '@/actions/activity';
import type { ActivityEvent } from '@/types/activity';

interface ActivityTabProps {
  candidateId: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ActivityTab({ candidateId }: ActivityTabProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getActivityForCandidate(candidateId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEvents(result.data ?? []);
  }, [candidateId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-[#8fa8a6] py-8 text-center">Loading activity...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 py-8 text-center">{error}</p>;
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-[#8fa8a6] py-8 text-center">No activity recorded yet.</p>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-[#3e6b66] mt-1.5 flex-shrink-0" />
            {index < events.length - 1 && (
              <div className="w-px bg-[#d4e0de] flex-1 mt-1" />
            )}
          </div>
          <div className="pb-4 flex-1 min-w-0">
            <p className="text-sm text-[#3e4947]">{event.description}</p>
            <p className="text-[10px] text-[#b8c8c6] mt-0.5">
              {formatRelativeTime(event.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
