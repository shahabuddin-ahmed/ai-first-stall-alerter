'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageState } from '@/components/shared/page-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppDispatch, useAppSelector } from '@/hooks/use-app-redux';
import { api } from '@/lib/api';
import { boardHref } from '@/lib/board-link';
import { formatDate, formatFileSize, localIsoDate } from '@/lib/format';
import { selectBoard } from '@/stores/slices/board-slice';
import type { ImportSummary } from '@/types';

export function RecentImports() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const openId = useAppSelector((state) => state.board.current?.importId);
  const [imports, setImports] = useState<ImportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getImports()
      .then((data) => setImports(data.data))
      .catch(() => setError('Could not load the imports.'))
      .finally(() => setLoading(false));
  }, []);

  const open = (item: ImportSummary) => {
    // The upload day: reopening shows the same list and the same saved AI notes
    const board = { importId: item.id, fileName: item.fileName, referenceDate: localIsoDate(item.createdAt) };
    dispatch(selectBoard(board));
    router.push(boardHref('/follow-ups', board));
  };

  if (loading) {
    return <PageState message="Loading imports…" />;
  }
  if (error) {
    return <PageState message={error} error />;
  }

  return (
    <Card className="flex flex-col gap-3 p-[22px]">
      <h2 className="text-[17px] font-semibold">Recent imports</h2>
      {imports.length === 0 ? (
        <p className="text-sm text-gray-600">No imports yet. Upload a CSV above to start.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {imports.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{item.fileName}</span>
                <span className="text-[13px] text-gray-600">
                  {item.recordCount.toLocaleString('en-US')} rows · {formatFileSize(item.fileSize)} · uploaded{' '}
                  {formatDate(localIsoDate(item.createdAt))}
                </span>
              </div>
              {item.id === openId ? (
                <Badge variant="ai">Open now</Badge>
              ) : (
                <Button variant="outline" size="sm" onClick={() => open(item)}>
                  Open
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
