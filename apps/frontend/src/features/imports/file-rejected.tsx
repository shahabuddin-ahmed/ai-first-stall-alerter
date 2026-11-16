import { CircleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FILE_ERRORS } from '@/features/imports/file-errors';
import type { Rejection } from '@/features/imports/import-form';

interface FileRejectedProps {
  rejection: Rejection;
  onRetry: () => void;
}

export function FileRejected({ rejection, onRetry }: FileRejectedProps) {
  const { fileName, error } = rejection;
  const extraDetails = error.errors.filter((detail) => !error.message.includes(detail));

  return (
    <section role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <CircleAlert aria-hidden="true" className="size-[22px] text-red-700" />
        <h2 className="text-lg font-bold text-red-900">The file was not imported</h2>
        <Badge variant="error">{error.code}</Badge>
      </div>

      <p className="text-[15px] leading-normal text-red-900">
        <strong>{fileName}</strong>: {error.message}
      </p>
      {extraDetails.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {extraDetails.map((detail) => (
            <li key={detail} className="rounded-md bg-white px-2 py-0.5 font-mono text-[13px] text-red-900">
              {detail}
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm leading-normal text-gray-700">
        How to fix: {FILE_ERRORS[error.code].fix} Nothing from this file was stored, and the previous board was closed so
        nothing out of date stays on screen.
      </p>

      <Button type="button" className="self-start" onClick={onRetry}>
        Choose another file
      </Button>
    </section>
  );
}
