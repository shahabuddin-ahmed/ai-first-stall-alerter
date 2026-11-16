import { AppShell } from '@/components/layout/app-shell';
import { EmptyState } from '@/components/shared/empty-state';

export default function ImportsPage() {
  return (
    <AppShell>
      <EmptyState title="Imports" description="This page is built in phase 2." />
    </AppShell>
  );
}
