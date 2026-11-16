import { AppShell } from '@/components/layout/app-shell';
import { EmptyState } from '@/components/shared/empty-state';

export default function StagesPage() {
  return (
    <AppShell>
      <EmptyState title="Hiring stages" description="This page is built in phase 6." />
    </AppShell>
  );
}
