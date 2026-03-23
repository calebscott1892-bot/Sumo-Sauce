import type { Division, GetDivisionStandingsResponse, GetBoutsByDivisionResponse } from '../../../shared/api/v1';
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

export function getDivisionStandings(bashoId: string, division: Division): Promise<GetDivisionStandingsResponse> {
  return fetchApi<GetDivisionStandingsResponse>(`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(division)}`);
}

export function getBoutsByDivision(bashoId: string, division: Division): Promise<GetBoutsByDivisionResponse> {
  return fetchApi<GetBoutsByDivisionResponse>(`/bouts/${encodeURIComponent(bashoId)}/${encodeURIComponent(division)}`);
}

/** Fetch the list of basho IDs that actually exist in the backend, descending. */
export async function getAvailableBashoIds(limit = 8): Promise<string[]> {
  const ids = await fetchApi<string[]>('/basho');
  return ids.slice(0, limit);
}
