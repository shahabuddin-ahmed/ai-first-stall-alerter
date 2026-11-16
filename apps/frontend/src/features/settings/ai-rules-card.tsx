import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const RULES = [
  { server: 'Not set up', team: 'Any (switch disabled)', result: 'Templates only', ai: false },
  { server: 'Set up', team: 'Off', result: 'Templates only, no AI calls, no cost', ai: false },
  { server: 'Set up', team: 'On', result: 'AI drafts for the top alerts; templates if AI fails', ai: true }
];

export function AiRulesCard() {
  return (
    <Card className="flex flex-col gap-3 p-[22px]">
      <h2 className="text-[17px] font-semibold">When AI runs</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b">
              <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-gray-600">Server key (.env)</th>
              <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-gray-600">Use AI drafts (this page)</th>
              <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-gray-600">Result</th>
            </tr>
          </thead>
          <tbody>
            {RULES.map((rule) => (
              <tr key={rule.result} className="border-b border-gray-100">
                <td className="px-3 py-2.5">{rule.server}</td>
                <td className="px-3 py-2.5">{rule.team}</td>
                <td className="px-3 py-2.5">
                  <Badge variant={rule.ai ? 'ai' : 'template'}>{rule.result}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-gray-600">
        AI runs once per board and date, right after the board opens. A good answer is saved and reused. A failed try is
        remembered too, so the AI is asked again only when you click Retry AI.
      </p>
    </Card>
  );
}
