import { AppShell } from '@/components/layout/app-shell';
import { EmptyState } from '@/components/shared/empty-state';

export default function HowItWorksPage() {
  return (
    <AppShell>
      <EmptyState title="How it works" description="This page is built in phase 7." />
    </AppShell>
  );
}
