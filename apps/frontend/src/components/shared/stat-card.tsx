import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TONES = {
  default: { value: 'text-foreground', icon: 'bg-gray-100 text-gray-600' },
  ok: { value: 'text-green-800', icon: 'bg-green-50 text-green-700' },
  error: { value: 'text-red-800', icon: 'bg-red-50 text-red-700' },
  primary: { value: 'text-indigo-800', icon: 'bg-indigo-50 text-indigo-700' },
  muted: { value: 'text-gray-600', icon: 'bg-gray-100 text-gray-500' }
};

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
}

export function StatCard({ title, value, icon: Icon, tone = 'default' }: StatCardProps) {
  return (
    <Card className="flex items-start justify-between gap-3 px-[18px] py-4">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-gray-600">{title}</span>
        <span className={cn('text-[28px] leading-tight font-bold tabular-nums', TONES[tone].value)}>
          {value.toLocaleString('en-US')}
        </span>
      </div>
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONES[tone].icon)}>
        <Icon aria-hidden="true" className="size-[18px]" />
      </span>
    </Card>
  );
}
