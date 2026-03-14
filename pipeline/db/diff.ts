import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { hashStableJson, stableStringify } from '../hash.ts';

type EntityType = 'rikishi' | 'basho' | 'banzuke' | 'bout' | 'kimarite';

type DiffRow = {
  entityType: EntityType;
  entityId: string;
  beforeHash?: string;
  afterHash?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

type DiffResult = {
  buildId: string;
  previousBuildId: string | null;
  added: DiffRow[];
  changed: DiffRow[];
  removed: DiffRow[];
  counts: Record<EntityType, { added: number; changed: number; removed: number }>;
  diffDir: string;
};

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const BUILDS_DIR = path.join(ROOT, 'data', 'builds');
const SERVER_ENV = path.join(ROOT, 'server', '.env');
const ROOT_ENV = path.join(ROOT, '.env');

const CANONICAL_FILES: Array<{ entityType: EntityType; fileName: string }> = [
  { entityType: 'rikishi', fileName: 'rikishi.jsonl' },
  { entityType: 'basho', fileName: 'basho.jsonl' },
  { entityType: 'banzuke', fileName: 'banzuke_entries.jsonl' },
  { entityType: 'bout', fileName: 'bouts.jsonl' },
  { entityType: 'kimarite', fileName: 'kimarite.jsonl' },
];

function parseJsonl(text: string): Array<Record<string, unknown>> {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeAtomic(filePath: string, text: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(tmpPath, text, 'utf8');
  await rename(tmpPath, filePath);
}

function rowId(entityType: EntityType, row: Record<string, unknown>): string {
  if (entityType === 'rikishi') return String(row.rikishiId || '').trim();
  if (entityType === 'basho') return String(row.bashoId || '').trim();
  if (entityType === 'bout') return String(row.boutId || '').trim();
  if (entityType === 'kimarite') return String(row.kimariteId || '').trim();
  // banzuke composite key
  return [row.bashoId, row.division, row.rankValue, row.side].map((x) => String(x ?? '').trim()).join('|');
}

function sortDiffRows(rows: DiffRow[]): DiffRow[] {
  return [...rows].sort(
    (a, b) => a.entityType.localeCompare(b.entityType) || a.entityId.localeCompare(b.entityId)
  );
}

function hashRow(row: Record<string, unknown>): string {
  return hashStableJson(row);
}

async function maybeLoadEnvFile(filePath: string): Promise<void> {
  try {
    const text = await readFile(filePath, 'utf8');
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
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
    // ignore missing env files
  }
}

async function resolvePreviousBuildIdFromDb(currentBuildId: string): Promise<string | null> {
  await maybeLoadEnvFile(ROOT_ENV);
  await maybeLoadEnvFile(SERVER_ENV);

  try {
    const mod = await import('../../server/node_modules/@prisma/client/index.js');
    const prisma: any = new mod.PrismaClient();
    const row = await prisma.build.findFirst({
      where: {
        status: 'SUCCESS',
        NOT: { buildId: currentBuildId },
      },
      orderBy: [{ createdAt: 'desc' }],
      select: { buildId: true },
    });
    await prisma.$disconnect();
    return row?.buildId ?? null;
  } catch {
    return null;
  }
}

async function loadCanonicalMap(buildId: string, entityType: EntityType, fileName: string): Promise<Map<string, Record<string, unknown>>> {
  const filePath = path.join(BUILDS_DIR, buildId, 'canonical', fileName);
  try {
    const text = await readFile(filePath, 'utf8');
    const rows = parseJsonl(text);
    const out = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const id = rowId(entityType, row);
      if (!id) continue;
      out.set(id, row);
    }
    return out;
  } catch {
    return new Map<string, Record<string, unknown>>();
  }
}

function parseArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

export async function runDiff(input: {
  buildId: string;
  previousBuildId?: string | null;
}): Promise<DiffResult> {
  const buildId = input.buildId;
  const previousBuildId = input.previousBuildId === undefined
    ? await resolvePreviousBuildIdFromDb(buildId)
    : (input.previousBuildId || null);

  const added: DiffRow[] = [];
  const changed: DiffRow[] = [];
  const removed: DiffRow[] = [];

  const counts: DiffResult['counts'] = {
    rikishi: { added: 0, changed: 0, removed: 0 },
    basho: { added: 0, changed: 0, removed: 0 },
    banzuke: { added: 0, changed: 0, removed: 0 },
    bout: { added: 0, changed: 0, removed: 0 },
    kimarite: { added: 0, changed: 0, removed: 0 },
  };

  for (const spec of CANONICAL_FILES) {
    const curr = await loadCanonicalMap(buildId, spec.entityType, spec.fileName);
    const prev = previousBuildId
      ? await loadCanonicalMap(previousBuildId, spec.entityType, spec.fileName)
      : new Map<string, Record<string, unknown>>();

    const currKeys = [...curr.keys()].sort();
    const prevKeys = [...prev.keys()].sort();

    const prevKeySet = new Set(prevKeys);
    const currKeySet = new Set(currKeys);

    for (const id of currKeys) {
      const now = curr.get(id)!;
      if (!prevKeySet.has(id)) {
        added.push({
          entityType: spec.entityType,
          entityId: id,
          afterHash: hashRow(now),
          after: now,
        });
        counts[spec.entityType].added += 1;
        continue;
      }

      const old = prev.get(id)!;
      const beforeHash = hashRow(old);
      const afterHash = hashRow(now);
      if (beforeHash !== afterHash) {
        changed.push({
          entityType: spec.entityType,
          entityId: id,
          beforeHash,
          afterHash,
          before: old,
          after: now,
        });
        counts[spec.entityType].changed += 1;
      }
    }

    for (const id of prevKeys) {
      if (!currKeySet.has(id)) {
        const old = prev.get(id)!;
        removed.push({
          entityType: spec.entityType,
          entityId: id,
          beforeHash: hashRow(old),
          before: old,
        });
        counts[spec.entityType].removed += 1;
      }
    }
  }

  const diffDir = path.join(BUILDS_DIR, buildId, 'diff');
  const sortedAdded = sortDiffRows(added);
  const sortedChanged = sortDiffRows(changed);
  const sortedRemoved = sortDiffRows(removed);

  await writeAtomic(
    path.join(diffDir, 'added.jsonl'),
    sortedAdded.map((r) => `${stableStringify(r)}\n`).join('')
  );
  await writeAtomic(
    path.join(diffDir, 'changed.jsonl'),
    sortedChanged.map((r) => `${stableStringify(r)}\n`).join('')
  );
  await writeAtomic(
    path.join(diffDir, 'removed.jsonl'),
    sortedRemoved.map((r) => `${stableStringify(r)}\n`).join('')
  );

  return {
    buildId,
    previousBuildId,
    added: sortedAdded,
    changed: sortedChanged,
    removed: sortedRemoved,
    counts,
    diffDir,
  };
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const buildId = parseArg('build-id');
  if (!buildId) {
    throw new Error('Missing --build-id argument');
  }
  const previousBuildId = parseArg('previous-build-id');
  const result = await runDiff({ buildId, previousBuildId });
  process.stdout.write(`${stableStringify({
    buildId: result.buildId,
    previousBuildId: result.previousBuildId,
    counts: result.counts,
    diffDir: path.relative(ROOT, result.diffDir),
  })}\n`);
}
