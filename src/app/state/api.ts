/** Thin client for the Worker API. */
import type { Tables } from '../../shared/schema';

export interface MeResponse {
  configured: boolean;
  user: { email: string; name: string; picture?: string } | null;
  spreadsheetUrl?: string | null;
  feedUrl?: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: { 'content-type': 'application/json', 'x-fc-csrf': '1', ...(init.headers ?? {}) },
  });
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    // e.g. Vite dev server without the Worker running returns index.html
    throw new ApiError(`API unavailable (${res.status})`, res.status === 200 ? 503 : res.status);
  }
  const body = (await res.json()) as T & { error?: string; detail?: string };
  if (!res.ok) throw new ApiError(body.detail || body.error || `HTTP ${res.status}`, res.status);
  return body;
}

export const api = {
  me: () => request<MeResponse>('/auth/me'),
  logout: (revoke = false) => request<{ ok: true }>(`/auth/logout${revoke ? '?revoke=1' : ''}`, { method: 'POST' }),
  load: () => request<{ tables: Partial<Tables>; spreadsheetId: string; spreadsheetUrl: string }>('/api/data'),
  save: (tables: Tables) =>
    request<{ ok: true; spreadsheetUrl: string; savedAt: string }>('/api/data', { method: 'PUT', body: JSON.stringify({ tables }) }),
  createFeed: () => request<{ feedUrl: string }>('/api/feed', { method: 'POST' }),
  deleteFeed: () => request<{ ok: true }>('/api/feed', { method: 'DELETE' }),
};
