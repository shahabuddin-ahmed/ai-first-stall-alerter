import type { ApiEnvelope, HealthReport, ImportList, PipelineView, StageList, UploadResult } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly errors: string[]
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // A FormData body sets its own multipart Content-Type
  const headers = new Headers(init?.headers);
  if (typeof init?.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  const payload: ApiEnvelope<T> | null = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    const message = payload?.message || payload?.errors?.[0] || 'Request failed';
    throw new ApiError(message, payload?.code ?? 'REQUEST_FAILED', payload?.errors ?? []);
  }

  return payload.response;
}

export const api = {
  health: () => request<HealthReport>('/health'),

  getStages: () => request<StageList>('/stages'),

  getImports: () => request<ImportList>('/imports'),
  getImport: (id: number, referenceDate: string) =>
    request<PipelineView>(`/imports/${id}?${new URLSearchParams({ referenceDate, pageSize: '1' })}`),
  uploadImport: (file: File, referenceDate: string) => {
    const body = new FormData();
    body.append('file', file);
    body.append('referenceDate', referenceDate);
    return request<UploadResult>('/imports', { method: 'POST', body });
  }
};
