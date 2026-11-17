import { AlarmClock, CircleCheck, CirclePause, CircleX, Users } from 'lucide-react';
import { StatCard } from '@/components/shared/stat-card';
import type { PipelineCounts } from '@/types';

export function SummaryStats({ counts }: { counts: PipelineCounts }) {
  return (
    <section aria-label="Summary" className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
      <StatCard title="Total records" value={counts.total} icon={Users} />
      <StatCard title="Valid" value={counts.valid} icon={CircleCheck} tone="ok" />
      <StatCard title="Invalid (left out)" value={counts.invalid} icon={CircleX} tone="error" />
      <StatCard title="Stalled" value={counts.stalled} icon={AlarmClock} tone="primary" />
      <StatCard title="On hold" value={counts.onHold} icon={CirclePause} tone="muted" />
    </section>
  );
}
