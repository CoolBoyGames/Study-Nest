import type { ApiErrorResponse } from '@studyspace/shared';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...init, headers });
  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const errObj = parsed as Partial<ApiErrorResponse> | null;
    const message =
      errObj && typeof errObj.error === 'string'
        ? errObj.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return parsed as T;
}
