import { Fragment } from 'react';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface FlowStep {
  layer: string;
  title: string;
  text: string;
}

const UPLOAD_FLOW: FlowStep[] = [
  { layer: 'Frontend', title: 'Next.js', text: 'Sends the file and the date' },
  { layer: 'API', title: 'Express', text: 'Size, type and input checks' },
  { layer: 'Domain', title: 'Rules engine', text: 'Parse, validate, rank with your stages' },
  { layer: 'Database', title: 'MySQL', text: 'Import + 8 known columns; a unique file hash stops duplicates' },
  { layer: 'Response', title: 'Queue JSON', text: 'Counts, queue, row errors' }
];

const INSIGHT_FLOW: FlowStep[] = [
  { layer: 'Check', title: 'AI allowed?', text: 'Server key set + AI drafts on' },
  { layer: 'Cache', title: 'Asked before?', text: 'A saved answer or a failed try is reused: no call' },
  { layer: 'Domain', title: 'Anonymous facts', text: 'Top alerts only, no names' },
  { layer: 'AI', title: 'OpenRouter', text: 'One call, with a timeout' },
  { layer: 'Guardrails', title: 'Check the answer', text: 'Shape, length, numbers, timing words, recipient' },
  { layer: 'Result', title: 'AI draft or template', text: 'Names filled in by the backend' }
];

function Flow({ steps }: { steps: FlowStep[] }) {
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {steps.map((step, index) => (
        <Fragment key={step.title}>
          <div className="flex w-40 flex-col gap-1 rounded-[10px] border bg-secondary p-3">
            <span className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{step.layer}</span>
            <span className="text-sm font-semibold">{step.title}</span>
            <span className="text-[13px] leading-snug text-gray-600">{step.text}</span>
          </div>
          {index < steps.length - 1 && <ArrowRight aria-hidden="true" className="size-4 self-center text-gray-400" />}
        </Fragment>
      ))}
    </div>
  );
}

export function FlowCard() {
  return (
    <Card className="flex flex-col gap-4 p-[22px]">
      <h2 className="text-[17px] font-semibold">Upload → queue</h2>
      <Flow steps={UPLOAD_FLOW} />
      <h2 className="pt-2 text-[17px] font-semibold">Insights → messages</h2>
      <Flow steps={INSIGHT_FLOW} />
      <span className="text-[13px] text-gray-600">
        Any failure in the AI path goes straight to the template. The queue and the export never wait for the AI.
      </span>
    </Card>
  );
}
