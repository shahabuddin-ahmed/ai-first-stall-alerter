'use client';

import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Recipient, TimerSource, type QueueItem } from '@/types';

const RECIPIENT_LABEL: Record<Recipient, (firstName: string) => string> = {
  [Recipient.HIRING_MANAGER]: () => 'the hiring manager',
  [Recipient.CANDIDATE]: (firstName) => `${firstName} (candidate)`,
  [Recipient.INTERVIEW_PANEL]: () => 'the interview panel',
  [Recipient.ASSESSMENT_REVIEWER]: () => 'the assessment reviewer'
};

const days = (count: number) => (count === 1 ? '1 day' : `${count} days`);

function timerText(item: QueueItem): string {
  const from = item.timerSource === TimerSource.LAST_ACTIVITY ? 'last real activity' : `entered ${item.stage}`;
  return `${item.timerFrom} (${from})`;
}

function contactText(daysSinceContact: number | null): string {
  if (daysSinceContact === null) {
    return 'No contact date recorded.';
  }
  return `Last contacted ${days(daysSinceContact)} ago (for information only; contact does not change the timer or the rank).`;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">{label}</span>
      {children}
    </div>
  );
}

interface QueueRowProps {
  item: QueueItem;
  open: boolean;
  onToggle: () => void;
}

export function QueueRow({ item, open, onToggle }: QueueRowProps) {
  const copyMessage = () => {
    navigator.clipboard
      .writeText(item.templateMessage)
      .then(() => toast.success('Message copied'))
      .catch(() => toast.error('Copy failed. Select the text and copy it.'));
  };

  return (
    <>
      <tr className={cn('border-b border-gray-100', open && 'bg-indigo-50/30')}>
        <td className="px-3 py-2.5 font-bold text-gray-600">{item.rank}</td>
        <td className="px-3 py-2.5">
          <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className="text-left font-semibold underline decoration-indigo-200 underline-offset-[3px] hover:text-indigo-800"
          >
            {item.name}
          </button>
          <div className="pt-0.5 text-xs text-muted-foreground">ID {item.candidateId}</div>
        </td>
        <td className="px-3 py-2.5">{item.role}</td>
        <td className="px-3 py-2.5">
          <span className="rounded-full border border-input px-2.5 py-0.5 text-xs font-semibold text-gray-700">{item.stage}</span>
        </td>
        <td className="px-3 py-2.5">{item.recruiter}</td>
        <td className="px-3 py-2.5">{item.daysInStage}</td>
        <td className="px-3 py-2.5 text-gray-600">{item.stageThreshold}d</td>
        <td className={cn('px-3 py-2.5', item.overdueDays > 0 && 'font-bold')}>{item.overdueDays}</td>
        <td className="px-3 py-2.5">
          <Badge variant="template">Template</Badge>
        </td>
      </tr>

      {open && (
        <tr className="border-b border-gray-100 bg-indigo-50/30">
          <td colSpan={9} className="px-3 pt-1 pb-3">
            {/* Kept to the visible width of the scroll area, so the message never needs a sideways scroll */}
            <div className="sticky left-3 grid w-[calc(100cqw-1.5rem)] grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              <div className="flex flex-col gap-2.5">
                <Detail label="Why">
                  <span className="leading-normal">{item.reason}</span>
                </Detail>
                <Detail label="Action">
                  <span className="font-semibold">{item.actionLabel}</span>
                </Detail>
                <Detail label="Timer from">
                  <span>{timerText(item)}</span>
                </Detail>
                <span className="text-[13px] text-gray-600">{contactText(item.daysSinceContact)}</span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                    Message to {RECIPIENT_LABEL[item.recipient](item.firstName)}
                  </span>
                  <Badge variant="template">Template</Badge>
                </div>
                <p className="rounded-[10px] border bg-card px-3.5 py-3 leading-relaxed whitespace-pre-line">
                  {item.templateMessage}
                </p>
                <Button size="sm" className="self-start" onClick={copyMessage}>
                  Copy message
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
