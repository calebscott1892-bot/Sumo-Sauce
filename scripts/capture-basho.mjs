#!/usr/bin/env node
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { sha256Hex, stableStringify } from '../pipeline/hash.ts';
import { fetchSnapshot } from '../pipeline/ingest/fetcher.ts';
import { ingestConfig } from '../pipeline/ingest/ingestConfig.ts';
import { requiredSnapshotsForBasho } from '../pipeline/ingest/sources.ts';
import { CaptureSnapshotMetaSchema } from '../pipeline/snapshots/snapshotTypes.ts';

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

function extFromHint(contentTypeHint) {
  const hint = String(contentTypeHint || '').toLowerCase();
  return hint.includes('html') ? 'html' : 'json';
}

async function verifyFixturePair(bodyPath, metaPath) {
  const [bodyBytes, rawMeta] = await Promise.all([
    readFile(bodyPath),
    readFile(metaPath, 'utf8'),
  ]);

  const meta = CaptureSnapshotMetaSchema.parse(JSON.parse(rawMeta));
  const computedSha = sha256Hex(bodyBytes);
  if (computedSha !== meta.contentSha256) {
    throw new Error(`Fixture sha mismatch: ${path.relative(ROOT, metaPath)} expected=${meta.contentSha256} actual=${computedSha}`);
  }
  if (bodyBytes.byteLength !== meta.bytes) {
    throw new Error(`Fixture bytes mismatch: ${path.relative(ROOT, metaPath)} expected=${meta.bytes} actual=${bodyBytes.byteLength}`);
  }
}

async function fetchLiveSnapshotWithRetry(input) {
  try {
    return await fetchSnapshot(input);
  } catch (err) {
    const e = err;
    const filePath = e?.details?.filePath;
    if (e?.name === 'SnapshotStoreError' && e?.message?.includes('existing snapshot content differs') && filePath) {
      await unlink(String(filePath)).catch(() => {});
      return fetchSnapshot(input);
    }
    throw err;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bashoId = String(args.get('basho') || '').trim();

  if (!bashoId) {
    throw new Error('Usage: node scripts/capture-basho.mjs --basho YYYYMM');
  }

  const required = requiredSnapshotsForBasho(bashoId);
  await mkdir(PHASE8_FIXTURES_DIR, { recursive: true });

  const summaries = [];

  for (const snap of required) {
    const fetched = await fetchLiveSnapshotWithRetry({
      source: snap.source,
      url: snap.url,
      contentTypeHint: snap.contentTypeHint,
      kind: snap.kind,
      bashoId,
      mode: 'live',
      fixturesDir: ingestConfig.fixturesDir,
      userAgent: ingestConfig.userAgent,
      timeoutMs: ingestConfig.timeoutMs,
      rateLimitMs: ingestConfig.rateLimitMs,
    });

    const ext = extFromHint(snap.contentTypeHint);
    const base = `${bashoId}.${snap.source}.${snap.kind}`;
    const bodyPath = path.join(PHASE8_FIXTURES_DIR, `${base}.${ext}`);
    const metaPath = path.join(PHASE8_FIXTURES_DIR, `${base}.meta.json`);

    await writeFile(bodyPath, fetched.bodyBytes);
    await writeFile(metaPath, `${stableStringify(fetched.meta)}\n`, 'utf8');

    await verifyFixturePair(bodyPath, metaPath);

    summaries.push({
      source: fetched.meta.source,
      url: fetched.meta.url,
      sha256: fetched.meta.contentSha256,
      bytes: fetched.meta.bytes,
    });
  }

  for (const row of summaries) {
    process.stdout.write(`${stableStringify(row)}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`${String(err?.stack || err)}\n`);
  process.exit(1);
});
