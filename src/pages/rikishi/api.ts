import type {
  Division,
  GetDivisionStandingsResponse,
  GetHeadToHeadResponse,
  GetRikishiDirectoryResponse,
  GetRikishiKimariteResponse,
  GetRikishiRankProgressionResponse,
  GetRikishiResponse,
  GetRikishiTimelineResponse,
} from '../../../shared/api/v1';
import type { LegacyBashoRecord } from '@/utils/recordsMilestones';
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

async function fetchRootApi<T>(path: string): Promise<T> {
  return requestApiJson<T, ApiError>(path, (message, status, code) => new ApiError(message, status, code));
}

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

export function getLegacyBashoRecords(rikishiId: string): Promise<LegacyBashoRecord[]> {
  return fetchRootApi<LegacyBashoRecord[]>(
    `/entities/BashoRecord?rid=${encodeURIComponent(rikishiId)}&sort=-snapshot_date`
  );
}
