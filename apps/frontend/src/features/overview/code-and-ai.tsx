import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const byCode = [
  'Who is stalled',
  'The rank order',
  'The reason sentence',
  'The action for each stage',
  'All counts',
  'The bottlenecks (stage and recruiter)'
];

const byAi = ['A short board briefing', 'A note on each bottleneck', 'One follow-up message draft per action, used for every alert'];

function Points({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5 text-sm leading-snug text-gray-800">
      {items.map((item) => (
        <li key={item}>• {item}</li>
      ))}
    </ul>
  );
}

export function CodeAndAi() {
  return (
    <Card className="flex flex-col gap-4 p-[22px]">
      <h2 className="text-lg font-semibold">
        The one rule: code decides, AI only writes
      </h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <div className="flex flex-col gap-2.5 rounded-[10px] border bg-secondary p-4">
          <Badge variant="ok" className="self-start">
            Decided by code · exact, tested
          </Badge>
          <Points items={byCode} />
        </div>
        <div className="flex flex-col gap-2.5 rounded-[10px] border bg-secondary p-4">
          <Badge variant="ai" className="self-start">
            Written by AI · checked, optional
          </Badge>
          <Points items={byAi} />
          <p className="pt-1 text-sm leading-snug text-gray-600">
            AI drafts are switched on or off in{' '}
            <Link href="/settings" className="text-indigo-700 hover:text-indigo-800">
              Settings
            </Link>
            . If AI is off, not set up, or fails, every alert still gets a <strong>template</strong> message.
          </p>
        </div>
      </div>
    </Card>
  );
}
