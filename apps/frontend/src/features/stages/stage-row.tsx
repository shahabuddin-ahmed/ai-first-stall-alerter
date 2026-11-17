'use client';

import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEFAULT_ACTION,
  DEFAULT_THRESHOLD_DAYS,
  RECIPIENT_NAME,
  type StageDraft
} from '@/features/stages/stage-draft';
import { StageType, type StageAction } from '@/types';


const TYPE_LABEL: Record<StageType, string> = {
  [StageType.WATCHED]: 'Watched',
  [StageType.PAUSED]: 'Paused',
  [StageType.FINAL]: 'Final'
};

interface StageRowProps {
  draft: StageDraft;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  actions: StageAction[];
  onChange: (change: Partial<StageDraft>) => void;
  onMove: (step: number) => void;
  onRemove: () => void;
}

export function StageRow({ draft, position, isFirst, isLast, actions, onChange, onMove, onRemove }: StageRowProps) {
  const watched = draft.type === StageType.WATCHED;
  const label = draft.name || `stage ${position}`;
  const recipient = actions.find((action) => action.code === draft.actionCode)?.recipient;

  const changeType = (type: StageType) => {
    // A stage that becomes watched needs a threshold and an action, so start it with the defaults
    const needsDefaults = type === StageType.WATCHED;
    onChange({
      type,
      thresholdDays: needsDefaults ? draft.thresholdDays || DEFAULT_THRESHOLD_DAYS : draft.thresholdDays,
      actionCode: needsDefaults ? draft.actionCode || DEFAULT_ACTION : draft.actionCode
    });
  };

  return (
    <tr className="border-b border-gray-100">
      <td className="px-2 py-2 font-bold text-gray-600">{position}</td>
      <td className="px-2 py-2">
        <Input
          aria-label={`Stage name, position ${position}`}
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
          className="min-w-40"
        />
      </td>
      <td className="px-2 py-2">
        <Select value={draft.type} onValueChange={(type) => changeType(type as StageType)}>
          <SelectTrigger aria-label={`Type of ${label}`} className="min-w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(StageType).map((type) => (
              <SelectItem key={type} value={type}>
                {TYPE_LABEL[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          min={1}
          max={90}
          aria-label={`Threshold in days for ${label}`}
          disabled={!watched}
          value={watched ? draft.thresholdDays : ''}
          onChange={(event) => onChange({ thresholdDays: event.target.value })}
          className="w-20"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          aria-label={`Aliases for ${label}`}
          placeholder="e.g. Phone screen"
          value={draft.aliases}
          onChange={(event) => onChange({ aliases: event.target.value })}
          className="min-w-48"
        />
      </td>
      <td className="px-2 py-2">
        {watched ? (
          <Select value={draft.actionCode} onValueChange={(actionCode) => onChange({ actionCode })}>
            <SelectTrigger aria-label={`Follow-up action for ${label}`} className="min-w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {actions.map((action) => (
                <SelectItem key={action.code} value={action.code}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">Not watched</span>
        )}
      </td>
      <td className="px-2 py-2 text-sm whitespace-nowrap text-gray-700">
        {watched && recipient ? RECIPIENT_NAME[recipient] : '—'}
      </td>
      <td className="px-2 py-2">
        <div className="flex">
          <Button variant="ghost" size="icon" aria-label={`Move ${label} up`} disabled={isFirst} onClick={() => onMove(-1)}>
            <ChevronUp aria-hidden="true" className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Move ${label} down`} disabled={isLast} onClick={() => onMove(1)}>
            <ChevronDown aria-hidden="true" className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Remove ${label}`} onClick={onRemove}>
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
