'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';
import { NoBoard } from '@/components/shared/no-board';
import { PageState } from '@/components/shared/page-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExportColumns } from '@/features/export/export-columns';
import { ExportNotes } from '@/features/export/export-notes';
import { ExportPreview } from '@/features/export/export-preview';
import { useApiData } from '@/hooks/use-api-data';
import { api } from '@/lib/api';
import { BOARD_PARAMS, boardHref } from '@/lib/board-link';
import { parseCsv, saveFile } from '@/lib/csv';

const CSV_TYPE = 'text/csv;charset=utf-8';

export function ExportView() {
  const searchParams = useSearchParams();
  const importId = Number(searchParams.get(BOARD_PARAMS.IMPORT));
  const referenceDate = searchParams.get(BOARD_PARAMS.DATE) ?? '';

  const load = useMemo(
    () => (importId && referenceDate ? () => api.getExport(importId, referenceDate) : null),
    [importId, referenceDate]
  );
  const { data: file, error } = useApiData(load);
  const [header = [], ...rows] = useMemo(() => (file ? parseCsv(file.text) : []), [file]);

  if (!importId || !referenceDate) {
    return <NoBoard />;
  }
  if (error) {
    return <PageState message={error} error />;
  }
  if (!file) {
    return <PageState message="Preparing the export…" />;
  }

  const queueHref = boardHref('/follow-ups', { importId, fileName: file.fileName, referenceDate });

  return (
    <>
      <span className="text-[13px] text-gray-600">StallAlert / Export CSV</span>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-bold tracking-tight">Export CSV</h1>
          <p className="text-[15px] text-gray-600">
            Downloads the whole queue, in the same order, with each stage&apos;s threshold and the message for each row.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href={queueHref} className={buttonVariants({ variant: 'outline' })}>
            Back to the queue
          </Link>
          <Button disabled={rows.length === 0} onClick={() => saveFile(file.bytes, file.fileName, CSV_TYPE)}>
            <Download aria-hidden="true" className="size-4" />
            {rows.length > 0 ? `Download ${file.fileName} (${rows.length} rows)` : 'Export (no rows)'}
          </Button>
        </div>
      </div>

      <ExportColumns columns={header} />
      {rows.length > 0 ? (
        <ExportPreview header={header} rows={rows} />
      ) : (
        <Card className="p-5 text-sm text-gray-600">Nobody is stalled on this date, so there is nothing to export.</Card>
      )}
      <ExportNotes />
    </>
  );
}
