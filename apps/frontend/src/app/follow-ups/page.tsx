import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { FollowUpsView } from '@/features/follow-ups/follow-ups-view';

export const metadata: Metadata = { title: 'Follow-ups' };

export default function FollowUpsPage() {
  return (
    <AppShell>
      <Suspense>
        <FollowUpsView />
      </Suspense>
    </AppShell>
  );
}
