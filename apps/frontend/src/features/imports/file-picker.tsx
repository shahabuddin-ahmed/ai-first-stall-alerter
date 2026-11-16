'use client';

import { useState, type ChangeEvent, type DragEvent } from 'react';
import { FileText, Upload } from 'lucide-react';
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
          'flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-5 py-8 text-center has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
          dragging && 'border-primary bg-accent'
        )}
      >
        <Upload aria-hidden="true" className="size-8 text-primary" />
        <span className="text-[15px] font-semibold">Drop a CSV here, or choose a file</span>
        <span className="text-[13px] text-gray-600">.csv · UTF-8 · up to 5 MB and 10,000 rows</span>
        <input id="csv-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={handleChange} />
      </label>

      {file && (
        <div className="flex items-center gap-2.5 rounded-[10px] border px-3.5 py-3">
          <FileText aria-hidden="true" className="size-5 text-gray-600" />
          <span className="text-sm font-semibold">{file.name}</span>
          <span className="text-[13px] text-gray-600">{formatFileSize(file.size)} · selected</span>
        </div>
      )}

      <p className="text-[13px] text-gray-600">
        Uploaded this exact file before? You go straight to that import; no duplicate is created, even if two people
        upload it at the same time.
      </p>
    </Card>
  );
}
