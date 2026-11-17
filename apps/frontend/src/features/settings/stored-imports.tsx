'use client';

import { useState } from 'react';
import { FileSpreadsheet, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppDispatch, useAppSelector } from '@/hooks/use-app-redux';
import { api, errorMessage } from '@/lib/api';
import { formatDate, localIsoDate } from '@/lib/format';
import { clearBoard } from '@/stores/slices/board-slice';
import type { ImportSummary } from '@/types';

export function StoredImports({ initial }: { initial: ImportSummary[] }) {
  const dispatch = useAppDispatch();
  const openId = useAppSelector((state) => state.board.current?.importId);
  const [imports, setImports] = useState(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, setPending] = useState<ImportSummary | null>(null);

  const remove = async (item: ImportSummary) => {
    setDeletingId(item.id);
    try {
      await api.deleteImport(item.id);
      setImports(imports.filter((other) => other.id !== item.id));
      if (item.id === openId) {
        dispatch(clearBoard());
      }
      toast.success(`${item.fileName} was deleted.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="flex flex-col gap-3 p-[22px]">
      <h2 className="text-[17px] font-semibold">Stored imports</h2>
      <p className="text-sm text-gray-600">
        Only the 8 CSV columns StallAlert uses are stored. Deleting an import removes its rows and saved AI results.
      </p>
      {imports.length === 0 ? (
        <EmptyState icon={FileSpreadsheet} title="No imports are stored" />
      ) : (
        <ul className="flex flex-col divide-y rounded-[10px] border">
          {imports.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3">
              <span className="text-sm">
                <strong>{item.fileName}</strong> · {item.recordCount.toLocaleString('en-US')} records · imported{' '}
                {formatDate(localIsoDate(item.createdAt))}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50"
                disabled={deletingId !== null}
                onClick={() => setPending(item)}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                {deletingId === item.id ? 'Deleting…' : 'Delete import'}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {pending?.fileName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Its rows and saved AI results are removed. This cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pending && remove(pending)}>Delete import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
