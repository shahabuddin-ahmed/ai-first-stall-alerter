'use client';

import { useState } from 'react';
import { QueueRow } from '@/features/follow-ups/queue-row';
import type { InsightDraft, QueueItem } from '@/types';

const COLUMNS = ['#', 'Candidate', 'Role', 'Stage', 'Recruiter', 'Waiting on', 'Waiting', 'Threshold', 'Overdue', 'Message'];

interface QueueTableProps {
  items: QueueItem[];
  drafts: InsightDraft[];
}

export function QueueTable({ items, drafts }: QueueTableProps) {
  const [openRank, setOpenRank] = useState<number | null>(null);
  const draftsByRank = new Map(drafts.map((draft) => [draft.rank, draft]));

  return (
    <div className="@container overflow-x-auto">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead>
          <tr className="border-b">
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap text-gray-600">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="align-top">
          {items.map((item) => (
            <QueueRow
              key={item.rank}
              item={item}
              draft={draftsByRank.get(item.rank)}
              open={openRank === item.rank}
              onToggle={() => setOpenRank(openRank === item.rank ? null : item.rank)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
