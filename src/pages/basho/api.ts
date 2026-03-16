import type { Division, GetDivisionStandingsResponse, GetBoutsByDivisionResponse } from '../../../shared/api/v1';
import { requestApiJson } from '@/utils/apiRequest';
import { recentBashoIds } from '@/utils/basho';

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

// Probe recent basho IDs against a real domain endpoint so UI "latest" links
// only point to tournament data that actually exists in the deployed backend.
export async function getAvailableBashoIds(limit = 8, scanDepth = 24): Promise<string[]> {
  const candidateIds = recentBashoIds(Math.max(scanDepth, limit));
  const available: string[] = [];

  for (const id of candidateIds) {
    try {
      await getDivisionStandings(id, 'makuuchi');
      available.push(id);
      if (available.length >= limit) break;
    } catch (error) {
      const status = typeof (error as { status?: unknown })?.status === 'number'
        ? Number((error as { status?: number }).status)
        : null;
      const code = String((error as { code?: unknown })?.code || '').toUpperCase();

      if (status === 404 || code === 'NOT_FOUND' || code === 'BASHO_NOT_FOUND') {
        continue;
      }

      // For API-unavailable / network failures, stop probing and return what is known.
      break;
    }
  }

  return available;
}
