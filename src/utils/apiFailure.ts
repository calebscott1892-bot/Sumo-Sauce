const RESOURCE_NOT_FOUND_CODES = new Set(['NOT_FOUND', 'RIKISHI_NOT_FOUND', 'BASHO_NOT_FOUND']);

type ApiFailureLike = {
  code?: unknown;
  status?: unknown;
  message?: unknown;
};

function asApiFailure(error: unknown): ApiFailureLike | null {
  if (!error || typeof error !== 'object') return null;
  return error as ApiFailureLike;
}

export function getApiFailureCode(error: unknown): string | null {
  const failure = asApiFailure(error);
  return typeof failure?.code === 'string' ? failure.code : null;
}

export function getApiFailureStatus(error: unknown): number | null {
  const failure = asApiFailure(error);
  return typeof failure?.status === 'number' ? failure.status : null;
}

export function getApiFailureMessage(error: unknown, fallback: string): string {
  const failure = asApiFailure(error);
  return typeof failure?.message === 'string' && failure.message.trim() ? failure.message : fallback;
}

export function isApiUnavailableError(error: unknown): boolean {
  return getApiFailureCode(error) === 'API_UNAVAILABLE';
}

export function isResourceNotFoundError(error: unknown): boolean {
  const code = getApiFailureCode(error);
  return Boolean(code && RESOURCE_NOT_FOUND_CODES.has(code));
}
