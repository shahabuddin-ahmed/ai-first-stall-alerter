import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { SettingsView } from '@/features/settings/settings-view';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <AppShell>
      <span className="text-[13px] text-gray-600">StallAlert / Settings</span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-bold tracking-tight">Settings</h1>
        <p className="text-[15px] text-gray-600">
          Team preferences, saved in the database. The server key lives in the backend .env and is never shown here.
        </p>
      </div>
      <SettingsView />
    </AppShell>
  );
}
