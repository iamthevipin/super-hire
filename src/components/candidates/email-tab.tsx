'use client';

import { useEffect, useState, useCallback } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { createClient } from '@/lib/supabase/client';
import { getSentEmailsForCandidate } from '@/actions/gmail';
import { useCompose } from '@/hooks/use-compose';
import type { SentEmail } from '@/types/email';

interface EmailTabProps {
  candidateId: string;
  applicationId: string | null;
  candidateEmail: string;
  candidateName: string;
  isAdmin: boolean;
}

export function EmailTab({
  candidateId,
  applicationId,
  candidateEmail,
  candidateName,
  isAdmin,
}: EmailTabProps) {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const { openCompose } = useCompose();

  const loadEmails = useCallback(async () => {
    const result = await getSentEmailsForCandidate(candidateId);
    if (result.data) {
      setEmails(result.data);
    }
    setLoading(false);
  }, [candidateId]);

  useEffect(() => {
    void loadEmails();
  }, [loadEmails]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`candidate_emails:${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'candidate_emails',
          filter: `candidate_id=eq.${candidateId}`,
        },
        (payload) => {
          setEmails((prev) => [payload.new as SentEmail, ...prev]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [candidateId]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-[#8fa8a6]">Only admins can send and view emails.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#141d1c]">Email</h2>
        <button
          type="button"
          onClick={() =>
            openCompose({
              candidateId,
              candidateName,
              candidateEmail,
              applicationId,
            })
          }
          className="px-3 py-1.5 bg-[#117a72] text-white text-xs font-medium rounded-lg hover:bg-[#0e6860] transition-colors"
        >
          Compose
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 rounded-full border-2 border-[#d4e0de] border-t-[#117a72] animate-spin" />
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-[#3e4947] font-medium">No emails sent yet</p>
          <p className="text-xs text-[#b8c8c6] mt-1">
            Compose an email to start communicating with this candidate.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <EmailRow key={email.id} email={email} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmailRow({ email }: { email: SentEmail }) {
  const [expanded, setExpanded] = useState(false);

  const sentDate = new Date(email.sent_at);
  const formattedDate = sentDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = sentDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="bg-white rounded-xl border border-[#d4e0de] overflow-hidden">
      <button
        type="button"
        className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left hover:bg-[#f4f9f8] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#141d1c] truncate">{email.subject}</p>
          <p className="text-xs text-[#8fa8a6] mt-0.5">
            {email.sender_name} &lt;{email.sender_gmail_address}&gt;
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[#8fa8a6]">
            {formattedDate} at {formattedTime}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-[#8fa8a6] transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div
          className="px-4 py-3 border-t border-[#eaf2f1] prose prose-sm max-w-none text-[#141d1c]"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body_html) }}
        />
      )}
    </div>
  );
}
