'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/app-shell';
import { CsvColumns } from '@/features/imports/csv-columns';
import { FileRejected } from '@/features/imports/file-rejected';
import type { Rejection } from '@/features/imports/import-form';
import { RecentImports } from '@/features/imports/recent-imports';
import { RejectionCodes } from '@/features/imports/rejection-codes';

// Client only: the default reference date is "today" on the user's clock, not the build server's
const ImportForm = dynamic(() => import('@/features/imports/import-form').then((module) => module.ImportForm), {
  ssr: false
});

export default function ImportsPage() {
  const [rejection, setRejection] = useState<Rejection | null>(null);

  return (
    <AppShell>
      <span className="text-[13px] text-gray-600">StallAlert / Import a board</span>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-bold tracking-tight">Import a hiring board</h1>
        <p className="text-[15px] text-gray-600">
          Upload one CSV, choose the date to measure from, then analyze. Stage thresholds come from your pipeline.
        </p>
      </div>

      {rejection ? (
        <>
          <FileRejected rejection={rejection} onRetry={() => setRejection(null)} />
          <RejectionCodes />
        </>
      ) : (
        <>
          <ImportForm onRejected={setRejection} />
          <RecentImports />
          <CsvColumns />
        </>
      )}
    </AppShell>
  );
}
