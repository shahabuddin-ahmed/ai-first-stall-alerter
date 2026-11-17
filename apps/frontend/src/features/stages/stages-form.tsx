'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StageRow } from '@/features/stages/stage-row';
import { newDraft, toDraft, toInput, type StageDraft } from '@/features/stages/stage-draft';
import { api, ApiError, errorMessage } from '@/lib/api';
import { StageType, type StageList } from '@/types';

const COLUMNS = ['Order', 'Stage name', 'Type', 'Threshold (days)', 'Aliases (other names in CSVs)', 'Follow-up action', 'Message goes to', ''];

const sameStages = (a: StageDraft[], b: StageDraft[]) =>
  JSON.stringify(a.map(toInput)) === JSON.stringify(b.map(toInput));

export function StagesForm({ initial }: { initial: StageList }) {
  const [version, setVersion] = useState(initial.version);
  const [saved, setSaved] = useState(() => initial.stages.map(toDraft));
  const [rows, setRows] = useState(saved);
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const changed = !sameStages(rows, saved);
  const watchedCount = rows.filter((row) => row.type === StageType.WATCHED).length;

  const update = (key: string, change: Partial<StageDraft>) =>
    setRows(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));

  const move = (index: number, step: number) => {
    const next = [...rows];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    setRows(next);
  };

  const save = async () => {
    setSaving(true);
    setProblems([]);
    try {
      const data = await api.saveStages(version, rows.map(toInput));
      const drafts = data.stages.map(toDraft);
      setVersion(data.version);
      setSaved(drafts);
      setRows(drafts);
      toast.success('Saved. Every queue now uses these stages.');
    } catch (error) {
      const details = error instanceof ApiError ? error.errors : [];
      setProblems(details.length > 0 ? details : [errorMessage(error)]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-3xl flex-col gap-1.5">
          <h1 className="text-[28px] font-bold tracking-tight">Hiring stages</h1>
          <p className="text-[15px] leading-normal text-gray-600">
            Your company&apos;s own hiring stages. Each stage has its own threshold. Order matters: stages lower in the
            list are closer to a hire, so they win ties in the queue. Saving recalculates every queue right away, with
            no re-upload.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {changed && <Badge variant="warn">Unsaved changes</Badge>}
          <Button variant="outline" disabled={!changed || saving} onClick={() => setRows(saved)}>
            Undo changes
          </Button>
          <Button disabled={!changed || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      {problems.length > 0 && (
        <div role="alert" className="flex flex-col gap-1.5 rounded-xl border border-red-200 bg-red-50 p-4">
          <strong className="text-sm text-red-900">The stages were not saved:</strong>
          <ul className="list-disc pl-5 text-sm text-red-900">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      <Card className="flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
          <h2 className="text-[17px] font-semibold">Stages</h2>
          <span className="text-[13px] text-gray-600">
            {rows.length} stages · {watchedCount} watched
          </span>
        </div>
        <div className="overflow-x-auto px-3 pt-2">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b">
                {COLUMNS.map((column) => (
                  <th key={column} scope="col" className="px-2 py-2.5 text-xs font-semibold whitespace-nowrap text-gray-600">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <StageRow
                  key={row.key}
                  draft={row}
                  position={index + 1}
                  isFirst={index === 0}
                  isLast={index === rows.length - 1}
                  actions={initial.actions}
                  onChange={(change) => update(row.key, change)}
                  onMove={(step) => move(index, step)}
                  onRemove={() => setRows(rows.filter((item) => item.key !== row.key))}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4">
          <Button variant="outline" size="sm" onClick={() => setRows([...rows, newDraft()])}>
            <Plus aria-hidden="true" className="size-4" />
            Add stage
          </Button>
        </div>
      </Card>
    </>
  );
}
