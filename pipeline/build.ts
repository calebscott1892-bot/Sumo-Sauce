import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  BuildManifestSchema,
  type BuildManifest,
  type OutputFile,
  type SnapshotInput,
} from './manifest.ts';
import { hashJson, sha256Hex, stableStringify } from './hash.ts';
import {
  sortBanzukeEntries,
  sortBasho,
  sortBouts,
  sortKimarite,
  sortRikishi,
} from './order.ts';
import { parse as parseJsa } from './adapters/jsaAdapter.ts';
import { parse as parseSumodb } from './adapters/sumodbAdapter.ts';
import { parse as parseWikimedia } from './adapters/wikimediaAdapter.ts';
import { parse as parseWikipedia } from './adapters/wikipediaAdapter.ts';
import { canonicalizeBanzuke } from './canonicalize/canonicalizeBanzuke.ts';
import { canonicalizeBouts } from './canonicalize/canonicalizeBouts.ts';
import { canonicalizeRikishi } from './canonicalize/canonicalizeRikishi.ts';
import { writeSnapshot } from './snapshots/snapshotStore.ts';
import {
  CaptureSnapshotMetaSchema,
  type CaptureSnapshotMeta,
  type Source,
} from './snapshots/snapshotTypes.ts';
import { writeStagedOutputs, type StagedOutputs } from './staged/stagedWriters.ts';
import {
  BashoSchema,
  BanzukeEntrySchema,
  BoutSchema,
  FixtureBanzukeEntrySchema,
  FixtureBashoSchema,
  FixtureBoutSchema,
  FixtureKimariteSchema,
  FixtureRikishiSchema,
  KimariteSchema,
  RikishiSchema,
  type Basho,
  type BanzukeEntry,
  type Bout,
  type FixtureBout,
  type Kimarite,
  type Rikishi,
} from './types.ts';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FIXTURE_DIR = path.join(ROOT, 'pipeline', 'fixtures');
const SNAPSHOT_FIXTURE_DIR = path.join(FIXTURE_DIR, 'snapshots');
const SNAPSHOT_FIXTURE_PHASE4_DIR = path.join(SNAPSHOT_FIXTURE_DIR, 'phase4');
const OUTPUT_ROOT = path.join(ROOT, 'data', 'builds');
const PIPELINE_VERSION = '0.4.0';
const SCHEMA_VERSION = '0.4.0';
const PIPELINE_MODE = String(process.env.PIPELINE_MODE || 'phase4').trim().toLowerCase();

const FIXTURE_FILES = {
  rikishi: 'rikishi.fixture.json',
  basho: 'basho.fixture.json',
  banzukeEntries: 'banzuke_entries.fixture.json',
  bouts: 'bouts.fixture.json',
  kimarite: 'kimarite.fixture.json',
};

function isPlaceholderString(v: string): boolean {
  const s = v.trim();
  if (!s) return true;
  return ['n/a', 'na', 'null', 'undefined'].includes(s.toLowerCase());
}

// Invariant: omit missing keys and placeholders; never write null/"N/A".
function sanitize(value: unknown): unknown {
  if (value == null) return undefined;

  if (typeof value === 'string') {
    const t = value.trim();
    return isPlaceholderString(t) ? undefined : t;
  }

  if (Array.isArray(value)) {
    const out = value.map(sanitize).filter((v) => v !== undefined);
    return out.length ? out : undefined;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      const next = sanitize(obj[key]);
      if (next !== undefined) out[key] = next;
    }
    return Object.keys(out).length ? out : undefined;
  }

  return value;
}

function toCanonical<T>(row: Record<string, unknown>, parser: { parse: (v: unknown) => T }): T {
  const cleaned = sanitize(row) as Record<string, unknown>;
  return parser.parse(cleaned);
}

function computeBoutId(bout: FixtureBout): string {
  // Invariant: deterministic key order; lower-division support is first-class via required `division`.
  return hashJson({
    bashoId: bout.bashoId,
    day: bout.day,
    division: bout.division,
    boutNo: bout.boutNo,
    eastRikishiId: bout.eastRikishiId,
    westRikishiId: bout.westRikishiId,
  });
}

type CanonicalEntityOutput = {
  fileName: string;
  rows: Array<Record<string, unknown>>;
};

async function writeAtomic(filePath: string, bytes: Buffer): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(tempPath, bytes);
  await rename(tempPath, filePath);
}

async function writeJsonl(buildCanonicalDir: string, output: CanonicalEntityOutput): Promise<OutputFile> {
  const filePath = path.join(buildCanonicalDir, output.fileName);
  const jsonl = output.rows.map((row) => `${stableStringify(row)}\n`).join('');
  await writeAtomic(filePath, Buffer.from(jsonl, 'utf8'));

  return {
    path: `canonical/${output.fileName}`,
    sha256: sha256Hex(Buffer.from(jsonl, 'utf8')),
    bytes: Buffer.byteLength(jsonl, 'utf8'),
    rows: output.rows.length,
  };
}

type FixtureFileResult<T> = {
  records: T[];
  snapshot: FixtureInput;
};

type FixtureInput = { path: string; sha256: string; sizeBytes: number; records: number };
type SnapshotFixtureInput = { source: Source; meta: CaptureSnapshotMeta; bodyBytes: Buffer };

async function readFixtureArray<T>(
  fileName: string,
  parser: { parse: (value: unknown) => T }
): Promise<FixtureFileResult<T>> {
  const relPath = `pipeline/fixtures/${fileName}`;
  const absPath = path.join(FIXTURE_DIR, fileName);
  const raw = await readFile(absPath);
  const parsed = JSON.parse(raw.toString('utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Fixture must be a JSON array: ${relPath}`);
  }

  const records = parsed.map((item) => parser.parse(item));
  return {
    records,
    snapshot: {
      path: relPath,
      sha256: sha256Hex(raw),
      sizeBytes: raw.byteLength,
      records: parsed.length,
    },
  };
}

type SnapshotFixtureRecord = {
  source: Source;
  sha256: string;
  url: string;
  bytes: number;
  meta: CaptureSnapshotMeta;
  bodyBytes: Buffer;
};

function extFromContentType(contentType: string): '.json' | '.html' | '.txt' {
  const t = contentType.toLowerCase();
  if (t.includes('json')) return '.json';
  if (t.includes('html')) return '.html';
  return '.txt';
}

function asSnapshotInput(record: SnapshotFixtureRecord): SnapshotInput {
  return {
    source: record.source,
    sha256: record.sha256,
    url: record.url,
    bytes: record.bytes,
  };
}

async function walkMetaFiles(rootDir: string): Promise<string[]> {
  const found: string[] = [];
  const entries = await readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkMetaFiles(abs);
      found.push(...nested);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.meta.json')) {
      found.push(abs);
    }
  }
  return found;
}

async function loadSnapshotFixtureInputs(): Promise<SnapshotFixtureInput[]> {
  await mkdir(SNAPSHOT_FIXTURE_DIR, { recursive: true });
  await mkdir(SNAPSHOT_FIXTURE_PHASE4_DIR, { recursive: true });

  const metaAbs = (await walkMetaFiles(SNAPSHOT_FIXTURE_DIR)).sort();

  const inputs: SnapshotFixtureInput[] = [];
  for (const metaPath of metaAbs) {
    const rawMeta = await readFile(metaPath, 'utf8');
    const meta = CaptureSnapshotMetaSchema.parse(JSON.parse(rawMeta));
    const bodyPath = metaPath.replace(/\.meta\.json$/, extFromContentType(meta.contentType));
    const bodyBytes = await readFile(bodyPath);

    const computedSha = sha256Hex(bodyBytes);
    if (computedSha !== meta.contentSha256) {
      throw new Error(`Snapshot fixture sha mismatch: ${path.relative(ROOT, metaPath)}`);
    }
    if (bodyBytes.byteLength !== meta.bytes) {
      throw new Error(`Snapshot fixture byte-length mismatch: ${path.relative(ROOT, metaPath)}`);
    }

    inputs.push({
      source: meta.source,
      meta,
      bodyBytes,
    });
  }

  return inputs.sort(
    (a, b) => a.source.localeCompare(b.source) || a.meta.contentSha256.localeCompare(b.meta.contentSha256)
  );
}

async function persistSnapshots(inputs: SnapshotFixtureInput[]): Promise<SnapshotFixtureRecord[]> {
  const snapshots: SnapshotFixtureRecord[] = [];
  for (const input of inputs) {
    const writeResult = await writeSnapshot({
      source: input.meta.source,
      bodyBytes: input.bodyBytes,
      contentType: input.meta.contentType,
      httpStatus: input.meta.httpStatus,
    });

    const parseMeta = CaptureSnapshotMetaSchema.parse({
      ...input.meta,
      contentSha256: writeResult.meta.contentSha256,
      bytes: input.bodyBytes.byteLength,
      contentType: writeResult.meta.contentType,
      httpStatus: writeResult.meta.httpStatus,
    });

    snapshots.push({
      source: input.meta.source,
      sha256: writeResult.meta.contentSha256,
      url: input.meta.url,
      bytes: input.bodyBytes.byteLength,
      meta: parseMeta,
      bodyBytes: input.bodyBytes,
    });
  }

  return snapshots.sort((a, b) => a.source.localeCompare(b.source) || a.sha256.localeCompare(b.sha256));
}

function parseStagedFromSnapshots(snapshots: SnapshotFixtureRecord[]): StagedOutputs {
  const out: StagedOutputs = {
    sumodbRikishi: [],
    jsaRikishi: [],
    wikipediaRikishi: [],
    wikimediaImages: [],
  };

  for (const s of snapshots) {
    if (!s.url.startsWith('https://fixtures.local/')) {
      continue;
    }

    const payload = { meta: s.meta, bodyBytes: s.bodyBytes };
    if (s.source === 'sumodb') out.sumodbRikishi.push(...parseSumodb(payload));
    if (s.source === 'jsa') out.jsaRikishi.push(...parseJsa(payload));
    if (s.source === 'wikipedia') out.wikipediaRikishi.push(...parseWikipedia(payload));
    if (s.source === 'wikimedia') out.wikimediaImages.push(...parseWikimedia(payload));
  }

  return out;
}

function assertNoDuplicateKeys<T>(rows: T[], key: (row: T) => string, label: string): void {
  const seen = new Set<string>();
  for (const row of rows) {
    const k = key(row);
    if (seen.has(k)) {
      throw new Error(`duplicate ${label} key: ${k}`);
    }
    seen.add(k);
  }
}

function toCanonicalRikishi(row: Rikishi): Rikishi {
  return toCanonical(row as unknown as Record<string, unknown>, RikishiSchema);
}

function toCanonicalBasho(row: Basho): Basho {
  return toCanonical(row as unknown as Record<string, unknown>, BashoSchema);
}

function toCanonicalBanzukeEntry(row: BanzukeEntry): BanzukeEntry {
  return toCanonical(row as unknown as Record<string, unknown>, BanzukeEntrySchema);
}

function toCanonicalKimarite(row: Kimarite): Kimarite {
  return toCanonical(row as unknown as Record<string, unknown>, KimariteSchema);
}

function toCanonicalBout(row: FixtureBout): Bout {
  const withId: Bout = {
    ...row,
    boutId: computeBoutId(row),
  };

  return toCanonical(withId as unknown as Record<string, unknown>, BoutSchema);
}

export type BuildResult = {
  buildId: string;
  buildDir: string;
  manifestPath: string;
  canonicalDir: string;
  stagedDir: string;
  stagedOutputPaths: string[];
  canonicalOutputPaths: string[];
  outputPaths: string[];
  manifest: BuildManifest;
};

export async function runBuild(): Promise<BuildResult> {
  const mode = PIPELINE_MODE === 'fixtures' ? 'fixtures' : 'phase4';
  const fixtureSnapshots: FixtureInput[] = [];

  const fixtureRikishi = await readFixtureArray(FIXTURE_FILES.rikishi, FixtureRikishiSchema);
  const fixtureBasho = await readFixtureArray(FIXTURE_FILES.basho, FixtureBashoSchema);
  const fixtureBanzukeEntries = await readFixtureArray(FIXTURE_FILES.banzukeEntries, FixtureBanzukeEntrySchema);
  const fixtureBouts = await readFixtureArray(FIXTURE_FILES.bouts, FixtureBoutSchema);
  const fixtureKimarite = await readFixtureArray(FIXTURE_FILES.kimarite, FixtureKimariteSchema);

  fixtureSnapshots.push(
    fixtureRikishi.snapshot,
    fixtureBasho.snapshot,
    fixtureBanzukeEntries.snapshot,
    fixtureBouts.snapshot,
    fixtureKimarite.snapshot
  );

  fixtureSnapshots.sort((a, b) => a.path.localeCompare(b.path));

  const snapshotFixtureInputs = await loadSnapshotFixtureInputs();
  const snapshotFixtures = await persistSnapshots(snapshotFixtureInputs);
  const snapshotInputs = snapshotFixtures.map(asSnapshotInput);

  // Invariant: buildId = hash(inputs + versions).
  const buildId = hashJson({
    inputs: {
      fixtures: fixtureSnapshots,
      snapshots: snapshotInputs,
    },
    mode,
    pipelineVersion: PIPELINE_VERSION,
    schemaVersion: SCHEMA_VERSION,
  });

  const buildDir = path.join(OUTPUT_ROOT, buildId);
  const canonicalDir = path.join(buildDir, 'canonical');
  const stagedDir = path.join(buildDir, 'staged');
  const manifestPath = path.join(buildDir, 'manifest.json');

  await mkdir(canonicalDir, { recursive: true });

  let stagedOutputs = await writeStagedOutputs(buildDir, {
    sumodbRikishi: [],
    jsaRikishi: [],
    wikipediaRikishi: [],
    wikimediaImages: [],
  });

  let canonicalRikishi: Rikishi[] = [];
  let canonicalBasho: Basho[] = [];
  let canonicalBanzukeEntries: BanzukeEntry[] = [];
  let canonicalBouts: Bout[] = [];
  let canonicalKimarite: Kimarite[] = [];

  if (mode === 'phase4') {
    const staged = parseStagedFromSnapshots(snapshotFixtures);
    stagedOutputs = await writeStagedOutputs(buildDir, staged);

    canonicalRikishi = canonicalizeRikishi({
      sumodb: staged.sumodbRikishi,
      jsa: staged.jsaRikishi,
      wikipedia: staged.wikipediaRikishi,
      wikimedia: staged.wikimediaImages,
    });

    const rikishiIdByShikona = new Map(
      canonicalRikishi.map((r) => [String(r.shikona || '').trim().toLowerCase(), r.rikishiId])
    );

    canonicalBanzukeEntries = canonicalizeBanzuke({
      jsa: staged.jsaRikishi,
      rikishiIdByShikona,
    });

    canonicalBouts = canonicalizeBouts();
    canonicalKimarite = [];

    const bashoRefs = new Map<string, Array<NonNullable<Basho['sourceRefs']>[number]>>();
    for (const row of canonicalBanzukeEntries) {
      if (!bashoRefs.has(row.bashoId)) bashoRefs.set(row.bashoId, []);
      if (row.sourceRefs?.length) bashoRefs.get(row.bashoId)?.push(...row.sourceRefs);
    }

    canonicalBasho = sortBasho(
      [...bashoRefs.entries()].map(([bashoId, refs]) =>
        BashoSchema.parse({
          bashoId,
          sourceRefs: refs
            .sort(
              (a, b) =>
                a.source.localeCompare(b.source)
                || a.snapshotSha256.localeCompare(b.snapshotSha256)
                || a.url.localeCompare(b.url)
            )
            .filter((ref, i, arr) => i === 0 || `${arr[i - 1].source}:${arr[i - 1].snapshotSha256}:${arr[i - 1].url}` !== `${ref.source}:${ref.snapshotSha256}:${ref.url}`),
        })
      )
    );
  } else {
    canonicalRikishi = sortRikishi(fixtureRikishi.records.map(toCanonicalRikishi));
    canonicalBasho = sortBasho(fixtureBasho.records.map(toCanonicalBasho));
    canonicalBanzukeEntries = sortBanzukeEntries(
      fixtureBanzukeEntries.records.map(toCanonicalBanzukeEntry)
    );
    canonicalBouts = sortBouts(fixtureBouts.records.map(toCanonicalBout));
    canonicalKimarite = sortKimarite(fixtureKimarite.records.map(toCanonicalKimarite));
  }

  assertNoDuplicateKeys(canonicalRikishi, (x) => x.rikishiId, 'rikishiId');
  assertNoDuplicateKeys(canonicalBasho, (x) => x.bashoId, 'bashoId');
  assertNoDuplicateKeys(canonicalBouts, (x) => x.boutId, 'boutId');
  assertNoDuplicateKeys(canonicalKimarite, (x) => x.kimariteId, 'kimariteId');

  const canonicalOutputs = [
    await writeJsonl(canonicalDir, { fileName: 'rikishi.jsonl', rows: canonicalRikishi }),
    await writeJsonl(canonicalDir, { fileName: 'basho.jsonl', rows: canonicalBasho }),
    await writeJsonl(canonicalDir, { fileName: 'banzuke_entries.jsonl', rows: canonicalBanzukeEntries }),
    await writeJsonl(canonicalDir, { fileName: 'bouts.jsonl', rows: canonicalBouts }),
    await writeJsonl(canonicalDir, { fileName: 'kimarite.jsonl', rows: canonicalKimarite }),
  ];

  canonicalOutputs.sort((a, b) => a.path.localeCompare(b.path));

  const manifestDraft: BuildManifest = {
    buildId,
    pipelineVersion: PIPELINE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    inputs: {
      fixtures: fixtureSnapshots,
      snapshots: snapshotInputs,
    },
    outputs: {
      staged: stagedOutputs.files,
      canonical: canonicalOutputs,
    },
  };

  const manifest = BuildManifestSchema.parse(manifestDraft);
  const manifestText = `${stableStringify(manifest)}\n`;
  await writeAtomic(manifestPath, Buffer.from(manifestText, 'utf8'));

  return {
    buildId,
    buildDir,
    stagedDir,
    canonicalDir,
    stagedOutputPaths: stagedOutputs.outputPaths,
    canonicalOutputPaths: canonicalOutputs.map((o) => path.join(buildDir, o.path)),
    outputPaths: [...stagedOutputs.outputPaths, ...canonicalOutputs.map((o) => path.join(buildDir, o.path))],
    manifestPath,
    manifest,
  };
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const result = await runBuild();
  process.stdout.write(`${stableStringify({ buildId: result.buildId, buildDir: path.relative(ROOT, result.buildDir) })}\n`);
}
