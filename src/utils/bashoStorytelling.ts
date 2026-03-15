import type { DivisionStandingRow } from '../../shared/api/v1';

export type DivisionStorySnapshot = {
  sortedRows: DivisionStandingRow[];
  leader: DivisionStandingRow | null;
  runnerUp: DivisionStandingRow | null;
  tiedLeaders: DivisionStandingRow[];
  chasePack: DivisionStandingRow[];
  leaderGap: number | null;
  closeRace: boolean;
  winningRecordCount: number;
  doubleDigitWinCount: number;
  standout: DivisionStandingRow | null;
};

const DIVISION_BASE_ORDER: Array<[RegExp, number]> = [
  [/yokozuna/i, 1],
  [/ozeki/i, 5],
  [/sekiwake/i, 10],
  [/komusubi/i, 14],
  [/maegashira\s*(\d+)/i, 18],
  [/juryo\s*(\d+)/i, 60],
  [/makushita\s*(\d+)/i, 120],
  [/sandanme\s*(\d+)/i, 220],
  [/jonidan\s*(\d+)/i, 320],
  [/jonokuchi\s*(\d+)/i, 420],
];

export function rankToOrder(rank: string): number {
  const text = String(rank || '').trim();
  const lower = text.toLowerCase();

  for (const [pattern, base] of DIVISION_BASE_ORDER) {
    const match = lower.match(pattern);
    if (!match) continue;
    if (match[1]) {
      const num = Number(match[1]);
      const sideOffset = lower.includes('west') ? 0.5 : 0;
      return base + num * 2 + sideOffset;
    }
    return base;
  }

  return 999;
}

export function sortDivisionStandings(rows: DivisionStandingRow[]): DivisionStandingRow[] {
  return [...rows].sort((a, b) =>
    b.wins - a.wins ||
    a.losses - b.losses ||
    rankToOrder(a.rank) - rankToOrder(b.rank) ||
    a.rank.localeCompare(b.rank),
  );
}

export function detectDivisionLeader(rows: DivisionStandingRow[]): DivisionStandingRow | null {
  return sortDivisionStandings(rows)[0] ?? null;
}

function findStandoutCandidate(sortedRows: DivisionStandingRow[], leader: DivisionStandingRow | null): DivisionStandingRow | null {
  if (!sortedRows.length) return null;

  const leaderOrder = leader ? rankToOrder(leader.rank) : null;
  const deeperCandidates = sortedRows
    .filter((row) =>
      row.rikishiId !== leader?.rikishiId &&
      row.wins >= 8 &&
      (leaderOrder === null || rankToOrder(row.rank) >= leaderOrder + 4),
    )
    .sort((a, b) =>
      b.wins - a.wins ||
      rankToOrder(b.rank) - rankToOrder(a.rank) ||
      a.losses - b.losses,
    );

  if (deeperCandidates[0]) return deeperCandidates[0];

  return sortedRows.find((row) => row.rikishiId !== leader?.rikishiId && row.wins >= 8) ?? sortedRows[1] ?? null;
}

export function buildDivisionStorySnapshot(rows: DivisionStandingRow[]): DivisionStorySnapshot {
  const sortedRows = sortDivisionStandings(rows);
  const leader = sortedRows[0] ?? null;
  const runnerUp = sortedRows[1] ?? null;
  const tiedLeaders = leader
    ? sortedRows.filter((row) => row.wins === leader.wins && row.losses === leader.losses).slice(0, 3)
    : [];
  const leaderGap = leader && runnerUp ? leader.wins - runnerUp.wins : null;
  const chasePack = leader
    ? sortedRows
      .filter((row) => row.rikishiId !== leader.rikishiId && row.wins >= leader.wins - 1)
      .slice(0, 3)
    : [];

  return {
    sortedRows,
    leader,
    runnerUp,
    tiedLeaders,
    chasePack,
    leaderGap,
    closeRace: Boolean(leader && runnerUp && leaderGap !== null && leaderGap <= 1),
    winningRecordCount: sortedRows.filter((row) => row.wins > row.losses).length,
    doubleDigitWinCount: sortedRows.filter((row) => row.wins >= 10).length,
    standout: findStandoutCandidate(sortedRows, leader),
  };
}
