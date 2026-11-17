'use client';

import Link from 'next/link';
import { ChevronDown, CircleHelp, FileText, Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useAppSelector } from '@/hooks/use-app-redux';
import { formatDate } from '@/lib/format';

export function TopBar() {
  const board = useAppSelector((state) => state.board.current);

  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2.5 lg:px-9">
      <Link
        href="/imports"
        aria-label="Current board. Change board"
        className="inline-flex h-10 max-w-full items-center gap-2 rounded-[10px] border bg-secondary px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <FileText aria-hidden="true" className="size-4" />
        {board ? (
          <>
            <span className="truncate">{board.fileName}</span>
            <span className="text-muted-foreground">· {formatDate(board.referenceDate)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">No board yet</span>
        )}
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </Link>

      <div className="flex items-center gap-2">
        <Link href="/imports" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <Plus aria-hidden="true" className="size-4" />
          New import
        </Link>
        <Link href="/how-it-works" aria-label="Help and docs" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
          <CircleHelp aria-hidden="true" className="size-5" />
        </Link>
      </div>
    </header>
  );
}
