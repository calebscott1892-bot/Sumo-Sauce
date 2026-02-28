import type { ApiErrorResponse, GetRikishiComparisonResponse } from '../../../shared/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'HTTP_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isObject(value) || !isObject(value.error)) return false;
  return typeof value.error.code === 'string' && typeof value.error.message === 'string';
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`/api/v1${path}`);
  const body: unknown = await res.json().catch(() => null);

  if (isApiErrorResponse(body)) {
    throw new ApiError(body.error.message, res.status || 500, body.error.code);
  }

  if (!res.ok) {
    throw new ApiError(`${res.status} ${res.statusText}`, res.status);
  }

  return body as T;
}

export function getRikishiComparison(a: string, b: string): Promise<GetRikishiComparisonResponse> {
  return fetchApi<GetRikishiComparisonResponse>(`/compare/${encodeURIComponent(a)}/${encodeURIComponent(b)}`);
}
