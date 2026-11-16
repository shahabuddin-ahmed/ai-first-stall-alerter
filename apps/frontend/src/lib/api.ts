import type { ApiEnvelope, HealthReport } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    },
    cache: 'no-store'
  });

  const payload: ApiEnvelope<T> | null = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    throw new Error(payload?.message || payload?.errors?.[0] || 'Request failed');
  }

  return payload.response;
}

export const api = {
  health: () => request<HealthReport>('/health')
};
