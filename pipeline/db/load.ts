import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { runDiff } from './diff.ts';
import { sha256Hex } from '../hash.ts';

type EntityType = 'rikishi' | 'basho' | 'banzuke' | 'bout' | 'kimarite';

type DiffRow = {
  entityType: EntityType;
  entityId: string;
  beforeHash?: string;
  afterHash?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

type LoadSummary = {
  buildId: string;
  noop: boolean;
  counts: Record<EntityType, { added: number; changed: number; removed: number }>;
};

type BuildStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const BUILDS_DIR = path.join(ROOT, 'data', 'builds');
const SERVER_ENV = path.join(ROOT, 'server', '.env');
const ROOT_ENV = path.join(ROOT, '.env');

function parseJsonl(text: string): DiffRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as DiffRow);
}

function parseArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
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
    // ignore
  }
}

function requiredString(value: unknown, field: string): string {
  const out = String(value ?? '').trim();
  if (!out) throw new Error(`Missing required string field: ${field}`);
  return out;
}

function nullableString(value: unknown): string | null {
  const out = String(value ?? '').trim();
  return out ? out : null;
}

function nullableInt(value: unknown): number | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function asLowerString(value: unknown, field: string): string {
  const out = requiredString(value, field).toLowerCase();
  return out;
}

function banzukeSyntheticId(entityId: string): string {
  return `bzk_${sha256Hex(entityId).slice(0, 24)}`;
}

function groupRows(rows: DiffRow[]): Record<EntityType, DiffRow[]> {
  return {
    rikishi: rows.filter((r) => r.entityType === 'rikishi').sort((a, b) => a.entityId.localeCompare(b.entityId)),
    basho: rows.filter((r) => r.entityType === 'basho').sort((a, b) => a.entityId.localeCompare(b.entityId)),
    banzuke: rows.filter((r) => r.entityType === 'banzuke').sort((a, b) => a.entityId.localeCompare(b.entityId)),
    bout: rows.filter((r) => r.entityType === 'bout').sort((a, b) => a.entityId.localeCompare(b.entityId)),
    kimarite: rows.filter((r) => r.entityType === 'kimarite').sort((a, b) => a.entityId.localeCompare(b.entityId)),
  };
}

function sourceRefRowsFromDiff(buildId: string, rows: DiffRow[]): Array<{
  entityType: string;
  entityId: string;
  source: string;
  snapshotSha256: string;
  url: string;
  refType: string | null;
  note: string | null;
  buildId: string;
}> {
  const out: Array<{
    entityType: string;
    entityId: string;
    source: string;
    snapshotSha256: string;
    url: string;
    refType: string | null;
    note: string | null;
    buildId: string;
  }> = [];

  const seen = new Set<string>();
  for (const row of rows) {
    const refs = Array.isArray(row.after?.sourceRefs) ? row.after?.sourceRefs as Array<Record<string, unknown>> : [];
    for (const ref of refs) {
      const entry = {
        entityType: row.entityType,
        entityId: row.entityId,
        source: requiredString(ref.source, 'sourceRef.source'),
        snapshotSha256: requiredString(ref.snapshotSha256, 'sourceRef.snapshotSha256'),
        url: requiredString(ref.url, 'sourceRef.url'),
        refType: nullableString(ref.refType),
        note: nullableString(ref.note),
        buildId,
      };
      const key = [entry.entityType, entry.entityId, entry.source, entry.snapshotSha256, entry.url, entry.refType ?? ''].join('|');
      if (!seen.has(key)) {
        seen.add(key);
        out.push(entry);
      }
    }
  }

  return out.sort(
    (a, b) =>
      a.entityType.localeCompare(b.entityType)
      || a.entityId.localeCompare(b.entityId)
      || a.source.localeCompare(b.source)
      || a.snapshotSha256.localeCompare(b.snapshotSha256)
      || a.url.localeCompare(b.url)
      || (a.refType ?? '').localeCompare(b.refType ?? '')
  );
}

function uniqueBuildSnapshots(
  snapshots: Array<{ source: string; sha256: string; url: string; bytes: number }>
): Array<{ source: string; sha256: string; url: string; bytes: number }> {
  const out: Array<{ source: string; sha256: string; url: string; bytes: number }> = [];
  const seen = new Set<string>();

  for (const snap of snapshots) {
    const key = [snap.source, snap.sha256, snap.url].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(snap);
  }

  return out.sort((a, b) => a.source.localeCompare(b.source) || a.sha256.localeCompare(b.sha256) || a.url.localeCompare(b.url));
}

async function ensureDiff(buildId: string, previousBuildId?: string | null): Promise<void> {
  const diffDir = path.join(BUILDS_DIR, buildId, 'diff');
  try {
    await readFile(path.join(diffDir, 'added.jsonl'), 'utf8');
    await readFile(path.join(diffDir, 'changed.jsonl'), 'utf8');
    await readFile(path.join(diffDir, 'removed.jsonl'), 'utf8');
  } catch {
    await runDiff({ buildId, previousBuildId });
  }
}

export async function runLoad(input: {
  buildId: string;
  previousBuildId?: string | null;
}): Promise<LoadSummary> {
  await maybeLoadEnvFile(ROOT_ENV);
  await maybeLoadEnvFile(SERVER_ENV);

  const manifestPath = path.join(BUILDS_DIR, input.buildId, 'manifest.json');
  const manifestBuffer = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBuffer.toString('utf8')) as {
    buildId: string;
    schemaVersion: string;
    pipelineVersion: string;
    inputs: { snapshots: Array<{ source: string; sha256: string; url: string; bytes: number }> };
  };

  if (manifest.buildId !== input.buildId) {
    throw new Error(`Build id mismatch between CLI (${input.buildId}) and manifest (${manifest.buildId})`);
  }

  const mod: any = await import('../../server/node_modules/@prisma/client/index.js');
  const prisma = new mod.PrismaClient();

  try {
    const existing = await prisma.build.findUnique({ where: { buildId: input.buildId } });
    if (existing?.status === 'SUCCESS') {
      return {
        buildId: input.buildId,
        noop: true,
        counts: {
          rikishi: { added: 0, changed: 0, removed: 0 },
          basho: { added: 0, changed: 0, removed: 0 },
          banzuke: { added: 0, changed: 0, removed: 0 },
          bout: { added: 0, changed: 0, removed: 0 },
          kimarite: { added: 0, changed: 0, removed: 0 },
        },
      };
    }

    await ensureDiff(input.buildId, input.previousBuildId);

    const diffDir = path.join(BUILDS_DIR, input.buildId, 'diff');
    const added = parseJsonl(await readFile(path.join(diffDir, 'added.jsonl'), 'utf8'));
    const changed = parseJsonl(await readFile(path.join(diffDir, 'changed.jsonl'), 'utf8'));
    const removed = parseJsonl(await readFile(path.join(diffDir, 'removed.jsonl'), 'utf8'));

    const upsertsByEntity = groupRows([...added, ...changed]);
    const removalsByEntity = groupRows(removed);

    const counts: LoadSummary['counts'] = {
      rikishi: {
        added: added.filter((x) => x.entityType === 'rikishi').length,
        changed: changed.filter((x) => x.entityType === 'rikishi').length,
        removed: removed.filter((x) => x.entityType === 'rikishi').length,
      },
      basho: {
        added: added.filter((x) => x.entityType === 'basho').length,
        changed: changed.filter((x) => x.entityType === 'basho').length,
        removed: removed.filter((x) => x.entityType === 'basho').length,
      },
      banzuke: {
        added: added.filter((x) => x.entityType === 'banzuke').length,
        changed: changed.filter((x) => x.entityType === 'banzuke').length,
        removed: removed.filter((x) => x.entityType === 'banzuke').length,
      },
      bout: {
        added: added.filter((x) => x.entityType === 'bout').length,
        changed: changed.filter((x) => x.entityType === 'bout').length,
        removed: removed.filter((x) => x.entityType === 'bout').length,
      },
      kimarite: {
        added: added.filter((x) => x.entityType === 'kimarite').length,
        changed: changed.filter((x) => x.entityType === 'kimarite').length,
        removed: removed.filter((x) => x.entityType === 'kimarite').length,
      },
    };

    const applyTombstones = async (tx: any, entityType: EntityType, rows: DiffRow[]) => {
      for (const row of rows) {
        await tx.tombstone.upsert({
          where: {
            entityType_entityId_buildId: {
              entityType,
              entityId: row.entityId,
              buildId: input.buildId,
            },
          },
          create: {
            entityType,
            entityId: row.entityId,
            buildId: input.buildId,
          },
          update: {},
        });
      }
    };

    const sourceRefs = sourceRefRowsFromDiff(input.buildId, [
      ...upsertsByEntity.rikishi,
      ...upsertsByEntity.basho,
      ...upsertsByEntity.banzuke,
      ...upsertsByEntity.bout,
      ...upsertsByEntity.kimarite,
    ]);

    const hasDiffRows = Object.values(counts).some(
      (c) => c.added > 0 || c.changed > 0 || c.removed > 0
    );

    if (!hasDiffRows) {
      await prisma.$transaction(async (tx: any) => {
        await tx.build.upsert({
          where: { buildId: input.buildId },
          create: {
            buildId: input.buildId,
            schemaVersion: requiredString(manifest.schemaVersion, 'manifest.schemaVersion'),
            pipelineVersion: requiredString(manifest.pipelineVersion, 'manifest.pipelineVersion'),
            manifestSha256: sha256Hex(manifestBuffer),
            status: 'SUCCESS' satisfies BuildStatus,
            createdAt: new Date(),
          },
          update: {
            schemaVersion: requiredString(manifest.schemaVersion, 'manifest.schemaVersion'),
            pipelineVersion: requiredString(manifest.pipelineVersion, 'manifest.pipelineVersion'),
            manifestSha256: sha256Hex(manifestBuffer),
            status: 'SUCCESS' satisfies BuildStatus,
          },
        });

        await tx.buildSnapshot.deleteMany({ where: { buildId: input.buildId } });
        for (const snap of uniqueBuildSnapshots([...manifest.inputs.snapshots])) {
          await tx.buildSnapshot.create({
            data: {
              buildId: input.buildId,
              source: requiredString(snap.source, 'snapshot.source'),
              sha256: requiredString(snap.sha256, 'snapshot.sha256'),
              url: requiredString(snap.url, 'snapshot.url'),
              bytes: Number(snap.bytes),
            },
          });
        }
      });

      return {
        buildId: input.buildId,
        noop: true,
        counts,
      };
    }

    const failStep = String(process.env.PIPELINE_LOAD_FAIL_STEP || '').trim().toLowerCase();
    const maybeFail = (step: string): void => {
      if (failStep && failStep === step.toLowerCase()) {
        throw new Error(`Injected loader failure at step=${step}`);
      }
    };

    await prisma.$transaction(async (tx: any) => {
      await tx.build.upsert({
        where: { buildId: input.buildId },
        create: {
          buildId: input.buildId,
          schemaVersion: requiredString(manifest.schemaVersion, 'manifest.schemaVersion'),
          pipelineVersion: requiredString(manifest.pipelineVersion, 'manifest.pipelineVersion'),
          manifestSha256: sha256Hex(manifestBuffer),
          status: 'PENDING' satisfies BuildStatus,
          createdAt: new Date(),
        },
        update: {
          schemaVersion: requiredString(manifest.schemaVersion, 'manifest.schemaVersion'),
          pipelineVersion: requiredString(manifest.pipelineVersion, 'manifest.pipelineVersion'),
          manifestSha256: sha256Hex(manifestBuffer),
          status: 'PENDING' satisfies BuildStatus,
        },
      });

      await tx.buildSnapshot.deleteMany({ where: { buildId: input.buildId } });
      for (const snap of uniqueBuildSnapshots([...manifest.inputs.snapshots])) {
        await tx.buildSnapshot.create({
          data: {
            buildId: input.buildId,
            source: requiredString(snap.source, 'snapshot.source'),
            sha256: requiredString(snap.sha256, 'snapshot.sha256'),
            url: requiredString(snap.url, 'snapshot.url'),
            bytes: Number(snap.bytes),
          },
        });
      }
      maybeFail('after-build-snapshots');

      for (const row of upsertsByEntity.rikishi) {
        const after = row.after ?? {};
        await tx.rikishi.upsert({
          where: { rikishiId: requiredString(after.rikishiId, 'rikishi.rikishiId') },
          create: {
            rikishiId: requiredString(after.rikishiId, 'rikishi.rikishiId'),
            shikona: requiredString(after.shikona, 'rikishi.shikona'),
            heya: nullableString(after.heya),
            birthDate: nullableString(after.birthDate),
            heightCm: nullableInt(after.heightCm),
            weightKg: nullableInt(after.weightKg),
            nationality: nullableString(after.nationality),
            officialImageUrl: nullableString(after.officialImageUrl),
            imageUrl: nullableString(after.imageUrl),
            updatedBuildId: input.buildId,
          },
          update: {
            shikona: requiredString(after.shikona, 'rikishi.shikona'),
            heya: nullableString(after.heya),
            birthDate: nullableString(after.birthDate),
            heightCm: nullableInt(after.heightCm),
            weightKg: nullableInt(after.weightKg),
            nationality: nullableString(after.nationality),
            officialImageUrl: nullableString(after.officialImageUrl),
            imageUrl: nullableString(after.imageUrl),
            updatedBuildId: input.buildId,
          },
        });
      }
      await applyTombstones(tx, 'rikishi', removalsByEntity.rikishi);
      maybeFail('after-rikishi');

      for (const row of upsertsByEntity.basho) {
        const after = row.after ?? {};
        await tx.basho.upsert({
          where: { bashoId: requiredString(after.bashoId, 'basho.bashoId') },
          create: {
            bashoId: requiredString(after.bashoId, 'basho.bashoId'),
            label: nullableString(after.label),
            updatedBuildId: input.buildId,
          },
          update: {
            label: nullableString(after.label),
            updatedBuildId: input.buildId,
          },
        });
      }
      await applyTombstones(tx, 'basho', removalsByEntity.basho);

      for (const row of upsertsByEntity.kimarite) {
        const after = row.after ?? {};
        await tx.kimarite.upsert({
          where: { kimariteId: requiredString(after.kimariteId, 'kimarite.kimariteId') },
          create: {
            kimariteId: requiredString(after.kimariteId, 'kimarite.kimariteId'),
            label: nullableString(after.label),
            updatedBuildId: input.buildId,
          },
          update: {
            label: nullableString(after.label),
            updatedBuildId: input.buildId,
          },
        });
      }
      await applyTombstones(tx, 'kimarite', removalsByEntity.kimarite);

      for (const row of upsertsByEntity.banzuke) {
        const after = row.after ?? {};
        const entityId = row.entityId;
        await tx.banzukeEntry.upsert({
          where: { id: banzukeSyntheticId(entityId) },
          create: {
            id: banzukeSyntheticId(entityId),
            bashoId: requiredString(after.bashoId, 'banzuke.bashoId'),
            division: asLowerString(after.division, 'banzuke.division'),
            rankValue: Number(requiredString(after.rankValue, 'banzuke.rankValue')),
            side: asLowerString(after.side, 'banzuke.side'),
            rikishiId: requiredString(after.rikishiId, 'banzuke.rikishiId'),
            rankLabel: nullableString(after.rankLabel),
            updatedBuildId: input.buildId,
          },
          update: {
            bashoId: requiredString(after.bashoId, 'banzuke.bashoId'),
            division: asLowerString(after.division, 'banzuke.division'),
            rankValue: Number(requiredString(after.rankValue, 'banzuke.rankValue')),
            side: asLowerString(after.side, 'banzuke.side'),
            rikishiId: requiredString(after.rikishiId, 'banzuke.rikishiId'),
            rankLabel: nullableString(after.rankLabel),
            updatedBuildId: input.buildId,
          },
        });
      }
      await applyTombstones(tx, 'banzuke', removalsByEntity.banzuke);

      for (const row of upsertsByEntity.bout) {
        const after = row.after ?? {};
        await tx.bout.upsert({
          where: { boutId: requiredString(after.boutId, 'bout.boutId') },
          create: {
            boutId: requiredString(after.boutId, 'bout.boutId'),
            bashoId: requiredString(after.bashoId, 'bout.bashoId'),
            division: asLowerString(after.division, 'bout.division'),
            day: Number(requiredString(after.day, 'bout.day')),
            boutNo: Number(requiredString(after.boutNo, 'bout.boutNo')),
            eastRikishiId: requiredString(after.eastRikishiId, 'bout.eastRikishiId'),
            westRikishiId: requiredString(after.westRikishiId, 'bout.westRikishiId'),
            winnerRikishiId: nullableString(after.winnerRikishiId),
            kimariteId: nullableString(after.kimariteId),
            updatedBuildId: input.buildId,
          },
          update: {
            bashoId: requiredString(after.bashoId, 'bout.bashoId'),
            division: asLowerString(after.division, 'bout.division'),
            day: Number(requiredString(after.day, 'bout.day')),
            boutNo: Number(requiredString(after.boutNo, 'bout.boutNo')),
            eastRikishiId: requiredString(after.eastRikishiId, 'bout.eastRikishiId'),
            westRikishiId: requiredString(after.westRikishiId, 'bout.westRikishiId'),
            winnerRikishiId: nullableString(after.winnerRikishiId),
            kimariteId: nullableString(after.kimariteId),
            updatedBuildId: input.buildId,
          },
        });
      }
      await applyTombstones(tx, 'bout', removalsByEntity.bout);
      maybeFail('after-bout');

      await tx.sourceRef.deleteMany({ where: { buildId: input.buildId } });
      for (const row of sourceRefs) {
        await tx.sourceRef.create({ data: row });
      }

      await tx.build.update({
        where: { buildId: input.buildId },
        data: { status: 'SUCCESS' satisfies BuildStatus },
      });
    });

    return {
      buildId: input.buildId,
      noop: false,
      counts,
    };
  } catch (err) {
    await prisma.build.upsert({
      where: { buildId: input.buildId },
      create: {
        buildId: input.buildId,
        schemaVersion: requiredString(manifest.schemaVersion, 'manifest.schemaVersion'),
        pipelineVersion: requiredString(manifest.pipelineVersion, 'manifest.pipelineVersion'),
        manifestSha256: sha256Hex(manifestBuffer),
        status: 'FAILED' satisfies BuildStatus,
        createdAt: new Date(),
      },
      update: {
        status: 'FAILED' satisfies BuildStatus,
      },
    });
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const buildId = parseArg('build-id');
  if (!buildId) throw new Error('Missing --build-id');
  const previousBuildId = parseArg('previous-build-id');

  const result = await runLoad({ buildId, previousBuildId });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
