import Link from 'next/link';
import type { CandidateDetail } from '@/types/candidates';

interface CandidateHeaderProps {
  detail: CandidateDetail;
  jobId: string;
  jobTitle: string;
}

export function CandidateHeader({ detail, jobId, jobTitle }: CandidateHeaderProps) {
  const { application, candidate } = detail;
  const fullName = `${candidate.first_name} ${candidate.last_name}`;
  const stage = application.pipeline_stage;

  return (
    <div className="border-b border-[#d4e0de] pb-4 mb-6">
      <div className="flex items-center gap-2 text-xs text-[#8fa8a6] mb-3">
        <Link href="/dashboard" className="hover:text-[#141d1c] transition-colors">
          Jobs
        </Link>
        <span>/</span>
        <Link href={`/dashboard/jobs/${jobId}`} className="hover:text-[#141d1c] transition-colors">
          {jobTitle}
        </Link>
        <span>/</span>
        <span className="text-[#3e4947]">{fullName}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#141d1c]">{fullName}</h1>
          {candidate.current_job_title && (
            <p className="text-sm text-[#8fa8a6] mt-0.5">{candidate.current_job_title}</p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {stage && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#eaf2f1] text-[#3e6b66] border border-[#d4e0de]">
              {stage.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
