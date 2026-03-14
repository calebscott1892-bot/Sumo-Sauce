import type {
  ApiErrorResponse,
  Division,
  GetDivisionStandingsResponse,
  GetHeadToHeadResponse,
  GetRikishiDirectoryResponse,
  GetRikishiKimariteResponse,
  GetRikishiRankProgressionResponse,
  GetRikishiResponse,
  GetRikishiTimelineResponse,
} from '../../../shared/api/v1';
<<<<<<< HEAD
import type { LegacyBashoRecord } from '@/utils/recordsMilestones';
=======
>>>>>>> origin/main

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

<<<<<<< HEAD
async function fetchRootApi<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const body: unknown = await res.json().catch(() => null);

  if (isApiErrorResponse(body)) {
    throw new ApiError(body.error.message, res.status || 500, body.error.code);
  }

  if (!res.ok) {
    throw new ApiError(`${res.status} ${res.statusText}`, res.status);
  }

  return body as T;
}

=======
>>>>>>> origin/main
export function getCareerSummary(id: string): Promise<GetRikishiResponse> {
  return fetchApi<GetRikishiResponse>(`/rikishi/${encodeURIComponent(id)}`);
}

export function getRikishiDirectory(): Promise<GetRikishiDirectoryResponse> {
  return fetchApi<GetRikishiDirectoryResponse>('/rikishi');
}

export function getCareerTimeline(id: string): Promise<GetRikishiTimelineResponse> {
  return fetchApi<GetRikishiTimelineResponse>(`/rikishi/${encodeURIComponent(id)}/timeline`);
}

export function getRankProgression(id: string): Promise<GetRikishiRankProgressionResponse> {
  return fetchApi<GetRikishiRankProgressionResponse>(`/rikishi/${encodeURIComponent(id)}/rank-progression`);
}

export function getKimariteStats(id: string): Promise<GetRikishiKimariteResponse> {
  return fetchApi<GetRikishiKimariteResponse>(`/rikishi/${encodeURIComponent(id)}/kimarite`);
}

export function getHeadToHead(a: string, b: string): Promise<GetHeadToHeadResponse> {
  return fetchApi<GetHeadToHeadResponse>(`/head-to-head/${encodeURIComponent(a)}/${encodeURIComponent(b)}`);
}

export function getDivisionStandings(bashoId: string, division: Division): Promise<GetDivisionStandingsResponse> {
  return fetchApi<GetDivisionStandingsResponse>(`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(division)}`);
}
<<<<<<< HEAD

export function getLegacyBashoRecords(rikishiId: string): Promise<LegacyBashoRecord[]> {
  return fetchRootApi<LegacyBashoRecord[]>(`/api/entities/BashoRecord?rid=${encodeURIComponent(rikishiId)}&sort=-snapshot_date`);
}
=======
>>>>>>> origin/main
