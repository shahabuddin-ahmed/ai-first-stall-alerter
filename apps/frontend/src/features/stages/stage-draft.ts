import { Recipient, StageType, type Stage, type StageInput } from '@/types';

// One editable row. Inputs hold text, so the threshold and aliases are strings until saved.
export interface StageDraft {
  key: string;
  name: string;
  type: StageType;
  thresholdDays: string;
  aliases: string;
  actionCode: string;
}

export const DEFAULT_THRESHOLD_DAYS = '7';
export const DEFAULT_ACTION = 'GENERIC_FOLLOW_UP';

export const RECIPIENT_NAME: Record<Recipient, string> = {
  [Recipient.HIRING_MANAGER]: 'Hiring manager',
  [Recipient.CANDIDATE]: 'Candidate',
  [Recipient.INTERVIEW_PANEL]: 'Interview panel',
  [Recipient.ASSESSMENT_REVIEWER]: 'Assessment reviewer'
};

export function toDraft(stage: Stage): StageDraft {
  return {
    key: crypto.randomUUID(),
    name: stage.name,
    type: stage.type,
    thresholdDays: stage.thresholdDays === null ? '' : String(stage.thresholdDays),
    aliases: stage.aliases.join(', '),
    actionCode: stage.actionCode ?? ''
  };
}

export function newDraft(): StageDraft {
  return {
    key: crypto.randomUUID(),
    name: '',
    type: StageType.WATCHED,
    thresholdDays: DEFAULT_THRESHOLD_DAYS,
    aliases: '',
    actionCode: DEFAULT_ACTION
  };
}

export function toInput(draft: StageDraft): StageInput {
  const watched = draft.type === StageType.WATCHED;
  return {
    name: draft.name.trim(),
    type: draft.type,
    thresholdDays: watched && draft.thresholdDays ? Number(draft.thresholdDays) : null,
    aliases: draft.aliases
      .split(',')
      .map((alias) => alias.trim())
      .filter(Boolean),
    actionCode: watched && draft.actionCode ? draft.actionCode : null
  };
}
