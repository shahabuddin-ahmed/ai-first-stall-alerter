import { AppShell } from '@/components/layout/app-shell';
import { EmptyState } from '@/components/shared/empty-state';

export default function FollowUpsPage() {
  return (
    <AppShell>
      <EmptyState title="Follow-ups" description="This page is built in phase 3." />
    </AppShell>
  );
}
