import { bashoLabel, divisionLabel } from '@/utils/basho';
import type { Division, RankProgressionItem, TimelineItem } from '../../shared/api/v1';

export const CAREER_DIVISION_ORDER: Division[] = [
  'makuuchi',
  'juryo',
  'makushita',
  'sandanme',
  'jonidan',
  'jonokuchi',
];

export type CareerMovementState = 'debut' | 'promotion' | 'demotion' | 'hold';

export type CareerMovement = {
  state: CareerMovementState;
  label: string;
  detail: string;
  variant: 'green' | 'red' | 'blue' | 'zinc';
};

export type BashoStreak = {
  type: 'win' | 'loss';
  length: number;
  startBasho: string;
  endBasho: string;
};

function divisionIndex(division: string | null | undefined): number {
  if (!division) return Number.MAX_SAFE_INTEGER;
  const index = CAREER_DIVISION_ORDER.indexOf(division as Division);
  return index === -1 ? Number.MAX_SAFE_INTEGER - 1 : index;
}

export function compareCareerRows<T extends TimelineItem | RankProgressionItem>(a: T, b: T): number {
  return (
    a.bashoId.localeCompare(b.bashoId) ||
    divisionIndex(a.division) - divisionIndex(b.division) ||
    a.rank.localeCompare(b.rank)
  );
}

export function sortCareerRowsChronologically<T extends TimelineItem | RankProgressionItem>(rows: T[]): T[] {
  return [...rows].sort(compareCareerRows);
}

export function rankNumberFromRank(rank: string): number {
  const match = String(rank || '').match(/\d+/);
  return match ? Number(match[0]) : 999;
}

export function rankSortValue(division: string, rank: string): number {
  return divisionIndex(division) * 100 + rankNumberFromRank(rank);
}

export function describeCareerMovement(
  previous: Pick<TimelineItem, 'bashoId' | 'division' | 'rank'> | null | undefined,
  current: Pick<TimelineItem, 'bashoId' | 'division' | 'rank'>,
): CareerMovement {
  if (!previous) {
    return {
      state: 'debut',
      label: 'Career debut',
      detail: `First published basho: ${divisionLabel(current.division)} ${current.rank} in ${bashoLabel(current.bashoId)}.`,
      variant: 'blue',
    };
  }

  const previousValue = rankSortValue(previous.division, previous.rank);
  const currentValue = rankSortValue(current.division, current.rank);

  if (currentValue < previousValue) {
    return {
      state: 'promotion',
      label: previous.division !== current.division ? 'Promoted division' : 'Moved up the banzuke',
      detail: previous.division !== current.division
        ? `Promoted from ${divisionLabel(previous.division)} to ${divisionLabel(current.division)} in ${bashoLabel(current.bashoId)}.`
        : `Moved from ${previous.rank} to ${current.rank} in ${bashoLabel(current.bashoId)}.`,
      variant: 'green',
    };
  }

  if (currentValue > previousValue) {
    return {
      state: 'demotion',
      label: previous.division !== current.division ? 'Dropped division' : 'Moved down the banzuke',
      detail: previous.division !== current.division
        ? `Dropped from ${divisionLabel(previous.division)} to ${divisionLabel(current.division)} in ${bashoLabel(current.bashoId)}.`
        : `Slipped from ${previous.rank} to ${current.rank} in ${bashoLabel(current.bashoId)}.`,
      variant: 'red',
    };
  }

  return {
    state: 'hold',
    label: 'Held position',
    detail: `Returned at ${current.rank} in ${divisionLabel(current.division)} for ${bashoLabel(current.bashoId)}.`,
    variant: 'zinc',
  };
}

export function findFirstDivisionEntry<T extends TimelineItem | RankProgressionItem>(
  rows: T[],
  division: Division,
): T | null {
  return sortCareerRowsChronologically(rows).find((row) => row.division === division) ?? null;
}

export function findLatestYusho(rows: RankProgressionItem[]): RankProgressionItem | null {
  const sorted = sortCareerRowsChronologically(rows);
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    if (sorted[index].yusho) return sorted[index];
  }
  return null;
}

export function countDistinctBasho(rows: Pick<TimelineItem, 'bashoId'>[]): number {
  return new Set(rows.map((row) => row.bashoId)).size;
}

export function computeProgressionStreaks(progression: RankProgressionItem[]): {
  longestWin: BashoStreak | null;
  longestLoss: BashoStreak | null;
  current: BashoStreak | null;
} {
  if (!progression.length) {
    return { longestWin: null, longestLoss: null, current: null };
  }

  const sorted = sortCareerRowsChronologically(progression);
  let longestWin: BashoStreak | null = null;
  let longestLoss: BashoStreak | null = null;
  let current: BashoStreak | null = null;
  let activeType: 'win' | 'loss' | null = null;
  let activeStart = '';
  let activeLength = 0;

  for (const [index, entry] of sorted.entries()) {
    const nextType: 'win' | 'loss' = entry.kachiKoshi ? 'win' : 'loss';

    if (nextType === activeType) {
      activeLength += 1;
      continue;
    }

    if (activeType && activeLength > 0) {
      const streak: BashoStreak = {
        type: activeType,
        length: activeLength,
        startBasho: activeStart,
        endBasho: sorted[index - 1]?.bashoId ?? activeStart,
      };

      if (activeType === 'win' && (!longestWin || streak.length > longestWin.length)) {
        longestWin = streak;
      }
      if (activeType === 'loss' && (!longestLoss || streak.length > longestLoss.length)) {
        longestLoss = streak;
      }
    }

    activeType = nextType;
    activeStart = entry.bashoId;
    activeLength = 1;
  }

  if (activeType && activeLength > 0) {
    const streak: BashoStreak = {
      type: activeType,
      length: activeLength,
      startBasho: activeStart,
      endBasho: sorted[sorted.length - 1]?.bashoId ?? activeStart,
    };

    if (activeType === 'win' && (!longestWin || streak.length > longestWin.length)) {
      longestWin = streak;
    }
    if (activeType === 'loss' && (!longestLoss || streak.length > longestLoss.length)) {
      longestLoss = streak;
    }
    current = streak;
  }

  return { longestWin, longestLoss, current };
}

export function getYushoEntries(rows: RankProgressionItem[]): RankProgressionItem[] {
  return sortCareerRowsChronologically(rows).filter((row) => row.yusho);
}

export function countWinningBasho(rows: RankProgressionItem[]): number {
  return rows.filter((row) => row.kachiKoshi || row.yusho).length;
}

export function countDoubleDigitBasho(rows: RankProgressionItem[]): number {
  return rows.filter((row) => row.wins >= 10).length;
}

export function findBestBashoEntry(rows: RankProgressionItem[]): RankProgressionItem | null {
  if (!rows.length) return null;

  return [...rows].sort((a, b) => {
    const winsDelta = b.wins - a.wins;
    if (winsDelta !== 0) return winsDelta;

    const lossesDelta = a.losses - b.losses;
    if (lossesDelta !== 0) return lossesDelta;

    const divisionDelta = divisionIndex(a.division) - divisionIndex(b.division);
    if (divisionDelta !== 0) return divisionDelta;

    return b.bashoId.localeCompare(a.bashoId);
  })[0] ?? null;
}
