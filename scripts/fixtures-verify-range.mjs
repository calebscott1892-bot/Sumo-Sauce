#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

import { generateBashoRange } from '../pipeline/ingest/bashoRange.ts';

function parseArgs(argv) {
  const out = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1];
    if (value == null || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }
    out.set(key.slice(2), value);
    i += 1;
  }
  return out;
}

function verifyOne(bashoId) {
  const result = spawnSync('npm', ['run', 'fixtures:verify', '--', '--basho', bashoId], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    return {
      bashoId,
      ok: false,
      exitCode: Number(result.status ?? 1),
      error: String(result.stderr || result.stdout || 'fixtures verify failed').trim(),
    };
  }

  const lines = String(result.stdout || '').split('\n').map((x) => x.trim()).filter((x) => x.startsWith('{'));
  return {
    bashoId,
    ok: true,
    verified: lines.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const from = String(args.get('from') || '').trim();
  const to = String(args.get('to') || '').trim();

  if (!from || !to) {
    throw new Error('Usage: npm run fixtures:verify-range -- --from YYYYMM --to YYYYMM');
  }

  const ids = generateBashoRange(from, to);
  const failedIds = [];
  let ok = 0;

  for (const bashoId of ids) {
    const row = verifyOne(bashoId);
    if (row.ok) ok += 1;
    else failedIds.push(bashoId);
    process.stdout.write(`${JSON.stringify(row)}\n`);
  }

  const summary = {
    from,
    to,
    total: ids.length,
    ok,
    failed: failedIds.length,
    failedIds,
  };

  process.stdout.write(`${JSON.stringify(summary)}\n`);
  if (failedIds.length > 0) process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`${String(err?.stack || err)}\n`);
  process.exit(1);
});
