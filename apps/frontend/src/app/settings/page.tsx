import { AppShell } from '@/components/layout/app-shell';
import { EmptyState } from '@/components/shared/empty-state';

export default function SettingsPage() {
  return (
    <AppShell>
      <EmptyState title="Settings" description="This page is built in phase 7." />
    </AppShell>
  );
}
