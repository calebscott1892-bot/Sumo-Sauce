#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

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

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
  return String(result.stdout || '');
}

function parseJsonFromPipelineRunOutput(text) {
  const trimmed = String(text || '').trim();
  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed[i] !== '{') continue;
    const candidate = trimmed.slice(i);
    try {
      return JSON.parse(candidate);
    } catch {
      // continue
    }
  }
  throw new Error(`Could not parse pipeline:run JSON output:\n${text}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const from = String(args.get('from') || '').trim();
  const to = String(args.get('to') || '').trim();

  if (!from || !to) {
    throw new Error('Usage: npm run verify:safe-range -- --from YYYYMM --to YYYYMM');
  }

  run('npm', ['run', 'capture:range', '--', '--from', from, '--to', to]);
  run('npm', ['run', 'fixtures:verify-range', '--', '--from', from, '--to', to]);
  run('npm', ['run', 'ingest:offline-range', '--', '--from', from, '--to', to]);

  const firstRun = parseJsonFromPipelineRunOutput(run('npm', ['run', 'pipeline:run']));
  const secondRun = parseJsonFromPipelineRunOutput(run('npm', ['run', 'pipeline:run']));

  assert.equal(Boolean(secondRun?.load?.noop), true, 'Second pipeline:run must report load.noop=true');

  process.stdout.write(`${JSON.stringify({
    ok: true,
    from,
    to,
    firstBuildId: firstRun?.buildId || null,
    secondBuildId: secondRun?.buildId || null,
    secondNoop: Boolean(secondRun?.load?.noop),
  })}\n`);
}

main().catch((err) => {
  process.stderr.write(`${String(err?.stack || err)}\n`);
  process.exit(1);
});
