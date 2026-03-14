import { CAREER_DIVISION_ORDER, sortCareerRowsChronologically } from '@/utils/careerProgression';
import type { Division, RankProgressionItem, TimelineItem } from '@/pages/rikishi/types';

export type LegacyBashoRecord = {
  rid: string;
  shikona?: string;
  division?: string;
  division_code?: number;
  rank?: string;
  side?: string;
  rank_number?: number;
  wins?: number;
  losses?: number;
  win_pct?: number;
  career_wins?: number;
  career_losses?: number;
  career_win_pct?: number;
  yusho_top_div?: number;
  special_prizes?: number;
  basho?: string;
  basho_start_date?: string;
  snapshot_date?: string;
  source_tier?: string;
  record_id?: string;
};

export type LegacyAchievementSnapshot = {
  hasImportedContext: boolean;
  rowCount: number;
  topDivisionYushoCount: number | null;
  specialPrizeCount: number | null;
  latestSnapshotDate: string | null;
  latestBashoLabel: string | null;
  latestBashoId: string | null;
  sourceTier: string | null;
};

export type DivisionChampionshipSummary = {
  division: Division;
  count: number;
  latestBashoId: string;
  latestRank: string;
};

const IMPORTED_BASHO_MONTHS: Record<string, string> = {
  hatsu: '01',
  haru: '03',
  natsu: '05',
  nagoya: '07',
  aki: '09',
  kyushu: '11',
};

function toFiniteNumber(value: unknown): number | null {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function compareDivisionStrength(a: Division, b: Division): number {
  return CAREER_DIVISION_ORDER.indexOf(a) - CAREER_DIVISION_ORDER.indexOf(b);
}

function normalizeComparableDate(value: string | null | undefined): string {
  const text = String(value || '').trim();
  return text;
}

export function importedBashoToId(label: string | null | undefined, startDate?: string | null | undefined): string | null {
  const normalizedStart = String(startDate || '').trim();
  const dateMatch = normalizedStart.match(/^(\d{4})-(\d{2})-/);
  if (dateMatch) {
    return `${dateMatch[1]}${dateMatch[2]}`;
  }

  const text = String(label || '').trim();
  const direct = text.match(/\b(20\d{2})(0[1-9]|1[0-2])\b/);
  if (direct) {
    return `${direct[1]}${direct[2]}`;
  }

  const named = text.match(/\b(Hatsu|Haru|Natsu|Nagoya|Aki|Kyushu)\s+(20\d{2})\b/i);
  if (!named) return null;

  const month = IMPORTED_BASHO_MONTHS[named[1].toLowerCase()];
  return month ? `${named[2]}${month}` : null;
}

export function summarizeLegacyAchievements(rows: LegacyBashoRecord[]): LegacyAchievementSnapshot | null {
  if (!rows.length) return null;

  let topDivisionYushoCount: number | null = null;
  let specialPrizeCount: number | null = null;
  let latestSnapshotDate: string | null = null;
  let latestBashoLabel: string | null = null;
  let latestBashoId: string | null = null;
  let latestBashoSortKey = '';
  let sourceTier: string | null = null;

  for (const row of rows) {
    const yusho = toFiniteNumber(row.yusho_top_div);
    const specialPrizes = toFiniteNumber(row.special_prizes);
    const snapshotDate = normalizeComparableDate(row.snapshot_date);
    const bashoLabel = String(row.basho || '').trim();
    const bashoId = importedBashoToId(bashoLabel, row.basho_start_date);

    if (yusho !== null && (topDivisionYushoCount === null || yusho > topDivisionYushoCount)) {
      topDivisionYushoCount = yusho;
    }

    if (specialPrizes !== null && (specialPrizeCount === null || specialPrizes > specialPrizeCount)) {
      specialPrizeCount = specialPrizes;
    }

    if (snapshotDate && (!latestSnapshotDate || snapshotDate > latestSnapshotDate)) {
      latestSnapshotDate = snapshotDate;
    }

    if (bashoId && bashoId > latestBashoSortKey) {
      latestBashoSortKey = bashoId;
      latestBashoId = bashoId;
      latestBashoLabel = bashoLabel || bashoId;
    }

    if (!sourceTier) {
      const nextTier = String(row.source_tier || '').trim();
      if (nextTier) sourceTier = nextTier;
    }
  }

  return {
    hasImportedContext: true,
    rowCount: rows.length,
    topDivisionYushoCount,
    specialPrizeCount,
    latestSnapshotDate,
    latestBashoLabel,
    latestBashoId,
    sourceTier,
  };
}

export function getDivisionChampionshipSummaries(rows: RankProgressionItem[]): DivisionChampionshipSummary[] {
  const byDivision = new Map<Division, DivisionChampionshipSummary>();
  const sorted = sortCareerRowsChronologically(rows).filter((row) => row.yusho);

  for (const row of sorted) {
    const existing = byDivision.get(row.division);
    if (existing) {
      existing.count += 1;
      existing.latestBashoId = row.bashoId;
      existing.latestRank = row.rank;
      continue;
    }

    byDivision.set(row.division, {
      division: row.division,
      count: 1,
      latestBashoId: row.bashoId,
      latestRank: row.rank,
    });
  }

  return [...byDivision.values()].sort((a, b) => {
    const countDelta = b.count - a.count;
    if (countDelta !== 0) return countDelta;

    const divisionDelta = compareDivisionStrength(a.division, b.division);
    if (divisionDelta !== 0) return divisionDelta;

    return b.latestBashoId.localeCompare(a.latestBashoId);
  });
}

export function findFirstSekitoriEntry(rows: TimelineItem[]): TimelineItem | null {
  return sortCareerRowsChronologically(rows).find((row) => row.division === 'makuuchi' || row.division === 'juryo') ?? null;
}

export function findBestNonYushoEntry(rows: RankProgressionItem[]): RankProgressionItem | null {
  const candidates = rows.filter((row) => !row.yusho);
  if (!candidates.length) return null;

  return [...candidates].sort((a, b) => {
    const winsDelta = b.wins - a.wins;
    if (winsDelta !== 0) return winsDelta;

    const lossesDelta = a.losses - b.losses;
    if (lossesDelta !== 0) return lossesDelta;

    const divisionDelta = compareDivisionStrength(a.division, b.division);
    if (divisionDelta !== 0) return divisionDelta;

    return b.bashoId.localeCompare(a.bashoId);
  })[0] ?? null;
}
