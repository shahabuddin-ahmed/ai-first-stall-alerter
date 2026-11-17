import Link from 'next/link';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AiErrorCode, AiStatus, BottleneckType, type InsightsView } from '@/types';

const FAILURE_TEXT: Record<AiErrorCode, string> = {
  [AiErrorCode.TIMEOUT]: 'The AI provider did not respond in time.',
  [AiErrorCode.RATE_LIMITED]: 'The AI provider is busy right now (rate limit).',
  [AiErrorCode.AUTH_FAILED]: 'The AI provider rejected the server key.',
  [AiErrorCode.NO_CREDITS]: 'The AI account has no credits left.',
  [AiErrorCode.PROVIDER_ERROR]: 'The AI provider returned an error.',
  [AiErrorCode.CONNECTION_FAILED]: 'Could not connect to the AI provider.',
  [AiErrorCode.REFUSED]: 'The AI model refused to answer.',
  [AiErrorCode.INVALID_JSON]: 'The AI answer could not be read.',
  [AiErrorCode.INVALID_OUTPUT]: 'The AI answer did not pass the checks.'
};

const BOTTLENECK_LABEL: Record<BottleneckType, string> = {
  [BottleneckType.STAGE]: 'Stage',
  [BottleneckType.RECRUITER]: 'Recruiter'
};

interface InsightsCardProps {
  insights: InsightsView | null;
  error: string;
  stalled: number;
  onRetry: () => void;
}

function TemplateNotice({ insights, onRetry }: { insights: InsightsView; onRetry: () => void }) {
  if (insights.aiStatus === AiStatus.DISABLED) {
    return (
      <span className="text-sm text-gray-700">
        AI drafts are off in{' '}
        <Link href="/settings" className="text-indigo-700 hover:text-indigo-800">
          Settings
        </Link>
        . Every alert uses its template message.
      </span>
    );
  }
  if (insights.aiStatus === AiStatus.NOT_CONFIGURED) {
    return <span className="text-sm text-gray-700">AI is not set up on the server. Every alert uses its template message.</span>;
  }

  const reason = insights.errorCode ? FAILURE_TEXT[insights.errorCode] : 'The AI draft failed.';
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2.5">
      <span className="text-sm text-gray-700">{reason} Every alert uses its template message.</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry AI
      </Button>
    </div>
  );
}

export function InsightsCard({ insights, error, stalled, onRetry }: InsightsCardProps) {
  if (error) {
    return (
      <Card role="alert" className="flex flex-wrap items-center justify-between gap-2.5 p-5">
        <span className="text-sm text-gray-700">Could not load the insights: {error}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </Card>
    );
  }
  if (!insights) {
    return (
      <Card role="status" className="flex flex-wrap items-center gap-2.5 p-5">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50">
            <Sparkles aria-hidden="true" className="size-4 text-indigo-700" />
          </span>
          Insights
        </h2>
        <Badge variant="ai">
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
          AI is writing
        </Badge>
        <span className="basis-full text-sm text-gray-600">
          The briefing and the messages for every alert are on their way. This can take up to a minute; the queue
          already works with template messages.
        </span>
      </Card>
    );
  }

  const isAi = insights.aiStatus === AiStatus.AI_DRAFT;

  return (
    <Card className="flex flex-col gap-3.5 border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50">
              <Sparkles aria-hidden="true" className="size-4 text-indigo-700" />
            </span>
            Insights
          </h2>
          {isAi ? (
            <Badge variant="ai">AI draft · review before use</Badge>
          ) : (
            <Badge variant="template">Template</Badge>
          )}
        </div>
        {isAi && (
          <span className="text-[13px] text-gray-600">
            AI messages for all {stalled} alerts
          </span>
        )}
      </div>

      {!isAi && (
        <div className="rounded-[10px] border bg-secondary px-3.5 py-3">
          <TemplateNotice insights={insights} onRetry={onRetry} />
        </div>
      )}

      <p className="text-[15px] leading-relaxed text-gray-800">{insights.briefing.text}</p>

      {insights.bottleneckNotes.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          {insights.bottleneckNotes.map((note) => (
            <div key={note.type} className="flex flex-col gap-1.5 rounded-[10px] border bg-secondary p-3.5">
              <span className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                {BOTTLENECK_LABEL[note.type]} · computed by code
              </span>
              <span className="text-base font-bold">
                {note.key} · {note.stalled} stalled
              </span>
              <span className="text-sm leading-snug text-gray-700">{note.text}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
