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

/**
 * Map a V1 API path to its static-data fallback URL.
 * Returns null if no mapping exists.
 *
 * Actual API paths (from page api.ts; fetchApi prepends /v1):
 *   /v1/basho                          -> /data/basho-index.json
 *   /v1/rikishi                        -> /data/rikishi-directory.json
 *   /v1/basho/:bashoId/:division       -> /data/standings/:bashoId/:Division.json
 *   /v1/bouts/:bashoId/:division       -> /data/bouts/:bashoId/:Division.json
 */
function staticFallbackUrl(path: string): string | null {
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');

  // /v1/basho -> basho-index.json
  if (clean === 'v1/basho') return '/data/basho-index.json';

  // /v1/rikishi -> rikishi-directory.json
  if (clean === 'v1/rikishi') return '/data/rikishi-directory.json';

  // /v1/basho/:bashoId/:division -> standings/:bashoId/:Division.json
  const standingsMatch = clean.match(/^v1\/basho\/(\d+)\/([^/]+)$/);
  if (standingsMatch) {
    const [, bashoId, division] = standingsMatch;
    const div = division.charAt(0).toUpperCase() + division.slice(1).toLowerCase();
    return `/data/standings/${bashoId}/${div}.json`;
  }

  // /v1/bouts/:bashoId/:division -> bouts/:bashoId/:Division.json
  const boutsMatch = clean.match(/^v1\/bouts\/(\d+)\/([^/]+)$/);
  if (boutsMatch) {
    const [, bashoId, division] = boutsMatch;
    const div = division.charAt(0).toUpperCase() + division.slice(1).toLowerCase();
    return `/data/bouts/${bashoId}/${div}.json`;
  }

  return null;
}

async function tryStaticFallback<T>(path: string): Promise<T | null> {
  const url = staticFallbackUrl(path);
  if (!url) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function requestApiJson<T, E extends Error>(
  path: string,
  createError: ApiErrorFactory<E>,
): Promise<T> {
  const url = resolveApiUrl(path);

  // If no API is configured at all, try static fallback directly
  if (!url) {
    const fallback = await tryStaticFallback<T>(path);
    if (fallback !== null) return fallback;
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
      // Before re-throwing an API_UNAVAILABLE, attempt static fallback
      const apiErr = error as E;
      if ('code' in apiErr && (apiErr as Record<string, unknown>).code === 'API_UNAVAILABLE') {
        const fallback = await tryStaticFallback<T>(path);
        if (fallback !== null) return fallback;
      }
      throw apiErr;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      const fallback = await tryStaticFallback<T>(path);
      if (fallback !== null) return fallback;
      throw createError('Live data services did not respond in time.', 503, 'API_UNAVAILABLE');
    }

    // Network error --- try static fallback before giving up
    const fallback = await tryStaticFallback<T>(path);
    if (fallback !== null) return fallback;

    throw createError(getApiUnavailableMessage(), 503, 'API_UNAVAILABLE');
  }
}
