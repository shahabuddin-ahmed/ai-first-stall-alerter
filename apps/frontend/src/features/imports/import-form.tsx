'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FilePicker } from '@/features/imports/file-picker';
import { isFileError } from '@/features/imports/file-errors';
import { StageThresholds } from '@/features/imports/stage-thresholds';
import { useAppDispatch } from '@/hooks/use-app-redux';
import { api, ApiError } from '@/lib/api';
import { boardHref } from '@/lib/board-link';
import { todayIso } from '@/lib/format';
import { clearBoard, selectBoard } from '@/stores/slices/board-slice';

export interface Rejection {
  fileName: string;
  error: ApiError;
}

interface ImportFormProps {
  onRejected: (rejection: Rejection) => void;
}

export function ImportForm({ onRejected }: ImportFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const today = todayIso();
  const [file, setFile] = useState<File | null>(null);
  const [referenceDate, setReferenceDate] = useState(today);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const data = await api.uploadImport(file, referenceDate);
      const board = { importId: data.import.id, fileName: data.import.fileName, referenceDate: data.referenceDate };
      dispatch(selectBoard(board));
      if (data.alreadyImported) {
        toast.info('This file was imported before, so its existing import was opened.');
      }
      router.push(boardHref('/follow-ups', board));
    } catch (error) {
      setUploading(false);
      if (isFileError(error)) {
        // Nothing out of date stays on screen after a rejected file
        dispatch(clearBoard());
        onRejected({ fileName: file.name, error });
        return;
      }
      toast.error(error instanceof ApiError ? error.message : 'Could not reach the StallAlert API.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
      <FilePicker file={file} onChange={setFile} />

      <Card className="flex flex-col gap-[18px] p-[22px]">
        <h2 className="text-[17px] font-semibold">2. Settings</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-start gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="reference-date" className="text-sm font-semibold">
              Reference date
            </label>
            <Input
              id="reference-date"
              type="date"
              required
              max={today}
              value={referenceDate}
              onChange={(event) => setReferenceDate(event.target.value)}
            />
            <span className="text-[13px] text-gray-600">
              Defaults to today. Earlier dates are allowed, future dates are not.
            </span>
          </div>
          <StageThresholds />
        </div>

        <div role="note" className="flex gap-2.5 rounded-[10px] border bg-secondary px-3.5 py-3">
          <Info aria-hidden="true" className="mt-0.5 size-[18px] flex-none text-gray-600" />
          <span className="text-sm leading-normal text-gray-700">
            The file is processed and stored by the StallAlert server (only the columns below). Use fictional data in
            this demo. You can delete an import at any time. Candidate names are never sent to the AI model.
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={!file || !referenceDate || uploading}>
            {uploading ? 'Analyzing…' : 'Analyze'}
          </Button>
          <a href="/sample-board.csv" download className={buttonVariants({ variant: 'outline' })}>
            Download sample CSV
          </a>
        </div>
      </Card>
    </form>
  );
}
