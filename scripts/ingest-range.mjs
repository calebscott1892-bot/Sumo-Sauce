#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

import { ingestRange } from '../pipeline/ingest/ingestController.ts';

function parseArgs(argv) {
  const out = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1];
    if (value == null || value.startsWith('--')) {
      out.set(key.slice(2), true);
      continue;
    }
    out.set(key.slice(2), value);
    i += 1;
  }
  return out;
}

function parseBool(value) {
  if (value === true) return true;
  const v = String(value || '').trim().toLowerCase();
  if (!v) return false;
  return v === '1' || v === 'true' || v === 'yes' || v === 'y';
}

function runDbPush() {
  const result = spawnSync('npm', ['--prefix', 'server', 'run', 'db:push'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    throw new Error(`db:push failed\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const basho = String(args.get('basho') || '').trim();
  const from = basho || String(args.get('from') || '').trim();
  const to = basho || String(args.get('to') || '').trim();
  const modeRaw = String(args.get('mode') || 'offline').trim().toLowerCase();
  const mode = modeRaw === 'live' ? 'live' : 'offline';
  const force = parseBool(args.get('force'));

  if (!from || !to) {
    throw new Error('Usage: node scripts/ingest-range.mjs (--basho YYYYMM | --from YYYYMM --to YYYYMM) [--mode offline|live] [--force]');
  }

  runDbPush();

  const result = await ingestRange({ from, to, mode, force });

  for (const row of result.results) {
    const base = {
      bashoId: row.bashoId,
      status: row.status,
      skipped: row.skipped,
    };

    if (row.summary) {
      process.stdout.write(`${JSON.stringify({
        ...base,
        snapshotCount: row.summary.snapshotCount,
        stagedCount: row.summary.stagedCount,
        canonicalCount: row.summary.canonicalCount,
        warningCount: row.summary.warningCount || 0,
        buildId: row.summary.buildId,
      })}\n`);
      continue;
    }

    process.stdout.write(`${JSON.stringify({ ...base, errorMessage: row.errorMessage || null })}\n`);
  }

  process.stdout.write(`${JSON.stringify({
    from: result.from,
    to: result.to,
    total: result.total,
    complete: result.complete,
    failed: result.failed,
    skipped: result.skipped,
  })}\n`);

  if (result.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`${String(err?.stack || err)}\n`);
  process.exit(1);
});
