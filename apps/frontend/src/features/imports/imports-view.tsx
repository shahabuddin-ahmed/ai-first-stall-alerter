'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CsvColumns } from '@/features/imports/csv-columns';
import { FileRejected } from '@/features/imports/file-rejected';
import type { Rejection } from '@/features/imports/import-form';
import { RecentImports } from '@/features/imports/recent-imports';
import { RejectionCodes } from '@/features/imports/rejection-codes';

// Client only: the default reference date is "today" on the user's clock, not the build server's
const ImportForm = dynamic(() => import('@/features/imports/import-form').then((module) => module.ImportForm), {
  ssr: false
});

export function ImportsView() {
  const [rejection, setRejection] = useState<Rejection | null>(null);

  if (rejection) {
    return (
      <>
        <FileRejected rejection={rejection} onRetry={() => setRejection(null)} />
        <RejectionCodes />
      </>
    );
  }

  return (
    <>
      <ImportForm onRejected={setRejection} />
      <RecentImports />
      <CsvColumns />
    </>
  );
}
