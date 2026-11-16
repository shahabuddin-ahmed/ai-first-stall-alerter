import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { FollowUpsView } from '@/features/follow-ups/follow-ups-view';

export default function FollowUpsPage() {
  return (
    <AppShell>
      <Suspense>
        <FollowUpsView />
      </Suspense>
    </AppShell>
  );
}
