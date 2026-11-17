import { Card } from '@/components/ui/card';

const NOTE_STATUSES = [
  { value: 'ai_draft', text: 'A checked AI draft is in message_draft.' },
  { value: 'pending', text: 'No AI answer was saved yet when you exported; the template is used.' },
  { value: 'unavailable', text: 'AI is not set up, or the last AI try failed; the template is used.' },
  { value: 'disabled', text: 'AI drafts are switched off in Settings; the template is used.' }
];

const FORMULA_EXAMPLES = [
  { upload: '=SUM(A1:A9)', exported: "'=SUM(A1:A9)" },
  { upload: '@Recruiter A', exported: "'@Recruiter A" },
  { upload: '"Lopes, Ana"', exported: '"Lopes, Ana"' }
];

export function ExportNotes() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
      <Card className="flex flex-col gap-2.5 p-5">
        <h2 className="text-[17px] font-semibold">ai_note_status values</h2>
        {NOTE_STATUSES.map((status) => (
          <div key={status.value} className="flex flex-wrap items-baseline gap-2.5 border-b border-gray-100 pb-2">
            <span className="min-w-[130px] rounded-md border bg-secondary px-2 py-0.5 font-mono text-[13px]">
              {status.value}
            </span>
            <span className="text-sm leading-snug text-gray-700">{status.text}</span>
          </div>
        ))}
      </Card>

      <Card className="flex flex-col gap-2.5 p-5">
        <h2 className="text-[17px] font-semibold">Spreadsheet formula guard</h2>
        <p className="text-sm leading-normal text-gray-700">
          A text cell starting with = + - @, a tab or a return could run as a formula in Excel or Sheets. The export adds
          a &apos; in front so it shows as plain text. Values with commas, quotes or line breaks are quoted.
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-gray-600">In the upload</th>
              <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-gray-600">In the export</th>
            </tr>
          </thead>
          <tbody>
            {FORMULA_EXAMPLES.map((example) => (
              <tr key={example.upload} className="border-b border-gray-100">
                <td className="px-3 py-2.5 font-mono text-[13px] text-red-800">{example.upload}</td>
                <td className="px-3 py-2.5 font-mono text-[13px] text-green-800">{example.exported}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
