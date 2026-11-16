import { Card } from '@/components/ui/card';

const columns = [
  { name: 'candidate_id', required: true, rule: 'Unique. Case-sensitive text; leading zeros kept (0142).' },
  { name: 'name', required: true, rule: 'Candidate name.' },
  { name: 'role', required: true, rule: 'Job title.' },
  {
    name: 'stage',
    required: true,
    rule: 'A stage name or alias from your pipeline (any case). Unknown stages become row errors.'
  },
  { name: 'stage_entered_at', required: true, rule: 'Real date in YYYY-MM-DD, not after the reference date.' },
  { name: 'recruiter', required: true, rule: 'Who owns the follow-up.' },
  {
    name: 'last_activity_at',
    required: false,
    rule: 'Date of the last real step (interview held, assessment submitted, offer sent). The timer counts from this if it is later than stage_entered_at.'
  },
  {
    name: 'last_contacted_at',
    required: false,
    rule: 'Shown for information only. A message is not progress, so it never changes the timer or the rank.'
  }
];

export function CsvColumns() {
  return (
    <Card className="flex flex-col gap-3 p-[22px]">
      <h2 className="text-[17px] font-semibold">CSV columns</h2>
      <p className="text-sm text-gray-600">Columns can be in any order. Other columns are ignored and not stored.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="py-2 pr-4 font-semibold">Column</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Required</th>
              <th scope="col" className="py-2 font-semibold">Rule</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column) => (
              <tr key={column.name} className="border-b last:border-b-0">
                <td className="py-2.5 pr-4 font-mono text-[13px]">{column.name}</td>
                <td className="py-2.5 pr-4">{column.required ? 'Yes' : 'No'}</td>
                <td className="py-2.5 text-gray-700">{column.rule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
