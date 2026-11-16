'use client';

import { PageState } from '@/components/shared/page-state';
import { StageGuide } from '@/features/stages/stage-guide';
import { StagesForm } from '@/features/stages/stages-form';
import { useApiData } from '@/hooks/use-api-data';
import { api } from '@/lib/api';

export function StagesEditor() {
  const { data, error } = useApiData(api.getStages);

  if (error) {
    return <PageState message={error} error />;
  }
  if (!data) {
    return <PageState message="Loading the hiring stages…" />;
  }

  return (
    <>
      <StagesForm initial={data} />
      <StageGuide />
    </>
  );
}
