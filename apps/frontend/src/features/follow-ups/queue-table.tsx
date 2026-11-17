'use client';

import { useState } from 'react';
import { QueueRow } from '@/features/follow-ups/queue-row';
import { fillPlaceholders } from '@/lib/messages';
import type { ActionMessage, QueueItem } from '@/types';

const COLUMNS = ['#', 'Candidate', 'Role', 'Stage', 'Recruiter', 'Waiting on', 'Waiting', 'Threshold', 'Overdue', 'Message'];

interface QueueTableProps {
  items: QueueItem[];
  actionMessages: ActionMessage[];
}

export function QueueTable({ items, actionMessages }: QueueTableProps) {
  const [openRank, setOpenRank] = useState<number | null>(null);
  const messageByAction = new Map(actionMessages.map((message) => [message.actionCode, message.text]));
  const aiDraftOf = (item: QueueItem) => {
    const text = messageByAction.get(item.actionCode);
    return text ? fillPlaceholders(text, item) : null;
  };

  return (
    <div className="@container overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[1120px] text-left text-sm">
        <thead>
          <tr className="border-b bg-secondary">
            <th scope="col" className="w-9 px-2">
              <span className="sr-only">Details</span>
            </th>
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className="px-3 py-2.5 text-[11px] font-semibold tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase">
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
              aiDraft={aiDraftOf(item)}
              open={openRank === item.rank}
              onToggle={() => setOpenRank(openRank === item.rank ? null : item.rank)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
