import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { buttonVariants } from '@/components/ui/button';
import { CodeAndAi } from '@/features/overview/code-and-ai';
import { FlowSteps } from '@/features/overview/flow-steps';
import { KeyRules } from '@/features/overview/key-rules';

export default function OverviewPage() {
  return (
    <AppShell>
      <span className="text-[13px] text-gray-600">StallAlert / Overview</span>

      <section className="flex max-w-[860px] flex-col gap-3.5">
        <h1 className="text-4xl leading-tight font-bold tracking-tight">Who should I follow up first?</h1>
        <p className="text-[17px] leading-relaxed text-gray-700">
          Upload a hiring-board CSV. StallAlert finds applications that have stayed in a stage longer than your pipeline
          allows, ranks who to chase first, says what to do, and gives a ready-to-send follow-up message for each.
        </p>
        <div className="flex flex-wrap gap-3 pt-1.5">
          <Link href="/imports" className={buttonVariants()}>
            Start: import a board
          </Link>
          <Link href="/stages" className={buttonVariants({ variant: 'outline' })}>
            Set up hiring stages
          </Link>
          <Link href="/how-it-works" className={buttonVariants({ variant: 'outline' })}>
            How it works
          </Link>
        </div>
      </section>

      <FlowSteps />
      <CodeAndAi />
      <KeyRules />
    </AppShell>
  );
}
