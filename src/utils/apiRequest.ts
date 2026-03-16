import type { ApiErrorResponse } from '../../shared/api/v1';
import { getApiUnavailableMessage, resolveApiUrl } from '@/utils/apiBase';

type ApiErrorFactory<E extends Error> = (message: string, status: number, code?: string) => E;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isObject(value) || !isObject(value.error)) return false;
  return typeof value.error.code === 'string' && typeof value.error.message === 'string';
}

function isApiErrorInstance(error: unknown): boolean {
  return error instanceof Error && error.name === 'ApiError';
}

export async function requestApiJson<T, E extends Error>(
  path: string,
  createError: ApiErrorFactory<E>,
): Promise<T> {
  const url = resolveApiUrl(path);
  if (!url) {
    throw createError(getApiUnavailableMessage(), 503, 'API_UNAVAILABLE');
  }

  try {
    const res = await fetch(url);
    const body: unknown = await res.json().catch(() => null);

    if (isApiErrorResponse(body)) {
      throw createError(body.error.message, res.status || 500, body.error.code);
    }

    if (!res.ok) {
      if (res.status === 404 || res.status >= 500) {
        throw createError(getApiUnavailableMessage(), 503, 'API_UNAVAILABLE');
      }
      throw createError(`${res.status} ${res.statusText}`, res.status || 500, 'HTTP_ERROR');
    }

    return body as T;
  } catch (error) {
    if (isApiErrorInstance(error)) {
      throw error as E;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw createError('Live data services did not respond in time.', 503, 'API_UNAVAILABLE');
    }

    throw createError(getApiUnavailableMessage(), 503, 'API_UNAVAILABLE');
  }
}
