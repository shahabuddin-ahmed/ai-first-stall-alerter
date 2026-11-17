import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MessageSource } from '@/types';

const PREVIEW_ROWS = 5;
const MESSAGE_START_CHARS = 60;
const COLUMNS = ['rank', 'candidate_id', 'name', 'stage', 'stage_threshold', 'overdue_days', 'message_source', 'ai_note_status'];

interface ExportPreviewProps {
  header: string[];
  rows: string[][];
}

function messageStart(message: string): string {
  return message.length > MESSAGE_START_CHARS ? `${message.slice(0, MESSAGE_START_CHARS)}…` : message;
}

export function ExportPreview({ header, rows }: ExportPreviewProps) {
  const column = (row: string[], name: string) => row[header.indexOf(name)] ?? '';

  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-[17px] font-semibold">Preview (first {Math.min(PREVIEW_ROWS, rows.length)} rows of the file)</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b">
              {[...COLUMNS, 'message_draft (start)'].map((name) => (
                <th key={name} scope="col" className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap text-gray-600">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="align-top">
            {rows.slice(0, PREVIEW_ROWS).map((row) => (
              <tr key={column(row, 'rank')} className="border-b border-gray-100">
                <td className="px-3 py-2.5">{column(row, 'rank')}</td>
                <td className="px-3 py-2.5">{column(row, 'candidate_id')}</td>
                <td className="px-3 py-2.5">{column(row, 'name')}</td>
                <td className="px-3 py-2.5">{column(row, 'stage')}</td>
                <td className="px-3 py-2.5">{column(row, 'stage_threshold')}</td>
                <td className="px-3 py-2.5">{column(row, 'overdue_days')}</td>
                <td className="px-3 py-2.5">
                  <Badge variant={column(row, 'message_source') === MessageSource.AI_DRAFT ? 'ai' : 'template'}>
                    {column(row, 'message_source')}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 font-mono text-[13px]">{column(row, 'ai_note_status')}</td>
                <td className="px-3 py-2.5 text-gray-700">{messageStart(column(row, 'message_draft'))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
