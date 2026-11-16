import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ExportView } from '@/features/export/export-view';

export const metadata: Metadata = { title: 'Export' };

export default function ExportPage() {
  return (
    <AppShell>
      <Suspense>
        <ExportView />
      </Suspense>
    </AppShell>
  );
}
