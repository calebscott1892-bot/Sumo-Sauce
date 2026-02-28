import { getPrismaClient } from './db.ts';
import type {
  BashoReadModel,
  BoutReadModel,
  CareerTimelineItem,
  DivisionStandingItem,
  Division,
  HeadToHeadReadModel,
  KimariteCount,
  KimariteStatsReadModel,
  RankProgressionItem,
  RikishiReadModel,
} from './types.ts';
import { DIVISION_ORDER } from './types.ts';

const DIVISION_INDEX = new Map<Division, number>(DIVISION_ORDER.map((d, i) => [d, i]));

function asDivision(value: string): Division {
  if (DIVISION_INDEX.has(value as Division)) return value as Division;
  throw new Error(`Invalid division value: ${value}`);
}

function compareDivision(a: Division, b: Division): number {
  return (DIVISION_INDEX.get(a) ?? 999) - (DIVISION_INDEX.get(b) ?? 999);
}

function compareBasho(a: string, b: string): number {
  return a.localeCompare(b);
}

function compareSide(a: string, b: string): number {
  const av = String(a || '').toLowerCase();
  const bv = String(b || '').toLowerCase();
  if (av === bv) return 0;
  if (av === 'east') return -1;
  if (bv === 'east') return 1;
  return av.localeCompare(bv);
}

function rankDisplay(rankLabel: string | null, rankValue: number, side: string): string {
  if (rankLabel && String(rankLabel).trim()) return String(rankLabel).trim();
  const suffix = String(side || '').toLowerCase() === 'west' ? 'w' : 'e';
  return `${rankValue}${suffix}`;
}

function assertRikishiId(rikishiId: string): string {
  const id = String(rikishiId || '').trim();
  if (!id) throw new Error('rikishiId is required');
  return id;
}

function assertBashoId(bashoId: string): string {
  const id = String(bashoId || '').trim();
  if (!id) throw new Error('bashoId is required');
  return id;
}

export async function getRikishiById(rikishiId: string): Promise<RikishiReadModel> {
  const id = assertRikishiId(rikishiId);
  const prisma = await getPrismaClient();

  const [rikishi, entries, bouts, latestBasho] = await Promise.all([
    prisma.rikishi.findUnique({
      where: { rikishiId: id },
      select: { rikishiId: true, shikona: true, heya: true },
    }),
    prisma.banzukeEntry.findMany({
      where: { rikishiId: id },
      select: {
        bashoId: true,
        division: true,
        rankValue: true,
        side: true,
        rankLabel: true,
      },
    }),
    prisma.bout.findMany({
      where: {
        OR: [{ eastRikishiId: id }, { westRikishiId: id }],
      },
      select: {
        winnerRikishiId: true,
      },
    }),
    prisma.basho.findFirst({
      orderBy: [{ bashoId: 'desc' }],
      select: { bashoId: true },
    }),
  ]);

  if (!rikishi) throw new Error(`Rikishi not found: ${id}`);
  if (!entries.length) throw new Error(`No banzuke entries for rikishi: ${id}`);

  const sortedEntries = [...entries]
    .map((e) => ({ ...e, division: asDivision(e.division) }))
    .sort((a, b) => {
      return (
        compareBasho(a.bashoId, b.bashoId)
        || compareDivision(a.division, b.division)
        || a.rankValue - b.rankValue
        || compareSide(a.side, b.side)
      );
    });

  const debutBasho = sortedEntries[0].bashoId;
  const latestAppearance = sortedEntries[sortedEntries.length - 1].bashoId;
  const retirementBasho = latestBasho && latestAppearance < latestBasho.bashoId ? latestAppearance : null;

  let totalWins = 0;
  let totalLosses = 0;
  let totalAbsences = 0;
  for (const bout of bouts) {
    if (!bout.winnerRikishiId) {
      totalAbsences += 1;
      continue;
    }
    if (bout.winnerRikishiId === id) totalWins += 1;
    else totalLosses += 1;
  }

  const highest = [...sortedEntries].sort((a, b) => {
    return (
      compareDivision(a.division, b.division)
      || a.rankValue - b.rankValue
      || compareSide(a.side, b.side)
      || compareBasho(a.bashoId, b.bashoId)
    );
  })[0];

  return {
    rikishiId: rikishi.rikishiId,
    shikona: rikishi.shikona,
    heya: rikishi.heya ?? undefined,
    debutBasho,
    retirementBasho,
    careerRecord: {
      totalWins,
      totalLosses,
      totalAbsences,
    },
    highestRank: {
      division: highest.division,
      rank: rankDisplay(highest.rankLabel, highest.rankValue, highest.side),
      bashoId: highest.bashoId,
    },
  };
}

export async function getBashoById(bashoId: string): Promise<BashoReadModel> {
  const id = assertBashoId(bashoId);
  const prisma = await getPrismaClient();

  const basho = await prisma.basho.findUnique({
    where: { bashoId: id },
    select: { bashoId: true },
  });
  if (!basho) throw new Error(`Basho not found: ${id}`);

  const bouts = await prisma.bout.findMany({
    where: { bashoId: id },
    select: { division: true },
  });

  const counts: Record<Division, number> = {
    makuuchi: 0,
    juryo: 0,
    makushita: 0,
    sandanme: 0,
    jonidan: 0,
    jonokuchi: 0,
  };

  for (const b of bouts) {
    const division = asDivision(b.division);
    counts[division] += 1;
  }

  return {
    bashoId: id,
    divisions: {
      makuuchi: { bouts: counts.makuuchi },
      juryo: { bouts: counts.juryo },
      makushita: { bouts: counts.makushita },
      sandanme: { bouts: counts.sandanme },
      jonidan: { bouts: counts.jonidan },
      jonokuchi: { bouts: counts.jonokuchi },
    },
  };
}

export async function getBoutsByBashoAndDivision(bashoId: string, division: Division): Promise<BoutReadModel[]> {
  const id = assertBashoId(bashoId);
  const d = asDivision(division);
  const prisma = await getPrismaClient();

  const bouts = await prisma.bout.findMany({
    where: { bashoId: id, division: d },
    select: {
      boutId: true,
      bashoId: true,
      division: true,
      day: true,
      boutNo: true,
      eastRikishiId: true,
      westRikishiId: true,
      winnerRikishiId: true,
      kimariteId: true,
    },
    orderBy: [{ day: 'asc' }, { boutNo: 'asc' }, { boutId: 'asc' }],
  });

  return bouts.map((b) => ({
    boutId: b.boutId,
    bashoId: b.bashoId,
    division: asDivision(b.division),
    day: b.day,
    boutNo: b.boutNo,
    eastRikishiId: b.eastRikishiId,
    westRikishiId: b.westRikishiId,
    winnerRikishiId: b.winnerRikishiId ?? null,
    kimariteId: b.kimariteId ?? null,
  }));
}

export async function getHeadToHead(rikishiA: string, rikishiB: string): Promise<HeadToHeadReadModel> {
  const a = assertRikishiId(rikishiA);
  const b = assertRikishiId(rikishiB);
  const prisma = await getPrismaClient();

  const bouts = await prisma.bout.findMany({
    where: {
      OR: [
        { eastRikishiId: a, westRikishiId: b },
        { eastRikishiId: b, westRikishiId: a },
      ],
    },
    select: {
      bashoId: true,
      division: true,
      day: true,
      boutNo: true,
      boutId: true,
      winnerRikishiId: true,
    },
    orderBy: [{ bashoId: 'asc' }, { day: 'asc' }, { boutNo: 'asc' }, { boutId: 'asc' }],
  });

  let rikishiAWins = 0;
  let rikishiBWins = 0;
  for (const bout of bouts) {
    if (bout.winnerRikishiId === a) rikishiAWins += 1;
    if (bout.winnerRikishiId === b) rikishiBWins += 1;
  }

  const last = bouts.length ? bouts[bouts.length - 1] : null;

  return {
    rikishiA: a,
    rikishiB: b,
    totalMatches: bouts.length,
    rikishiAWins,
    rikishiBWins,
    lastMatch: last
      ? {
          bashoId: last.bashoId,
          division: asDivision(last.division),
          day: last.day,
          winnerRikishiId: last.winnerRikishiId ?? null,
        }
      : null,
  };
}

export async function getCareerTimeline(rikishiId: string): Promise<CareerTimelineItem[]> {
  const id = assertRikishiId(rikishiId);
  const prisma = await getPrismaClient();

  const [entries, bouts] = await Promise.all([
    prisma.banzukeEntry.findMany({
      where: { rikishiId: id },
      select: {
        bashoId: true,
        division: true,
        rankValue: true,
        side: true,
        rankLabel: true,
      },
    }),
    prisma.bout.findMany({
      where: {
        OR: [{ eastRikishiId: id }, { westRikishiId: id }],
      },
      select: {
        bashoId: true,
        division: true,
        winnerRikishiId: true,
      },
    }),
  ]);

  const recordByKey = new Map<string, { wins: number; losses: number }>();
  const keyFor = (bashoId: string, division: string): string => `${bashoId}::${division}`;

  const sortedBouts = [...bouts].sort((a, b) => compareBasho(a.bashoId, b.bashoId) || compareDivision(asDivision(a.division), asDivision(b.division)));
  for (const bout of sortedBouts) {
    const key = keyFor(bout.bashoId, bout.division);
    const rec = recordByKey.get(key) || { wins: 0, losses: 0 };
    if (bout.winnerRikishiId === id) rec.wins += 1;
    else if (bout.winnerRikishiId) rec.losses += 1;
    recordByKey.set(key, rec);
  }

  const sortedEntries = [...entries]
    .map((e) => ({ ...e, division: asDivision(e.division) }))
    .sort((a, b) => {
      return (
        compareBasho(a.bashoId, b.bashoId)
        || compareDivision(a.division, b.division)
        || a.rankValue - b.rankValue
        || compareSide(a.side, b.side)
      );
    });

  return sortedEntries.map((entry) => {
    const rec = recordByKey.get(keyFor(entry.bashoId, entry.division)) || { wins: 0, losses: 0 };
    return {
      bashoId: entry.bashoId,
      division: entry.division,
      rank: rankDisplay(entry.rankLabel, entry.rankValue, entry.side),
      wins: rec.wins,
      losses: rec.losses,
    };
  });
}

export async function getRankProgression(rikishiId: string): Promise<RankProgressionItem[]> {
  const id = assertRikishiId(rikishiId);
  const prisma = await getPrismaClient();

  const [entries, allBouts, rikishiBouts] = await Promise.all([
    prisma.banzukeEntry.findMany({
      where: { rikishiId: id },
      select: {
        bashoId: true,
        division: true,
        rankValue: true,
        side: true,
        rankLabel: true,
      },
    }),
    prisma.bout.findMany({
      select: {
        bashoId: true,
        division: true,
        winnerRikishiId: true,
      },
    }),
    prisma.bout.findMany({
      where: { OR: [{ eastRikishiId: id }, { westRikishiId: id }] },
      select: {
        bashoId: true,
        division: true,
        winnerRikishiId: true,
      },
    }),
  ]);

  const sortedEntries = [...entries]
    .map((e) => ({ ...e, division: asDivision(e.division) }))
    .sort((a, b) => {
      return (
        compareBasho(a.bashoId, b.bashoId)
        || compareDivision(a.division, b.division)
        || a.rankValue - b.rankValue
        || compareSide(a.side, b.side)
      );
    });

  const keyFor = (bashoId: string, division: string): string => `${bashoId}::${division}`;
  const winsByKey = new Map<string, Map<string, number>>();

  for (const bout of allBouts) {
    if (!bout.winnerRikishiId) continue;
    const key = keyFor(bout.bashoId, bout.division);
    const byRikishi = winsByKey.get(key) || new Map<string, number>();
    byRikishi.set(bout.winnerRikishiId, (byRikishi.get(bout.winnerRikishiId) || 0) + 1);
    winsByKey.set(key, byRikishi);
  }

  const recordByKey = new Map<string, { wins: number; losses: number }>();
  for (const bout of rikishiBouts) {
    const key = keyFor(bout.bashoId, bout.division);
    const rec = recordByKey.get(key) || { wins: 0, losses: 0 };
    if (bout.winnerRikishiId === id) rec.wins += 1;
    else if (bout.winnerRikishiId) rec.losses += 1;
    recordByKey.set(key, rec);
  }

  return sortedEntries.map((entry) => {
    const key = keyFor(entry.bashoId, entry.division);
    const rec = recordByKey.get(key) || { wins: 0, losses: 0 };
    const byRikishi = winsByKey.get(key) || new Map<string, number>();
    const maxWins = [...byRikishi.values()].sort((a, b) => b - a)[0] || 0;

    return {
      bashoId: entry.bashoId,
      division: entry.division,
      rank: rankDisplay(entry.rankLabel, entry.rankValue, entry.side),
      wins: rec.wins,
      losses: rec.losses,
      kachiKoshi: rec.wins > rec.losses,
      makeKoshi: rec.losses > rec.wins,
      yusho: rec.wins > 0 && rec.wins === maxWins,
    };
  });
}

export async function getDivisionStandings(bashoId: string, division: string): Promise<DivisionStandingItem[]> {
  const id = assertBashoId(bashoId);
  const d = asDivision(String(division || '').trim().toLowerCase());
  const prisma = await getPrismaClient();

  const [entries, bouts] = await Promise.all([
    prisma.banzukeEntry.findMany({
      where: { bashoId: id, division: d },
      select: {
        rikishiId: true,
        rankValue: true,
        side: true,
        rankLabel: true,
        rikishi: { select: { shikona: true } },
      },
    }),
    prisma.bout.findMany({
      where: { bashoId: id, division: d },
      select: {
        eastRikishiId: true,
        westRikishiId: true,
        winnerRikishiId: true,
        kimariteId: true,
      },
    }),
  ]);

  const sortedEntries = [...entries].sort((a, b) => {
    return a.rankValue - b.rankValue || compareSide(a.side, b.side) || a.rikishiId.localeCompare(b.rikishiId);
  });

  const statsByRikishi = new Map<string, { wins: number; losses: number; kimariteWins: Map<string, number> }>();
  for (const entry of sortedEntries) {
    statsByRikishi.set(entry.rikishiId, {
      wins: 0,
      losses: 0,
      kimariteWins: new Map<string, number>(),
    });
  }

  for (const bout of bouts) {
    const ids = [bout.eastRikishiId, bout.westRikishiId].sort((a, b) => a.localeCompare(b));
    for (const rid of ids) {
      if (!statsByRikishi.has(rid)) continue;
      const rec = statsByRikishi.get(rid)!;
      if (!bout.winnerRikishiId) continue;
      if (bout.winnerRikishiId === rid) {
        rec.wins += 1;
        if (bout.kimariteId) {
          rec.kimariteWins.set(bout.kimariteId, (rec.kimariteWins.get(bout.kimariteId) || 0) + 1);
        }
      } else {
        rec.losses += 1;
      }
    }
  }

  return sortedEntries
    .map((entry) => {
      const rec = statsByRikishi.get(entry.rikishiId)!;
      const denom = rec.wins + rec.losses;
      const kimariteBreakdown: KimariteCount[] = [...rec.kimariteWins.entries()]
        .map(([kimariteId, count]) => ({ kimariteId, count }))
        .sort((a, b) => b.count - a.count || a.kimariteId.localeCompare(b.kimariteId));

      return {
        rikishiId: entry.rikishiId,
        shikona: entry.rikishi.shikona,
        rank: rankDisplay(entry.rankLabel, entry.rankValue, entry.side),
        wins: rec.wins,
        losses: rec.losses,
        winPercentage: denom > 0 ? rec.wins / denom : 0,
        kimariteBreakdown,
        _rankValue: entry.rankValue,
        _side: entry.side,
      };
    })
    .sort((a, b) => {
      return (
        b.wins - a.wins
        || a.losses - b.losses
        || a._rankValue - b._rankValue
        || compareSide(a._side, b._side)
        || a.rikishiId.localeCompare(b.rikishiId)
      );
    })
    .map(({ _rankValue, _side, ...row }) => row);
}

export async function getKimariteStats(rikishiId: string): Promise<KimariteStatsReadModel> {
  const id = assertRikishiId(rikishiId);
  const prisma = await getPrismaClient();

  const bouts = await prisma.bout.findMany({
    where: {
      OR: [{ eastRikishiId: id }, { westRikishiId: id }],
    },
    select: {
      winnerRikishiId: true,
      kimariteId: true,
    },
  });

  let totalWins = 0;
  let totalLosses = 0;
  const winMap = new Map<string, number>();
  const lossMap = new Map<string, number>();

  for (const bout of bouts) {
    const winner = bout.winnerRikishiId;
    if (!winner) continue;

    if (winner === id) {
      totalWins += 1;
      if (bout.kimariteId) winMap.set(bout.kimariteId, (winMap.get(bout.kimariteId) || 0) + 1);
    } else {
      totalLosses += 1;
      if (bout.kimariteId) lossMap.set(bout.kimariteId, (lossMap.get(bout.kimariteId) || 0) + 1);
    }
  }

  const winKimarite = [...winMap.entries()]
    .map(([kimariteId, count]) => ({
      kimariteId,
      count,
      percentage: totalWins > 0 ? count / totalWins : 0,
    }))
    .sort((a, b) => b.count - a.count || a.kimariteId.localeCompare(b.kimariteId));

  const lossKimarite = [...lossMap.entries()]
    .map(([kimariteId, count]) => ({
      kimariteId,
      count,
      percentage: totalLosses > 0 ? count / totalLosses : 0,
    }))
    .sort((a, b) => b.count - a.count || a.kimariteId.localeCompare(b.kimariteId));

  return {
    rikishiId: id,
    totalWins,
    totalLosses,
    winKimarite,
    lossKimarite,
    mostUsedKimarite: winKimarite.length ? winKimarite[0].kimariteId : null,
  };
}
