import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  valueClassName?: string;
}

export function StatCard({ title, value, valueClassName }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-1 px-[18px] py-4">
      <span className="text-[13px] text-gray-600">{title}</span>
      <span className={cn('text-[28px] font-bold', valueClassName)}>{value.toLocaleString('en-US')}</span>
    </Card>
  );
}
