'use client';

import { AiPrivacyCard } from '@/components/shared/ai-privacy-card';
import { PageState } from '@/components/shared/page-state';
import { AiRulesCard } from '@/features/settings/ai-rules-card';
import { AiSettingsCard } from '@/features/settings/ai-settings-card';
import { StoredImports } from '@/features/settings/stored-imports';
import { useApiData } from '@/hooks/use-api-data';
import { api } from '@/lib/api';

export function SettingsView() {
  const settings = useApiData(api.getSettings);
  // Not required: without the list, the saved model is still shown
  const models = useApiData(api.getModels);
  const imports = useApiData(api.getImports);

  const error = settings.error || imports.error;
  if (error) {
    return <PageState message={error} error />;
  }
  if (!settings.data || !imports.data || models.loading) {
    return <PageState message="Loading the settings…" />;
  }

  return (
    <>
      <AiSettingsCard initial={settings.data} models={models.data ?? []} modelsError={models.error} />
      <AiRulesCard />
      <StoredImports initial={imports.data.data} />
      <AiPrivacyCard />
    </>
  );
}
