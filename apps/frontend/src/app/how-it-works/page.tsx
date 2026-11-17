import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { AiPrivacyCard } from '@/components/shared/ai-privacy-card';
import { BackendCard } from '@/features/how-it-works/backend-card';
import { FlowCard } from '@/features/how-it-works/flow-card';
import { RulesCard } from '@/features/how-it-works/rules-card';

export const metadata: Metadata = { title: 'How it works' };

export default function HowItWorksPage() {
  return (
    <AppShell>
      <span className="text-[13px] text-gray-600">StallAlert / How it works</span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-bold tracking-tight">How it works</h1>
        <p className="text-[15px] text-gray-600">
          The frontend only shows data. The backend validates, ranks with your stages, decides AI or template, and builds
          the export.
        </p>
      </div>
      <FlowCard />
      <RulesCard />
      <BackendCard />
      <AiPrivacyCard />
    </AppShell>
  );
}
