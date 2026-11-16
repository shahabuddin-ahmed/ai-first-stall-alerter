'use client';

import { useState } from 'react';
import { QueueRow } from '@/features/follow-ups/queue-row';
import type { QueueItem } from '@/types';

const COLUMNS = ['#', 'Candidate', 'Role', 'Stage', 'Recruiter', 'Days', 'Threshold', 'Overdue', 'Message'];

export function QueueTable({ items }: { items: QueueItem[] }) {
  const [openRank, setOpenRank] = useState<number | null>(null);

  return (
    <div className="@container overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
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
              open={openRank === item.rank}
              onToggle={() => setOpenRank(openRank === item.rank ? null : item.rank)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
