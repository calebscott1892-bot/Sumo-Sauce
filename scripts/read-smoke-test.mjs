#!/usr/bin/env node
import { getPrismaClient, closeReadPrisma } from '../pipeline/read/db.ts';
import {
  getRikishiById,
  getBashoById,
  getBoutsByBashoAndDivision,
  getHeadToHead,
  getCareerTimeline,
  getRankProgression,
  getDivisionStandings,
  getKimariteStats,
  getRikishiComparison,
} from '../pipeline/read/index.ts';

async function main() {
  const prisma = await getPrismaClient();

  const sampleRikishi = await prisma.rikishi.findFirst({
    orderBy: [{ rikishiId: 'asc' }],
    select: { rikishiId: true },
  });
  if (!sampleRikishi) throw new Error('No rikishi rows found in canonical DB');

  const rikishiId = sampleRikishi.rikishiId;

  // Dynamically find a basho that actually exists in the DB
  const sampleBasho = await prisma.basho.findFirst({
    orderBy: [{ bashoId: 'asc' }],
    select: { bashoId: true },
  });
  if (!sampleBasho) throw new Error('No basho rows found in canonical DB');

  const bashoId = sampleBasho.bashoId;
  const division = 'makuuchi';

  const rikishi = await getRikishiById(rikishiId);
  const basho = await getBashoById(bashoId);
  const bouts = await getBoutsByBashoAndDivision(bashoId, division);

  const opponentId = bouts.length
    ? (bouts[0].eastRikishiId === rikishiId ? bouts[0].westRikishiId : bouts[0].eastRikishiId)
    : null;

  // Fall back to a different rikishi from the DB if no bouts exist
  const effectiveOpponentId = opponentId || await (async () => {
    const other = await prisma.rikishi.findFirst({
      where: { rikishiId: { not: rikishiId } },
      orderBy: [{ rikishiId: 'asc' }],
      select: { rikishiId: true },
    });
    return other ? other.rikishiId : rikishiId;
  })();

  const h2h = await getHeadToHead(rikishiId, effectiveOpponentId);
  const timeline = await getCareerTimeline(rikishiId);
  const rankProgression = await getRankProgression(rikishiId);
  const standings = await getDivisionStandings(bashoId, division);
  const kimariteStats = await getKimariteStats(rikishiId);

  console.log(JSON.stringify({ input: { rikishiId, bashoId, division, opponentId: effectiveOpponentId } }, null, 2));
  console.log(JSON.stringify({ getRikishiById: rikishi }, null, 2));
  console.log(JSON.stringify({ getBashoById: basho }, null, 2));
  console.log(JSON.stringify({ getBoutsByBashoAndDivision: bouts.slice(0, 10), total: bouts.length }, null, 2));
  console.log(JSON.stringify({ getHeadToHead: h2h }, null, 2));
  console.log(JSON.stringify({ getCareerTimeline: timeline.slice(0, 20), total: timeline.length }, null, 2));
  console.log(JSON.stringify({ getRankProgression: rankProgression.slice(0, 20), total: rankProgression.length }, null, 2));
  console.log(JSON.stringify({ getDivisionStandings: standings.slice(0, 20), total: standings.length }, null, 2));
  console.log(JSON.stringify({ getKimariteStats: kimariteStats }, null, 2));

  const comparison = await getRikishiComparison(rikishiId, effectiveOpponentId);
  console.log(JSON.stringify({ getRikishiComparison: comparison }, null, 2));
}

main()
  .catch((err) => {
    console.error(String(err?.stack || err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeReadPrisma();
  });
