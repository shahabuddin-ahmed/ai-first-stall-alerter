'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { NoBoard } from '@/components/shared/no-board';
import { PageState } from '@/components/shared/page-state';
import { Pager } from '@/components/shared/pager';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BoardSettings } from '@/features/follow-ups/board-settings';
import { InsightsCard } from '@/features/follow-ups/insights-card';
import { QueueFilters, type Filters } from '@/features/follow-ups/queue-filters';
import { QueueTable } from '@/features/follow-ups/queue-table';
import { RowErrorsTable } from '@/features/follow-ups/row-errors-table';
import { SummaryStats } from '@/features/follow-ups/summary-stats';
import { useAppDispatch } from '@/hooks/use-app-redux';
import { useApiData } from '@/hooks/use-api-data';
import { api } from '@/lib/api';
import { BOARD_PARAMS, boardHref } from '@/lib/board-link';
import { localIsoDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { selectBoard } from '@/stores/slices/board-slice';
import type { PipelineView } from '@/types';

enum Tab {
  QUEUE = 'queue',
  ROW_ERRORS = 'row_errors'
}

const NO_FILTERS: Filters = { stage: '', recruiter: '', search: '' };

function QueueEmpty({ view, onShowErrors }: { view: PipelineView; onShowErrors: () => void }) {
  if (view.counts.valid === 0) {
    return (
      <div className="flex flex-col items-start gap-3 p-5">
        <p className="font-semibold">None of the {view.counts.total.toLocaleString('en-US')} rows could be used.</p>
        <p className="text-sm text-gray-600">Open Row errors to see what is wrong in each row, fix the file, and import it again.</p>
        <div className="flex flex-wrap gap-2.5">
          <Button size="sm" onClick={onShowErrors}>
            See row errors
          </Button>
          <Link href="/imports" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Choose another file
          </Link>
        </div>
      </div>
    );
  }
  if (view.counts.stalled === 0) {
    return (
      <div className="flex flex-col items-start gap-3 p-5">
        <p className="font-semibold">Everyone is moving. No application has passed its stage threshold.</p>
        <p className="text-sm text-gray-600">To look closer, lower a stage threshold in Hiring stages.</p>
        <Link href="/stages" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Edit thresholds
        </Link>
      </div>
    );
  }
  return <p className="p-5 text-sm text-gray-600">No follow-ups match these filters.</p>;
}

export function FollowUpsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const importId = Number(searchParams.get(BOARD_PARAMS.IMPORT));
  const referenceDate = searchParams.get(BOARD_PARAMS.DATE) ?? '';
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState(Tab.QUEUE);
  const [retry, setRetry] = useState<{ board: string; count: number } | null>(null);
  const boardKey = `${importId}|${referenceDate}`;

  const load = useMemo(
    () => (importId && referenceDate ? () => api.getQueue(importId, { referenceDate, page, ...filters }) : null),
    [importId, referenceDate, page, filters]
  );
  const { data: view, error, loading } = useApiData(load);

  // Runs once when the board opens. After a failure the backend does not ask the AI again: only Retry does
  const loadInsights = useMemo(
    () =>
      importId && referenceDate ? () => api.getInsights(importId, referenceDate, retry?.board === boardKey) : null,
    [importId, referenceDate, retry, boardKey]
  );
  const insights = useApiData(loadInsights);
  // Drafts from the last board or date must not show next to a new queue
  const freshInsights = insights.loading ? null : insights.data;

  if (!importId || !referenceDate) {
    return <NoBoard />;
  }
  if (error) {
    return <PageState message={error} error />;
  }
  if (!view) {
    return <PageState message="Loading the queue…" />;
  }

  const changeDate = (date: string) => {
    const board = { importId, fileName: view.import.fileName, referenceDate: date };
    dispatch(selectBoard(board));
    setPage(1);
    router.replace(boardHref('/follow-ups', board));
  };

  const changeFilters = (next: Filters) => {
    setFilters(next);
    setPage(1);
  };

  const tabs = [
    { id: Tab.QUEUE, label: `Queue (${view.counts.stalled})` },
    { id: Tab.ROW_ERRORS, label: `Row errors (${view.counts.invalid})` }
  ];

  return (
    <>
      <span className="text-[13px] text-gray-600">StallAlert / Follow-ups</span>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-bold tracking-tight">Follow-up queue</h1>
          <p className="text-[15px] text-gray-600">{view.import.fileName} · most overdue first</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/imports" className={buttonVariants({ variant: 'outline' })}>
            Replace file
          </Link>
          {view.counts.stalled > 0 ? (
            <Link href={boardHref('/export', { importId, fileName: view.import.fileName, referenceDate })} className={buttonVariants()}>
              Export {view.counts.stalled} rows
            </Link>
          ) : (
            <Button disabled>Export (no rows)</Button>
          )}
        </div>
      </div>

      <BoardSettings
        referenceDate={referenceDate}
        maxDate={localIsoDate()}
        thresholds={view.stageThresholds}
        onDateChange={changeDate}
      />

      <SummaryStats counts={view.counts} />

      {view.counts.invalid > 0 && view.counts.valid > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-3">
          <span className="text-sm text-amber-900">
            <strong>{view.counts.invalid} invalid rows were left out of the queue.</strong> The queue uses the{' '}
            {view.counts.valid} valid rows.
          </span>
          <Button variant="outline" size="sm" onClick={() => setTab(Tab.ROW_ERRORS)}>
            See row errors
          </Button>
        </div>
      )}

      {view.counts.stalled > 0 && (
        <InsightsCard
          insights={freshInsights}
          error={insights.error}
          stalled={view.counts.stalled}
          onRetry={() => setRetry({ board: boardKey, count: (retry?.count ?? 0) + 1 })}
        />
      )}

      <Card className="flex flex-col">
        <div role="tablist" aria-label="View" className="flex gap-1 border-b px-3">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'h-11 border-b-2 border-transparent px-4 text-sm font-semibold text-gray-600',
                tab === item.id && 'border-primary text-indigo-800'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === Tab.QUEUE ? (
          <div className={cn('flex flex-col gap-2 px-2 pt-3 pb-3', loading && 'opacity-60')}>
            {view.counts.stalled > 0 && (
              <QueueFilters
                filters={filters}
                stages={view.filterOptions.stages}
                recruiters={view.filterOptions.recruiters}
                onChange={changeFilters}
              />
            )}
            {view.queue.items.length > 0 ? (
              <>
                <span className="px-1.5 pt-1 text-[13px] text-gray-600">
                  Click a candidate to see the reason, the action and the message.
                  {insights.loading && ' AI drafts for the top alerts are still being written; templates show until then.'}
                </span>
                <QueueTable items={view.queue.items} drafts={freshInsights?.drafts ?? []} />
                <Pager page={view.queue.page} pageSize={view.queue.pageSize} total={view.queue.total} onChange={setPage} />
              </>
            ) : (
              <QueueEmpty view={view} onShowErrors={() => setTab(Tab.ROW_ERRORS)} />
            )}
          </div>
        ) : (
          <div className="px-2 pb-3">
            <RowErrorsTable importId={importId} referenceDate={referenceDate} />
          </div>
        )}
      </Card>
    </>
  );
}
