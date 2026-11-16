import type { Route } from 'next';
import type { Board } from '@/types';

export const BOARD_PARAMS = {
  IMPORT: 'import',
  DATE: 'date'
} as const;

export type BoardPage = '/follow-ups' | '/export';

const BOARD_PAGES: readonly string[] = ['/follow-ups', '/export'];

export function isBoardPage(href: string): href is BoardPage {
  return BOARD_PAGES.includes(href);
}

// The open board goes in the address, so a reload or a shared link opens the same board
export function boardHref(page: BoardPage, board: Board | null): Route {
  if (!board) {
    return page;
  }
  const query = new URLSearchParams({
    [BOARD_PARAMS.IMPORT]: String(board.importId),
    [BOARD_PARAMS.DATE]: board.referenceDate
  });
  return `${page}?${query}`;
}
