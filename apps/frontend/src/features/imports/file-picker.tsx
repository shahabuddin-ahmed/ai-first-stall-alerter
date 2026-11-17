'use client';

import { useState, type ChangeEvent, type DragEvent } from 'react';
import { FileCheck2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';

interface FilePickerProps {
  file: File | null;
  onChange: (file: File | null) => void;
}

export function FilePicker({ file, onChange }: FilePickerProps) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    onChange(event.dataTransfer.files[0] ?? null);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.files?.[0] ?? null);
    // Lets the same file be chosen again after a reset
    event.target.value = '';
  };

  return (
    <Card className="flex flex-col gap-4 p-[22px]">
      <h2 className="text-[17px] font-semibold">1. Choose a CSV file</h2>

      <label
        htmlFor="csv-file"
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'group flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-5 py-9 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/70 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
          dragging && 'border-primary bg-accent'
        )}
      >
        <span
          className={cn(
            'flex size-12 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-indigo-100 transition-transform group-hover:-translate-y-0.5',
            dragging && '-translate-y-0.5'
          )}
        >
          <Upload aria-hidden="true" className="size-6 text-primary" />
        </span>
        <span className="text-[15px] font-semibold">
          Drop a CSV here, or <span className="text-primary underline underline-offset-4">choose a file</span>
        </span>
        <span className="text-[13px] text-gray-600">.csv · UTF-8 · up to 5 MB and 10,000 rows</span>
        <input id="csv-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={handleChange} />
      </label>

      {file && (
        <div className="pop-in flex items-center gap-3 rounded-[10px] border border-green-200 bg-green-50/50 px-3.5 py-3">
          <FileCheck2 aria-hidden="true" className="size-5 shrink-0 text-green-700" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{file.name}</span>
            <span className="text-[13px] text-gray-600">{formatFileSize(file.size)} · ready to analyze</span>
          </span>
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${file.name}`} onClick={() => onChange(null)}>
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      )}

      <p className="text-[13px] text-gray-600">
        Uploaded this exact file before? You go straight to that import; no duplicate is created, even if two people
        upload it at the same time.
      </p>
    </Card>
  );
}
