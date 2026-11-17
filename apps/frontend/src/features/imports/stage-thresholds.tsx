'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StageType, type Stage } from '@/types';

export function StageThresholds() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getStages()
      .then((data) => setStages(data.stages.filter((stage) => stage.type === StageType.WATCHED)))
      .catch(() => setError('Could not load the stages.'));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">Stage thresholds (from your pipeline)</span>
      {error && <span className="text-sm text-red-700">{error}</span>}
      <div className="flex flex-wrap gap-1.5">
        {stages.map((stage) => (
          <span key={stage.name} className="rounded-full border bg-secondary px-2.5 py-1 text-[13px]">
            {stage.name} <strong>{stage.thresholdDays}d</strong>
          </span>
        ))}
      </div>
      <Link href="/stages" className="text-sm text-indigo-700 hover:text-indigo-800">
        Edit stages and thresholds
      </Link>
    </div>
  );
}
