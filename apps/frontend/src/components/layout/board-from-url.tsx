'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/use-app-redux';
import { api } from '@/lib/api';
import { BOARD_PARAMS, isImportId } from '@/lib/board-link';
import { clearBoard, selectBoard } from '@/stores/slices/board-slice';

// After a reload the store is empty: the import ID and date in the address load the board again
export function BoardFromUrl() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const board = useAppSelector((state) => state.board.current);
  const importId = searchParams.get(BOARD_PARAMS.IMPORT) ?? '';
  const referenceDate = searchParams.get(BOARD_PARAMS.DATE) ?? '';
  const alreadyOpen = board?.importId === importId && board.referenceDate === referenceDate;

  useEffect(() => {
    if (!isImportId(importId) || !referenceDate || alreadyOpen) {
      return;
    }
    api
      .getImport(importId, referenceDate)
      .then((data) =>
        dispatch(selectBoard({ importId: data.import.id, fileName: data.import.fileName, referenceDate: data.referenceDate }))
      )
      .catch(() => dispatch(clearBoard()));
  }, [importId, referenceDate, alreadyOpen, dispatch]);

  return null;
}
