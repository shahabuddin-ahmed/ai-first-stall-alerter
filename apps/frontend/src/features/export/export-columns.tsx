import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const HIGHLIGHTED = ['stage_threshold', 'timer_from', 'message_to', 'message_draft', 'message_source', 'ai_note_status'];

export function ExportColumns({ columns }: { columns: string[] }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-[17px] font-semibold">Columns, in this order</h2>
      <div className="flex flex-wrap gap-2">
        {columns.map((column) => (
          <span
            key={column}
            className={cn(
              'rounded-md border bg-secondary px-2 py-1 font-mono text-[13px]',
              HIGHLIGHTED.includes(column) && 'border-indigo-200 bg-indigo-50 text-indigo-800'
            )}
          >
            {column}
          </span>
        ))}
      </div>
      <span className="text-[13px] text-gray-600">
        Highlighted: the per-stage and message columns. message_draft is always filled: the AI draft when one exists,
        otherwise the template.
      </span>
    </Card>
  );
}
