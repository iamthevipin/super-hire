'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CandidateHeader } from '@/components/candidates/candidate-header';
import { OverviewTab } from '@/components/candidates/overview-tab';
import { ResumeTab } from '@/components/candidates/resume-tab';
import { EmailTab } from '@/components/candidates/stub-tabs';
import { FeedbackTab } from '@/components/candidates/feedback-tab';
import { NotesTab } from '@/components/candidates/notes-tab';
import { ActivityTab } from '@/components/candidates/activity-tab';
import type { CandidateDetail } from '@/types/candidates';

type Tab = 'overview' | 'resume' | 'notes' | 'feedback' | 'email' | 'activity';

interface CandidateDetailClientProps {
  detail: CandidateDetail;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  isAdmin: boolean;
  currentUserId: string;
}

export function CandidateDetailClient({
  detail,
  applicationId,
  jobId,
  jobTitle,
  isAdmin,
  currentUserId,
}: CandidateDetailClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = (searchParams.get('tab') as Tab) ?? 'overview';

  const allTabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'resume', label: 'Resume' },
    { id: 'notes', label: 'Notes' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'email', label: 'Email' },
    { id: 'activity', label: 'Activity', adminOnly: true },
  ];

  const visibleTabs = allTabs.filter((tab) => !tab.adminOnly || isAdmin);

  const setTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
  };

  const currentStage = detail.application.pipeline_stage as
    | { id: string; name: string }
    | null
    | undefined;

  const currentStageId = currentStage?.id ?? detail.application.pipeline_stage_id ?? '';
  const currentStageName = currentStage?.name ?? '';

  return (
    <div className="px-4 py-6 max-w-4xl">
      <CandidateHeader detail={detail} jobId={jobId} jobTitle={jobTitle} />

      <nav className="flex gap-1 border-b border-[#d4e0de] mb-6">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-[#141d1c] text-[#141d1c]'
                : 'border-transparent text-[#8fa8a6] hover:text-[#3e4947]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <OverviewTab detail={detail} onUpdated={() => router.refresh()} />
      )}
      {activeTab === 'resume' && (
        <ResumeTab
          key={detail.candidate.resume_path ?? 'no-resume'}
          resumePath={detail.candidate.resume_path}
          applicationId={applicationId}
          onResumeUpdated={() => router.refresh()}
        />
      )}
      {activeTab === 'notes' && (
        <NotesTab
          candidateId={detail.candidate.id}
          currentStageId={currentStageId}
          currentStageName={currentStageName}
        />
      )}
      {activeTab === 'feedback' && (
        <FeedbackTab
          candidateId={detail.candidate.id}
          currentStageId={currentStageId}
          currentStageName={currentStageName}
          currentUserId={currentUserId}
        />
      )}
      {activeTab === 'email' && <EmailTab />}
      {isAdmin && activeTab === 'activity' && (
        <ActivityTab candidateId={detail.candidate.id} />
      )}
    </div>
  );
}
