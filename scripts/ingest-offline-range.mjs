#!/usr/bin/env node
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
  return v === '1' || v === 'true' || v === 'yes' || v === 'y';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const from = String(args.get('from') || '').trim();
  const to = String(args.get('to') || '').trim();
  const force = parseBool(args.get('force'));

  if (!from || !to) {
    throw new Error('Usage: npm run ingest:offline-range -- --from YYYYMM --to YYYYMM [--force]');
  }

  const result = await ingestRange({ from, to, mode: 'offline', force });

  for (const row of result.results) {
    const out = {
      bashoId: row.bashoId,
      status: row.status,
      skipped: row.skipped,
      snapshotCount: row.summary?.snapshotCount,
      stagedCount: row.summary?.stagedCount,
      canonicalCount: row.summary?.canonicalCount,
      warningCount: row.summary?.warningCount,
      buildId: row.summary?.buildId,
      errorMessage: row.errorMessage,
    };
    process.stdout.write(`${JSON.stringify(out)}\n`);
  }

  const summary = {
    from: result.from,
    to: result.to,
    total: result.total,
    complete: result.complete,
    failed: result.failed,
    skipped: result.skipped,
  };
  process.stdout.write(`${JSON.stringify(summary)}\n`);

  if (result.failed > 0) process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`${String(err?.stack || err)}\n`);
  process.exit(1);
});
