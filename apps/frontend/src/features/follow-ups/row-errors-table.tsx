'use client';

import { useCallback, useState } from 'react';
import { ImportGone } from '@/components/shared/import-gone';
import { PageState } from '@/components/shared/page-state';
import { Pager } from '@/components/shared/pager';
import { Badge } from '@/components/ui/badge';
import { useApiData } from '@/hooks/use-api-data';
import { api, NOT_FOUND } from '@/lib/api';
import { RowErrorCode } from '@/types';

const FIXES: Record<RowErrorCode, string> = {
  [RowErrorCode.FIELD_COUNT]: 'Give the row the same number of columns as the header.',
  [RowErrorCode.MISSING_VALUE]: 'Fill in the value.',
  [RowErrorCode.INVALID_DATE]: 'Use a real date as YYYY-MM-DD.',
  [RowErrorCode.FUTURE_DATE]: 'Use a date on or before the reference date.',
  [RowErrorCode.UNKNOWN_STAGE]: 'Use a stage name or alias from Hiring stages, or add the stage there.',
  [RowErrorCode.DUPLICATE_ID]: 'Make each candidate_id unique.'
};

const COLUMNS = ['Record', 'Candidate ID', 'Field', 'Problem', 'How to fix'];

interface RowErrorsTableProps {
  importId: string;
  referenceDate: string;
}

export function RowErrorsTable({ importId, referenceDate }: RowErrorsTableProps) {
  const [page, setPage] = useState(1);
  const load = useCallback(() => api.getRowErrors(importId, referenceDate, page), [importId, referenceDate, page]);
  const { data, error, errorCode } = useApiData(load);

  if (errorCode === NOT_FOUND) {
    return <ImportGone />;
  }
  if (error) {
    return <PageState message={error} error />;
  }
  if (!data) {
    return <PageState message="Loading row errors…" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="px-1.5 pt-2 text-[13px] text-gray-600">
        Record numbers count the header as 1. Fix these rows in the file and import it again to include them.
      </span>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b">
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap text-gray-600">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="align-top">
            {data.items.flatMap((row) =>
              row.errors.map((fieldError, index) => (
                <tr key={`${row.recordNumber}-${index}`} className="border-b border-gray-100">
                  <td className="px-3 py-2.5 font-bold">{row.recordNumber}</td>
                  <td className="px-3 py-2.5">{row.candidateId}</td>
                  <td className="px-3 py-2.5 font-mono text-[13px]">{fieldError.field}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="error">{fieldError.problem}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-gray-700">{FIXES[fieldError.code]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pager page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
    </div>
  );
}
