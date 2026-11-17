'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FileX } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppDispatch } from '@/hooks/use-app-redux';
import { clearBoard } from '@/stores/slices/board-slice';

// Shown when the open board's import was deleted; closes the board so other pages stop pointing at it
export function ImportGone() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(clearBoard());
  }, [dispatch]);

  return (
    <Card role="alert">
      <EmptyState
        icon={FileX}
        title="This import no longer exists"
        text="It may have been deleted. Open another import, or upload the file again."
      >
        <Link href="/imports" className={buttonVariants({ size: 'sm' })}>
          Go to Imports
        </Link>
      </EmptyState>
    </Card>
  );
}
