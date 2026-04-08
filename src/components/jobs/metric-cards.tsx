import type { JobMetrics } from '@/types/jobs';

interface MetricCardsProps {
  metrics: JobMetrics;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <MetricCard label="Total Active Jobs" value={metrics.totalActive} />
      <MetricCard label="Total Candidates" value={metrics.totalCandidates} />
      <MetricCard label="Total Hired" value={metrics.totalHired} accent />
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  accent?: boolean;
}

function MetricCard({ label, value, accent }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8fa8a6] mb-2">
        {label}
      </p>
      <p
        className={
          accent
            ? 'text-3xl font-bold text-[#117a72]'
            : 'text-3xl font-bold text-[#141d1c]'
        }
      >
        {value}
      </p>
    </div>
  );
}
