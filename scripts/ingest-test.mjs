#!/usr/bin/env node
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { sha256Hex } from '../pipeline/hash.ts';
import { ingestSingleBasho } from '../pipeline/ingest/ingestSingleBasho.ts';
import { BOUT_DIVISIONS, requiredSnapshotsForBasho } from '../pipeline/ingest/sources.ts';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PHASE8_FIXTURES_DIR = path.join(ROOT, 'pipeline', 'fixtures', 'snapshots', 'phase8');

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

function parseJsonl(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function containsPlaceholder(value) {
  const bad = new Set(['n/a', 'na', 'null', 'undefined', 'unknown', 'placeholder', 'tbd']);
  if (value === null) return true;
  if (typeof value === 'string') return bad.has(value.trim().toLowerCase());
  if (Array.isArray(value)) return value.some((item) => containsPlaceholder(item));
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => containsPlaceholder(item));
  }
  return false;
}

async function requireFixturesPresent(bashoId) {
  const required = requiredSnapshotsForBasho(bashoId);
  const boutKinds = required
    .filter((r) => r.kind.startsWith('bouts.'))
    .map((r) => r.kind.slice('bouts.'.length))
    .sort();

  assert.deepEqual(boutKinds, [...BOUT_DIVISIONS].sort(), 'required snapshots must include all six divisions');

  for (const item of required) {
    const ext = item.contentTypeHint.includes('html') ? 'html' : 'json';
    const base = `${bashoId}.${item.source}.${item.kind}`;
    const bodyPath = path.join(PHASE8_FIXTURES_DIR, `${base}.${ext}`);
    const metaPath = path.join(PHASE8_FIXTURES_DIR, `${base}.meta.json`);
    await access(bodyPath);
    await access(metaPath);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bashoId = String(args.get('basho') || '').trim();
  if (!bashoId) {
    throw new Error('Usage: npm run ingest:test -- --basho YYYYMM');
  }

  await requireFixturesPresent(bashoId);

  const first = await ingestSingleBasho(bashoId, { mode: 'offline' });
  const boutsPath = path.join(first.outputDir, 'canonical', 'bouts.jsonl');
  const firstBytes = await readFile(boutsPath);
  const firstSha = sha256Hex(firstBytes);
  const firstRows = parseJsonl(firstBytes.toString('utf8'));

  assert.ok(firstRows.length > 0, 'bouts.jsonl must be non-empty when fixtures exist');

  const second = await ingestSingleBasho(bashoId, { mode: 'offline' });
  const secondBytes = await readFile(path.join(second.outputDir, 'canonical', 'bouts.jsonl'));
  const secondSha = sha256Hex(secondBytes);
  const secondRows = parseJsonl(secondBytes.toString('utf8'));

  const divisions = new Set(firstRows.map((row) => String(row.division || '').trim().toLowerCase()).filter(Boolean));
  assert.ok(divisions.size >= 4, 'bouts.jsonl must contain rows for at least 4 divisions');

  const boutIds = firstRows.map((row) => String(row.boutId || ''));
  assert.equal(new Set(boutIds).size, boutIds.length, 'all boutIds must be unique');

  for (const row of firstRows) {
    if (row.winnerRikishiId === undefined) continue;
    assert.ok(
      row.winnerRikishiId === row.eastRikishiId || row.winnerRikishiId === row.westRikishiId,
      'winnerRikishiId must match eastRikishiId or westRikishiId'
    );
  }

  for (const row of firstRows) {
    assert.equal(containsPlaceholder(row), false, 'no placeholder/null strings allowed in canonical output');
  }

  assert.equal(firstSha, secondSha, 'canonical bouts.jsonl must be byte-identical across two offline runs');
  assert.equal(firstBytes.equals(secondBytes), true, 'canonical bouts bytes must match exactly across runs');
  assert.equal(firstRows.length, secondRows.length, 'row count must be deterministic across runs');

  process.stdout.write(`${JSON.stringify({
    bashoId,
    rows: firstRows.length,
    divisions: [...divisions].sort(),
    firstSha,
    secondSha,
    deterministic: firstSha === secondSha,
  })}\n`);
}

main().catch((err) => {
  process.stderr.write(`${String(err?.stack || err)}\n`);
  process.exit(1);
});
