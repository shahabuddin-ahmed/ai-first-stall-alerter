import type {
  AiModel,
  ApiEnvelope,
  CsvFile,
  HealthReport,
  ImportList,
  InsightsView,
  Page,
  PipelineView,
  QueueQuery,
  RowError,
  Settings,
  StageInput,
  StageList,
  UploadResult
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const FILE_NAME = /filename="([^"]+)"/;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly errors: string[]
  ) {
    super(message);
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Could not reach the StallAlert API.';
}

function apiErrorOf(payload: ApiEnvelope<unknown> | null): ApiError {
  const message = payload?.message || payload?.errors?.[0] || 'Request failed';
  return new ApiError(message, payload?.code ?? 'REQUEST_FAILED', payload?.errors ?? []);
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
    throw apiErrorOf(payload);
  }

  return payload.response;
}

export const api = {
  health: () => request<HealthReport>('/health'),

  getStages: () => request<StageList>('/stages'),
  saveStages: (version: number, stages: StageInput[]) =>
    request<StageList>('/stages', { method: 'PUT', body: JSON.stringify({ version, stages }) }),

  getSettings: () => request<Settings>('/settings'),
  saveSettings: (settings: Pick<Settings, 'status' | 'aiModel'>) =>
    request<Settings>('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  getModels: () => request<AiModel[]>('/settings/models'),

  getImports: () => request<ImportList>('/imports'),
  deleteImport: (id: number) => request<{ deleted: boolean }>(`/imports/${id}`, { method: 'DELETE' }),
  getImport: (id: number, referenceDate: string) =>
    request<PipelineView>(`/imports/${id}?${new URLSearchParams({ referenceDate, pageSize: '1' })}`),
  getQueue: (id: number, query: QueueQuery) => {
    const params = new URLSearchParams({ referenceDate: query.referenceDate, page: String(query.page) });
    // Empty filters are left out: the backend rejects an empty stage or recruiter
    for (const [key, value] of Object.entries({ stage: query.stage, recruiter: query.recruiter, search: query.search })) {
      if (value) {
        params.set(key, value);
      }
    }
    return request<PipelineView>(`/imports/${id}?${params}`);
  },
  getRowErrors: (id: number, referenceDate: string, page: number) =>
    request<Page<RowError>>(`/imports/${id}/errors?${new URLSearchParams({ referenceDate, page: String(page) })}`),
  getInsights: (id: number, referenceDate: string, retry: boolean) =>
    request<InsightsView>(`/imports/${id}/insights`, { method: 'POST', body: JSON.stringify({ referenceDate, retry }) }),
  // The CSV is not a JSON envelope: keep the raw bytes (with the BOM Excel needs) and the text for the preview
  getExport: async (id: number, referenceDate: string): Promise<CsvFile> => {
    const response = await fetch(`${API_URL}/imports/${id}/export?${new URLSearchParams({ referenceDate })}`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      throw apiErrorOf(await response.json().catch(() => null));
    }
    const bytes = await response.arrayBuffer();
    const fileName = response.headers.get('Content-Disposition')?.match(FILE_NAME)?.[1] ?? 'stallalert-export.csv';
    return { fileName, bytes, text: new TextDecoder().decode(bytes) };
  },
  uploadImport: (file: File, referenceDate: string) => {
    const body = new FormData();
    body.append('file', file);
    body.append('referenceDate', referenceDate);
    return request<UploadResult>('/imports', { method: 'POST', body });
  }
};
