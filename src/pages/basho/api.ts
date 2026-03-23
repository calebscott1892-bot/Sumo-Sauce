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

/**
 * Fetch the list of basho IDs that actually exist in the backend, descending.
 * Falls back to sequential probing if the /basho list endpoint is unavailable.
 */
export async function getAvailableBashoIds(limit = 8): Promise<string[]> {
  try {
    const ids = await fetchApi<string[]>('/basho');
    return ids.slice(0, limit);
  } catch {
    // Fallback: probe recent basho IDs sequentially (for older backends)
    const candidateIds = recentBashoIds(Math.max(24, limit));
    const available: string[] = [];
    for (const id of candidateIds) {
      try {
        await getDivisionStandings(id, 'makuuchi');
        available.push(id);
        if (available.length >= limit) break;
      } catch (err) {
        const status = typeof (err as { status?: unknown })?.status === 'number'
          ? Number((err as { status?: number }).status)
          : null;
        if (status === 404) continue;
        break;
      }
    }
    return available;
  }
}
