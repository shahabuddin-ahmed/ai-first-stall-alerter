import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const STALL_RULES = [
  'Each stage has its own threshold from Hiring stages (Applied 5, Screening 7, Interview 14, Assessment 7, Reference check 5, Offer 3 by default).',
  'The timer starts at the later of stage_entered_at and last_activity_at (if the file has it). last_contacted_at never resets it.',
  'The days are counted up to the reference date (today by default). Stalled when days ≥ the stage threshold; overdue = days − threshold.',
  'Order: most overdue first → later pipeline stage first → candidate ID. Paused and final stages are never queued.'
];

const DECISIONS = [
  { when: 'AI is not set up on the server', ai: false, status: 'unavailable', label: 'Template' },
  { when: 'AI drafts are switched off in Settings', ai: false, status: 'disabled', label: 'Template' },
  { when: 'No AI answer saved yet (exported before the board was opened)', ai: false, status: 'pending', label: 'Template' },
  { when: 'The last AI try failed', ai: false, status: 'unavailable', label: 'Template + Retry AI' },
  { when: 'A checked AI answer', ai: true, status: 'ai_draft', label: 'AI draft · review before use' }
];

export function RulesCard() {
  return (
    <>
      <Card className="flex flex-col gap-2 p-[22px]">
        <h2 className="text-[17px] font-semibold">The stall rule (from your stages)</h2>
        {STALL_RULES.map((rule) => (
          <span key={rule} className="text-sm leading-normal text-gray-700">
            • {rule}
          </span>
        ))}
      </Card>

      <Card className="flex flex-col gap-3 p-[22px]">
        <h2 className="text-[17px] font-semibold">AI or template? The backend decides</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-gray-600">Situation</th>
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-gray-600">Message used</th>
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-gray-600">ai_note_status</th>
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-gray-600">Label on screen</th>
              </tr>
            </thead>
            <tbody>
              {DECISIONS.map((decision) => (
                <tr key={decision.when} className="border-b border-gray-100">
                  <td className="px-3 py-2.5">{decision.when}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={decision.ai ? 'ai' : 'template'}>{decision.ai ? 'AI draft' : 'Template'}</Badge>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[13px]">{decision.status}</td>
                  <td className="px-3 py-2.5 text-gray-700">{decision.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
