'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { api, errorMessage } from '@/lib/api';
import type { AiModel, Settings } from '@/types';

interface AiSettingsCardProps {
  initial: Settings;
  models: AiModel[];
}

function stateLabel(settings: Settings): string {
  if (!settings.aiConfigured) {
    return 'Not available';
  }
  return settings.useAiDrafts ? 'On' : 'Off';
}

export function AiSettingsCard({ initial, models }: AiSettingsCardProps) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const locked = !settings.aiConfigured;
  // The saved model may be missing from the list (for example when the list could not be loaded)
  const modelOptions = models.some((model) => model.modelId === settings.aiModel)
    ? models
    : [{ modelId: settings.aiModel, name: settings.aiModel, contextLength: null }, ...models];

  const save = async (change: Partial<Pick<Settings, 'useAiDrafts' | 'aiModel'>>) => {
    setSaving(true);
    try {
      const data = await api.saveSettings({ useAiDrafts: settings.useAiDrafts, aiModel: settings.aiModel, ...change });
      setSettings(data);
      toast.success('Settings saved.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1">
          <h2 id="ai-drafts-heading" className="text-[17px] font-semibold">
            Use AI drafts
          </h2>
          <span className="text-sm leading-normal text-gray-600">
            When on, the top alerts get an AI-written briefing note and message draft. Every alert always has a template
            message, AI or not.
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span id="ai-drafts-state" className="text-sm font-semibold text-gray-700">
            {stateLabel(settings)}
          </span>
          <Switch
            aria-labelledby="ai-drafts-heading"
            aria-describedby="ai-drafts-state"
            checked={settings.useAiDrafts && !locked}
            disabled={locked || saving}
            onChange={(useAiDrafts) => save({ useAiDrafts })}
          />
        </div>
      </div>

      {locked && (
        <div role="note" className="rounded-[10px] border bg-secondary px-3.5 py-3 text-sm text-gray-700">
          AI is not set up on the server (no AI_API_KEY in the backend .env). Messages use templates until it is set up.
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 border-t pt-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">AI on the server</span>
          <span className="text-sm font-semibold">{settings.aiConfigured ? 'Set up' : 'Not set up'}</span>
          <span className="text-[13px] text-gray-600">From AI_API_KEY in the backend .env</span>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ai-model" className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            AI model
          </label>
          <select
            id="ai-model"
            className="h-10 rounded-[10px] border border-input bg-card px-2.5 text-sm"
            value={settings.aiModel}
            disabled={locked || saving}
            onChange={(event) => save({ aiModel: event.target.value })}
          >
            {modelOptions.map((model) => (
              <option key={model.modelId} value={model.modelId}>
                {model.name}
              </option>
            ))}
          </select>
          <span className="text-[13px] text-gray-600">
            Only models that support structured answers are listed. A new model writes new AI drafts the next time each
            board is opened (one AI call per board and date).
          </span>
        </div>
      </div>
    </Card>
  );
}
