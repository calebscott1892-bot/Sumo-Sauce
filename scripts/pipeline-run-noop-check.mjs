#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
  return String(result.stdout || '');
}

function parseLastJsonBlock(text) {
  const trimmed = String(text || '').trim();
  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed[i] !== '{') continue;
    const candidate = trimmed.slice(i);
    try {
      return JSON.parse(candidate);
    } catch {
      // keep scanning for the top-level JSON start
    }
  }
  throw new Error(`Unable to parse JSON output:\n${text}`);
}

async function getDbState() {
  const mod = await import('../server/node_modules/@prisma/client/index.js');
  const prisma = new mod.PrismaClient();
  try {
    const [
      build,
      buildSnapshot,
      rikishi,
      basho,
      banzuke,
      bout,
      kimarite,
      sourceRef,
      tombstone,
      latestBuild,
    ] = await Promise.all([
      prisma.build.count(),
      prisma.buildSnapshot.count(),
      prisma.rikishi.count(),
      prisma.basho.count(),
      prisma.banzukeEntry.count(),
      prisma.bout.count(),
      prisma.kimarite.count(),
      prisma.sourceRef.count(),
      prisma.tombstone.count(),
      prisma.build.findFirst({
        orderBy: [{ createdAt: 'desc' }, { buildId: 'desc' }],
        select: { buildId: true, status: true },
      }),
    ]);

    return {
      counts: { build, buildSnapshot, rikishi, basho, banzuke, bout, kimarite, sourceRef, tombstone },
      latestBuild: latestBuild || null,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const first = parseLastJsonBlock(run('npm', ['run', 'pipeline:run']));
  const dbAfterFirst = await getDbState();

  const second = parseLastJsonBlock(run('npm', ['run', 'pipeline:run']));
  const dbAfterSecond = await getDbState();

  assert.equal(Boolean(second?.load?.noop), true, 'Second pipeline:run must report load.noop=true');
  assert.deepEqual(dbAfterSecond.counts, dbAfterFirst.counts, 'DB row counts changed on second run');
  assert.deepEqual(dbAfterSecond.latestBuild, dbAfterFirst.latestBuild, 'Latest build status changed on second run');

  process.stdout.write(`${JSON.stringify({
    ok: true,
    firstBuildId: first?.buildId || null,
    secondBuildId: second?.buildId || null,
    secondNoop: Boolean(second?.load?.noop),
    latestBuild: dbAfterSecond.latestBuild,
  })}\n`);
}

main().catch((err) => {
  process.stderr.write(`${String(err?.stack || err)}\n`);
  process.exit(1);
});
