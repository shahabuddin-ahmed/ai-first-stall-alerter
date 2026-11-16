import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const RULES = [
  'Stage names and aliases are unique, ignoring case and spaces.',
  'Names: 1 to 30 letters, numbers, spaces or dashes. Up to 10 aliases per stage, up to 30 stages.',
  'Watched stages need a threshold from 1 to 90 days and a follow-up action.',
  'At least one watched stage.',
  'Follow-up actions come from a fixed list. Only the action code reaches the AI, never stage names or custom text.'
];

export function StageGuide() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
      <Card className="flex flex-col gap-2.5 p-5">
        <h2 className="text-[17px] font-semibold">Stage types</h2>
        <span className="text-sm text-gray-700">
          <Badge variant="ai">Watched</Badge> Checked against its threshold and can appear in the queue.
        </span>
        <span className="text-sm text-gray-700">
          <Badge variant="warn">Paused</Badge> On purpose (for example a frozen role). Never queued; counted as &quot;On
          hold&quot;.
        </span>
        <span className="text-sm text-gray-700">
          <Badge variant="template">Final</Badge> The process is finished. Valid, never queued.
        </span>
      </Card>
      <Card className="flex flex-col gap-2 p-5">
        <h2 className="text-[17px] font-semibold">Rules when saving</h2>
        {RULES.map((rule) => (
          <span key={rule} className="text-sm leading-snug text-gray-700">
            • {rule}
          </span>
        ))}
      </Card>
    </div>
  );
}
