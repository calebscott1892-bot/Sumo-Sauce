import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { runBuild } from './build.ts';
import { sha256Hex } from './hash.ts';
import {
  compareBanzukeEntries,
  compareBasho,
  compareBouts,
  compareKimarite,
  compareRikishi,
} from './order.ts';
import {
  BashoSchema,
  BanzukeEntrySchema,
  BoutSchema,
  KimariteSchema,
  RikishiSchema,
} from './types.ts';
import { readSnapshot } from './snapshots/snapshotStore.ts';
import { CaptureSnapshotMetaSchema } from './snapshots/snapshotTypes.ts';
import {
  StagedImageWikimediaSchema,
  StagedRikishiJSASchema,
  StagedRikishiSumoDBSchema,
  StagedRikishiWikipediaSchema,
} from './staged/stagedTypes.ts';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SNAPSHOT_FIXTURE_DIR = path.join(ROOT, 'pipeline', 'fixtures', 'snapshots');
const SERVER_ENV = path.join(ROOT, 'server', '.env');
const ROOT_ENV = path.join(ROOT, '.env');

function parseJsonl(text: string): Array<Record<string, unknown>> {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function hasInvalidValue(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value === 'string') {
    const t = value.trim();
    return t === '' || ['n/a', 'na', 'null', 'undefined'].includes(t.toLowerCase());
  }
  if (Array.isArray(value)) return value.some(hasInvalidValue);
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasInvalidValue);
  return false;
}

function assertNoPlaceholderInRawJsonl(text: string, label: string): void {
  assert.equal(text.includes(':null'), false, `${label} contains null literal`);
}

async function maybeLoadEnvFile(filePath: string): Promise<void> {
  try {
    const raw = await readFile(filePath, 'utf8');
    for (const lineRaw of raw.split('\n')) {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

async function verifyDbIdempotency(buildId: string): Promise<void> {
  await maybeLoadEnvFile(ROOT_ENV);
  await maybeLoadEnvFile(SERVER_ENV);

  const { runLoad } = await import('./db/load.ts');
  const first = await runLoad({ buildId });
  const second = await runLoad({ buildId });

  const mod: any = await import('../server/node_modules/@prisma/client/index.js');
  const prisma = new mod.PrismaClient();

  const before = {
    build: await prisma.build.count(),
    buildSnapshot: await prisma.buildSnapshot.count(),
    rikishi: await prisma.rikishi.count(),
    sourceRef: await prisma.sourceRef.count(),
    basho: await prisma.basho.count(),
    banzuke: await prisma.banzukeEntry.count(),
    bout: await prisma.bout.count(),
    kimarite: await prisma.kimarite.count(),
    tombstone: await prisma.tombstone.count(),
  };

  const third = await runLoad({ buildId });

  const after = {
    build: await prisma.build.count(),
    buildSnapshot: await prisma.buildSnapshot.count(),
    rikishi: await prisma.rikishi.count(),
    sourceRef: await prisma.sourceRef.count(),
    basho: await prisma.basho.count(),
    banzuke: await prisma.banzukeEntry.count(),
    bout: await prisma.bout.count(),
    kimarite: await prisma.kimarite.count(),
    tombstone: await prisma.tombstone.count(),
  };

  const successRows = await prisma.build.count({ where: { buildId, status: 'SUCCESS' } });
  const rikishiSourceRefs = await prisma.sourceRef.count({ where: { buildId, entityType: 'rikishi' } });

  await prisma.$disconnect();

  assert.equal(first.buildId, buildId, 'db load first run build id mismatch');
  assert.equal(second.buildId, buildId, 'db load second run build id mismatch');
  assert.equal(third.buildId, buildId, 'db load third run build id mismatch');
  assert.deepEqual(before, after, 'DB row counts changed on repeated load for same build');
  assert.equal(successRows, 1, 'Build registry must contain exactly one SUCCESS row for buildId');
  assert.ok(rikishiSourceRefs > 0, 'Expected rikishi source refs to be present in DB');
}

async function verifySnapshotFixturesConsistency(): Promise<void> {
  async function walkMetaFiles(rootDir: string): Promise<string[]> {
    const out: string[] = [];
    const entries = await readdir(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        out.push(...await walkMetaFiles(abs));
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.meta.json')) out.push(abs);
    }
    return out;
  }

  const metaFiles = (await walkMetaFiles(SNAPSHOT_FIXTURE_DIR)).sort();

  for (const metaPath of metaFiles) {
    const rawMeta = await readFile(metaPath, 'utf8');
    const meta = CaptureSnapshotMetaSchema.parse(JSON.parse(rawMeta));

    const ext = meta.contentType.toLowerCase().includes('json')
      ? '.json'
      : (meta.contentType.toLowerCase().includes('html') ? '.html' : '.txt');
    const bodyPath = metaPath.replace(/\.meta\.json$/, ext);
    const bodyBytes = await readFile(bodyPath);

    assert.equal(
      sha256Hex(bodyBytes),
      meta.contentSha256,
      `snapshot fixture sha mismatch: ${path.relative(ROOT, metaPath)}`
    );
    assert.equal(bodyBytes.byteLength, meta.bytes, `snapshot fixture bytes mismatch: ${path.relative(ROOT, metaPath)}`);
  }
}

async function verifyManifestSnapshots(buildId: string, snapshots: Array<{ source: 'jsa' | 'sumodb' | 'wikipedia' | 'wikimedia'; sha256: string; url: string; bytes: number }>): Promise<void> {
  const sorted = [...snapshots].sort(
    (a, b) => a.source.localeCompare(b.source) || a.sha256.localeCompare(b.sha256)
  );
  assert.deepEqual(snapshots, sorted, 'manifest.inputs.snapshots must be sorted by source then sha256');

  for (const s of snapshots) {
    const loaded = await readSnapshot({ source: s.source, sha256: s.sha256 });
    assert.equal(loaded.meta.bytes, s.bytes, `snapshot bytes mismatch for ${s.source}:${s.sha256}`);
    assert.equal(
      sha256Hex(loaded.bodyBytes),
      s.sha256,
      `snapshot body sha mismatch for ${s.source}:${s.sha256}`
    );
  }

  assert.ok(snapshots.length > 0, `manifest.inputs.snapshots is empty for build ${buildId}`);
}

function assertMonotonic<T>(rows: T[], compare: (a: T, b: T) => number, label: string): void {
  for (let i = 1; i < rows.length; i += 1) {
    const cmp = compare(rows[i - 1], rows[i]);
    assert.ok(cmp <= 0, `${label} ordering is not monotonic at index=${i - 1}`);
  }
}

async function main(): Promise<void> {
  await verifySnapshotFixturesConsistency();

  const first = await runBuild();
  const firstManifest = await readFile(first.manifestPath);
  const firstOutputs = await Promise.all(first.outputPaths.map((p) => readFile(p)));

  const second = await runBuild();
  const secondManifest = await readFile(second.manifestPath);
  const secondOutputs = await Promise.all(second.outputPaths.map((p) => readFile(p)));

  assert.equal(first.buildId, second.buildId, 'buildId must be stable for identical fixtures');
  assert.equal(Buffer.compare(firstManifest, secondManifest), 0, 'manifest.json bytes differ across identical runs');
  const firstAll = [...first.stagedOutputPaths, ...first.canonicalOutputPaths];
  const secondAll = [...second.stagedOutputPaths, ...second.canonicalOutputPaths];

  assert.equal(firstAll.length, secondAll.length, 'output file count differs across identical runs');

  for (let i = 0; i < firstAll.length; i += 1) {
    assert.equal(
      Buffer.compare(firstOutputs[i], secondOutputs[i]),
      0,
      `output file bytes differ across identical runs: ${secondAll[i]}`
    );
  }

  const textByName = new Map(
    secondAll.map((p, i) => [p.split('/').pop() || p, secondOutputs[i].toString('utf8')])
  );

  const firstManifestJson = JSON.parse(firstManifest.toString('utf8'));
  const secondManifestJson = JSON.parse(secondManifest.toString('utf8'));
  assert.deepEqual(firstManifestJson.inputs.snapshots, secondManifestJson.inputs.snapshots, 'snapshot manifest inputs differ across identical runs');
  await verifyManifestSnapshots(second.buildId, secondManifestJson.inputs.snapshots);

  const stagedFiles = secondManifestJson.outputs.staged as Array<{ path: string }>;
  const canonicalFiles = secondManifestJson.outputs.canonical as Array<{ path: string }>;

  assert.deepEqual(
    stagedFiles,
    [...stagedFiles].sort((a, b) => String(a.path).localeCompare(String(b.path))),
    'manifest.outputs.staged must be sorted by path'
  );
  assert.deepEqual(
    canonicalFiles,
    [...canonicalFiles].sort((a, b) => String(a.path).localeCompare(String(b.path))),
    'manifest.outputs.canonical must be sorted by path'
  );

  const stagedSumodbRows = parseJsonl(textByName.get('sumodb_rikishi.jsonl') || '');
  const stagedJsaRows = parseJsonl(textByName.get('jsa_rikishi.jsonl') || '');
  const stagedWikipediaRows = parseJsonl(textByName.get('wikipedia_rikishi.jsonl') || '');
  const stagedWikimediaRows = parseJsonl(textByName.get('wikimedia_images.jsonl') || '');

  for (const row of stagedSumodbRows) {
    assert.equal(hasInvalidValue(row), false, 'sumodb_rikishi.jsonl contains null/empty/placeholder values');
    StagedRikishiSumoDBSchema.parse(row);
  }
  for (const row of stagedJsaRows) {
    assert.equal(hasInvalidValue(row), false, 'jsa_rikishi.jsonl contains null/empty/placeholder values');
    StagedRikishiJSASchema.parse(row);
  }
  for (const row of stagedWikipediaRows) {
    assert.equal(hasInvalidValue(row), false, 'wikipedia_rikishi.jsonl contains null/empty/placeholder values');
    StagedRikishiWikipediaSchema.parse(row);
  }
  for (const row of stagedWikimediaRows) {
    assert.equal(hasInvalidValue(row), false, 'wikimedia_images.jsonl contains null/empty/placeholder values');
    StagedImageWikimediaSchema.parse(row);
  }

  const rikishiRows = parseJsonl(textByName.get('rikishi.jsonl') || '');
  const bashoRows = parseJsonl(textByName.get('basho.jsonl') || '');
  const banzukeRows = parseJsonl(textByName.get('banzuke_entries.jsonl') || '');
  const boutRows = parseJsonl(textByName.get('bouts.jsonl') || '');
  const kimariteRows = parseJsonl(textByName.get('kimarite.jsonl') || '');

  assertMonotonic(rikishiRows, compareRikishi, 'rikishi.jsonl');
  assertMonotonic(bashoRows, compareBasho, 'basho.jsonl');
  assertMonotonic(banzukeRows, compareBanzukeEntries, 'banzuke_entries.jsonl');
  assertMonotonic(boutRows, compareBouts, 'bouts.jsonl');
  assertMonotonic(kimariteRows, compareKimarite, 'kimarite.jsonl');

  for (const row of rikishiRows) {
    assert.equal(hasInvalidValue(row), false, 'rikishi.jsonl contains null/empty/placeholder values');
    RikishiSchema.parse(row);
  }
  assertNoPlaceholderInRawJsonl(textByName.get('rikishi.jsonl') || '', 'rikishi.jsonl');

  for (const row of bashoRows) {
    assert.equal(hasInvalidValue(row), false, 'basho.jsonl contains null/empty/placeholder values');
    BashoSchema.parse(row);
  }
  assertNoPlaceholderInRawJsonl(textByName.get('basho.jsonl') || '', 'basho.jsonl');

  for (const row of banzukeRows) {
    assert.equal(hasInvalidValue(row), false, 'banzuke_entries.jsonl contains null/empty/placeholder values');
    BanzukeEntrySchema.parse(row);
  }
  assertNoPlaceholderInRawJsonl(textByName.get('banzuke_entries.jsonl') || '', 'banzuke_entries.jsonl');

  for (const row of boutRows) {
    assert.equal(hasInvalidValue(row), false, 'bouts.jsonl contains null/empty/placeholder values');
    BoutSchema.parse(row);
  }
  assertNoPlaceholderInRawJsonl(textByName.get('bouts.jsonl') || '', 'bouts.jsonl');

  for (const row of kimariteRows) {
    assert.equal(hasInvalidValue(row), false, 'kimarite.jsonl contains null/empty/placeholder values');
    KimariteSchema.parse(row);
  }
  assertNoPlaceholderInRawJsonl(textByName.get('kimarite.jsonl') || '', 'kimarite.jsonl');

  assert.ok(rikishiRows.length >= 8, 'canonical rikishi row count must be >= 8');

  if (String(process.env.PIPELINE_VERIFY_DB || '').trim() === '1') {
    await verifyDbIdempotency(second.buildId);
  }

  process.stdout.write(
    `OK pipeline:verify buildId=${second.buildId} staged=${second.stagedOutputPaths.length} canonical=${second.canonicalOutputPaths.length} rows=${stagedSumodbRows.length + stagedJsaRows.length + stagedWikipediaRows.length + stagedWikimediaRows.length + rikishiRows.length + bashoRows.length + banzukeRows.length + boutRows.length + kimariteRows.length}\n`
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(String(err?.stack || err));
  process.exit(1);
});
