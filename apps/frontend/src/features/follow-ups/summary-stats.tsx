import { StatCard } from '@/components/shared/stat-card';
import type { PipelineCounts } from '@/types';

export function SummaryStats({ counts }: { counts: PipelineCounts }) {
  return (
    <section aria-label="Summary" className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
      <StatCard title="Total records" value={counts.total} />
      <StatCard title="Valid" value={counts.valid} valueClassName="text-green-800" />
      <StatCard title="Invalid (left out)" value={counts.invalid} valueClassName="text-red-800" />
      <StatCard title="Stalled" value={counts.stalled} valueClassName="text-indigo-800" />
      <StatCard title="On hold" value={counts.onHold} valueClassName="text-gray-600" />
    </section>
  );
}
