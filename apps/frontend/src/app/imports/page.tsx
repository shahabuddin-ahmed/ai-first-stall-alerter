import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { ImportsView } from '@/features/imports/imports-view';

export const metadata: Metadata = { title: 'Imports' };

export default function ImportsPage() {
  return (
    <AppShell>
      <span className="text-[13px] text-gray-600">StallAlert / Import a board</span>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-bold tracking-tight">Import a hiring board</h1>
        <p className="text-[15px] text-gray-600">
          Upload one CSV, choose the date to measure from, then analyze. Stage thresholds come from your pipeline.
        </p>
      </div>

      <ImportsView />
    </AppShell>
  );
}
