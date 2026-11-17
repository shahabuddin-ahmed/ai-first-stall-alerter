import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@/components/shared/date-picker';
import type { StageThreshold } from '@/types';

interface BoardSettingsProps {
  referenceDate: string;
  maxDate: string;
  thresholds: StageThreshold[];
  onDateChange: (date: string) => void;
}

export function BoardSettings({ referenceDate, maxDate, thresholds, onDateChange }: BoardSettingsProps) {
  return (
    <Card className="flex flex-wrap items-end gap-[18px] px-[18px] py-3.5">
      <div className="flex flex-col gap-1">
        <label htmlFor="board-date" className="text-[13px] font-semibold">
          Reference date
        </label>
        <DatePicker id="board-date" value={referenceDate} max={maxDate} onChange={onDateChange} className="w-48" />
      </div>
      <div className="flex flex-[1_1_420px] flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Stage thresholds</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {thresholds.map((stage) => (
            <span key={stage.name} className="rounded-lg border bg-secondary px-2.5 py-1 text-[13px]">
              {stage.name} <strong>{stage.thresholdDays}d</strong>
            </span>
          ))}
          <Link href="/stages" className="pl-1 text-[13px] text-indigo-700 hover:text-indigo-800">
            Edit
          </Link>
        </div>
      </div>
      <span className="basis-full text-[13px] text-gray-600">
        Changing the date or a threshold recalculates the queue right away. No re-upload.
      </span>
    </Card>
  );
}
