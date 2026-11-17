'use client';

import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { addDays, formatDate, formatWait } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Recipient, TimerSource, type QueueItem } from '@/types';

const RECIPIENT_LABEL: Record<Recipient, (firstName: string) => string> = {
  [Recipient.HIRING_MANAGER]: () => 'the hiring manager',
  [Recipient.CANDIDATE]: (firstName) => `${firstName} (candidate)`,
  [Recipient.INTERVIEW_PANEL]: () => 'the interview panel',
  [Recipient.ASSESSMENT_REVIEWER]: () => 'the assessment reviewer'
};

// Whose turn it is: the candidate must reply, or someone on the hiring team must act
const WAITING_ON: Record<Recipient, string> = {
  [Recipient.HIRING_MANAGER]: 'Hiring team',
  [Recipient.CANDIDATE]: 'Candidate',
  [Recipient.INTERVIEW_PANEL]: 'Hiring team',
  [Recipient.ASSESSMENT_REVIEWER]: 'Hiring team'
};

const days = (count: number) => (count === 1 ? '1 day' : `${count} days`);

// A week or more past the threshold is urgent
const URGENT_OVERDUE_DAYS = 7;

function overdueTone(overdueDays: number): string {
  if (overdueDays >= URGENT_OVERDUE_DAYS) {
    return 'bg-red-50 text-red-800 ring-red-200';
  }
  if (overdueDays > 0) {
    return 'bg-amber-50 text-amber-800 ring-amber-200';
  }
  return 'bg-gray-100 text-gray-700 ring-gray-200';
}

// The follow-up was due once the stage threshold was reached
const dueDate = (item: QueueItem) => formatDate(addDays(item.timerFrom, item.stageThreshold));

function dueText(item: QueueItem): string {
  const overdue = item.overdueDays > 0 ? `${days(item.overdueDays)} overdue` : 'due today';
  return `${dueDate(item)} · ${overdue}`;
}

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
  aiDraft: string | null;
  open: boolean;
  onToggle: () => void;
}

export function QueueRow({ item, aiDraft, open, onToggle }: QueueRowProps) {
  const [useTemplate, setUseTemplate] = useState(false);
  const showAi = aiDraft !== null && !useTemplate;
  const message = showAi ? aiDraft : item.templateMessage;

  const copyMessage = async () => {
    try {
      // navigator.clipboard is missing on a plain http address that is not localhost
      await navigator.clipboard.writeText(message);
      toast.success('Message copied');
    } catch {
      toast.error('Copy failed. Select the text and copy it.');
    }
  };

  return (
    <>
      {/* The whole row opens the details; the arrow button gives keyboard users the same */}
      <tr
        onClick={onToggle}
        className={cn(
          'cursor-pointer border-b border-gray-100 transition-colors hover:bg-muted/50',
          open && 'bg-indigo-50/40 hover:bg-indigo-50/40'
        )}
      >
        <td className="py-2 pr-0 pl-2">
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} details for ${item.name}`}
            className="flex size-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronRight
              aria-hidden="true"
              className={cn('size-4 transition-transform duration-200', open && 'rotate-90 text-primary')}
            />
          </button>
        </td>
        <td className="px-3 py-2.5">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-gray-700 tabular-nums">
            {item.rank}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <span className="font-semibold">{item.name}</span>
          <div className="pt-0.5 text-xs text-muted-foreground">ID {item.candidateId}</div>
        </td>
        <td className="px-3 py-2.5">{item.role}</td>
        <td className="px-3 py-2.5">
          <span className="rounded-full border border-input px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-gray-700">
            {item.stage}
          </span>
          <div className="pt-1 text-xs whitespace-nowrap text-muted-foreground">
            Step {item.stageStep} of {item.stageSteps}
          </div>
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">{item.recruiter}</td>
        <td className="px-3 py-2.5 whitespace-nowrap">{WAITING_ON[item.recipient]}</td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          {formatWait(item.daysInStage)}
          {formatWait(item.daysInStage) !== days(item.daysInStage) && (
            <div className="text-xs text-muted-foreground">{days(item.daysInStage)}</div>
          )}
        </td>
        <td className="px-3 py-2.5 text-gray-600">{item.stageThreshold}d</td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <span
            className={cn(
              'inline-flex min-w-9 justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ring-1 ring-inset',
              overdueTone(item.overdueDays)
            )}
          >
            {item.overdueDays}d
          </span>
          <div className="pt-1 text-xs text-muted-foreground">due {dueDate(item)}</div>
        </td>
        <td className="px-3 py-2.5">
          {showAi ? <Badge variant="ai">AI draft</Badge> : <Badge variant="template">Template</Badge>}
        </td>
      </tr>

      {open && (
        <tr className="border-b border-gray-100 bg-indigo-50/30">
          <td colSpan={11} className="px-3 pt-1 pb-3">
            {/* Kept to the visible width of the scroll area, so the message never needs a sideways scroll */}
            <div className="fade-in sticky left-3 grid w-[calc(100cqw-1.5rem)] grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
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
                <Detail label="Follow-up was due">
                  <span>{dueText(item)}</span>
                </Detail>
                <span className="text-[13px] text-gray-600">{contactText(item.daysSinceContact)}</span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                    Message to {RECIPIENT_LABEL[item.recipient](item.firstName)}
                  </span>
                  {showAi ? (
                    <Badge variant="ai">AI draft · review before use</Badge>
                  ) : (
                    <Badge variant="template">Template</Badge>
                  )}
                </div>
                <p className="rounded-[10px] border bg-card px-3.5 py-3 leading-relaxed whitespace-pre-line">{message}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={copyMessage}>
                    Copy message
                  </Button>
                  {aiDraft !== null && (
                    <Button variant="outline" size="sm" onClick={() => setUseTemplate(!useTemplate)}>
                      {useTemplate ? 'Use AI draft' : 'Use template instead'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
