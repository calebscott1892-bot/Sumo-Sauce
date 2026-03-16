import type { GetRikishiComparisonResponse } from '../../../shared/api/v1';
import { requestApiJson } from '@/utils/apiRequest';

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

async function fetchApi<T>(path: string): Promise<T> {
  return requestApiJson<T, ApiError>(`/v1${path}`, (message, status, code) => new ApiError(message, status, code));
}

export function getRikishiComparison(a: string, b: string): Promise<GetRikishiComparisonResponse> {
  return fetchApi<GetRikishiComparisonResponse>(`/compare/${encodeURIComponent(a)}/${encodeURIComponent(b)}`);
}
