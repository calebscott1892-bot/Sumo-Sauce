import type { TimelineItem } from '../../shared/api/v1';

export type RivalryState = 'none' | 'even' | 'balanced' | 'edge' | 'dominant';
export type RivalryLeader = 'a' | 'b' | 'even';

export type RivalryInsight = {
  leader: RivalryLeader;
  state: RivalryState;
  margin: number;
  aShare: number;
  bShare: number;
  label: string;
  detail: string;
};

export type TimelineRecordSummary = {
  wins: number;
  losses: number;
  bouts: number;
  winPct: number;
};

function boutLabel(count: number): string {
  return `${count} bout${count === 1 ? '' : 's'}`;
}

function formatRecord(wins: number, losses: number): string {
  return `${wins}-${losses}`;
}

export function getRivalryStateVariant(state: RivalryState): 'zinc' | 'amber' | 'blue' | 'red' {
  switch (state) {
    case 'even':
    case 'balanced':
      return 'amber';
    case 'edge':
      return 'blue';
    case 'dominant':
      return 'red';
    default:
      return 'zinc';
  }
}

export function buildRivalryInsight({
  winsA,
  winsB,
  totalMatches,
  labelA,
  labelB,
}: {
  winsA: number;
  winsB: number;
  totalMatches: number;
  labelA: string;
  labelB: string;
}): RivalryInsight {
  if (totalMatches <= 0) {
    return {
      leader: 'even',
      state: 'none',
      margin: 0,
      aShare: 50,
      bShare: 50,
      label: 'No published bouts',
      detail: `There are no published head-to-head bouts between ${labelA} and ${labelB} yet.`,
    };
  }

  const leader: RivalryLeader = winsA === winsB ? 'even' : winsA > winsB ? 'a' : 'b';
  const margin = Math.abs(winsA - winsB);
  const aShare = (winsA / totalMatches) * 100;
  const bShare = (winsB / totalMatches) * 100;

  if (leader === 'even') {
    return {
      leader,
      state: 'even',
      margin: 0,
      aShare,
      bShare,
      label: 'Dead even',
      detail: `${labelA} and ${labelB} are level at ${formatRecord(winsA, winsB)} across ${boutLabel(totalMatches)}.`,
    };
  }

  const leaderName = leader === 'a' ? labelA : labelB;
  const ratio = margin / totalMatches;

  if (ratio <= 0.15) {
    return {
      leader,
      state: 'balanced',
      margin,
      aShare,
      bShare,
      label: 'Balanced rivalry',
      detail: `${leaderName} leads by ${margin}, but the series is still tight at ${formatRecord(winsA, winsB)} over ${boutLabel(totalMatches)}.`,
    };
  }

  if (ratio <= 0.3) {
    return {
      leader,
      state: 'edge',
      margin,
      aShare,
      bShare,
      label: `${leaderName} has the edge`,
      detail: `${leaderName} leads ${formatRecord(winsA, winsB)} across ${boutLabel(totalMatches)} and owns a clear but not overwhelming advantage.`,
    };
  }

  return {
    leader,
    state: 'dominant',
    margin,
    aShare,
    bShare,
    label: `${leaderName} controls the series`,
    detail: `${leaderName} leads ${formatRecord(winsA, winsB)} across ${boutLabel(totalMatches)}, making this a decisively tilted head-to-head.`,
  };
}

export function summarizeTimelineRecord(rows: TimelineItem[]): TimelineRecordSummary {
  const wins = rows.reduce((sum, row) => sum + row.wins, 0);
  const losses = rows.reduce((sum, row) => sum + row.losses, 0);
  const bouts = wins + losses;

  return {
    wins,
    losses,
    bouts,
    winPct: bouts > 0 ? (wins / bouts) * 100 : 0,
  };
}

export function buildRecentFormInsight({
  rowsA,
  rowsB,
  labelA,
  labelB,
}: {
  rowsA: TimelineItem[];
  rowsB: TimelineItem[];
  labelA: string;
  labelB: string;
}): RivalryInsight {
  const summaryA = summarizeTimelineRecord(rowsA);
  const summaryB = summarizeTimelineRecord(rowsB);

  if (!summaryA.bouts && !summaryB.bouts) {
    return {
      leader: 'even',
      state: 'none',
      margin: 0,
      aShare: 50,
      bShare: 50,
      label: 'Recent form unavailable',
      detail: 'Recent form context is not published for either rikishi in the currently loaded timeline rows.',
    };
  }

  const total = summaryA.wins + summaryB.wins;
  const aShare = total > 0 ? (summaryA.wins / total) * 100 : 50;
  const bShare = total > 0 ? (summaryB.wins / total) * 100 : 50;
  const leader: RivalryLeader =
    summaryA.winPct === summaryB.winPct
      ? 'even'
      : summaryA.winPct > summaryB.winPct
        ? 'a'
        : 'b';

  const leaderName = leader === 'a' ? labelA : labelB;
  const margin = Math.abs(summaryA.wins - summaryB.wins);
  const pctGap = Math.abs(summaryA.winPct - summaryB.winPct);
  const detail = `Across the loaded recent basho, ${labelA} is ${formatRecord(summaryA.wins, summaryA.losses)} and ${labelB} is ${formatRecord(summaryB.wins, summaryB.losses)}.`;

  if (leader === 'even' || (pctGap < 5 && margin <= 1)) {
    return {
      leader: 'even',
      state: 'balanced',
      margin,
      aShare,
      bShare,
      label: 'Recent form is close',
      detail,
    };
  }

  if (pctGap < 12) {
    return {
      leader,
      state: 'edge',
      margin,
      aShare,
      bShare,
      label: `${leaderName} has the recent edge`,
      detail,
    };
  }

  return {
    leader,
    state: 'dominant',
    margin,
    aShare,
    bShare,
    label: `${leaderName} has the sharper recent form`,
    detail,
  };
}
