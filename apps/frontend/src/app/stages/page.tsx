import { AppShell } from '@/components/layout/app-shell';
import { StagesEditor } from '@/features/stages/stages-editor';

export default function StagesPage() {
  return (
    <AppShell>
      <span className="text-[13px] text-gray-600">StallAlert / Hiring stages</span>
      <StagesEditor />
    </AppShell>
  );
}
