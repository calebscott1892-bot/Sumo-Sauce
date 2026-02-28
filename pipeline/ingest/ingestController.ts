import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { generateBashoRange } from './bashoRange.ts';
import { toCompactIngestError } from './ingestErrors.ts';
import { ingestConfig, type IngestMode } from './ingestConfig.ts';
import { ingestSingleBasho, type IngestSingleBashoSummary } from './ingestSingleBasho.ts';

type IngestionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';

type BashoIngestionResult = {
  bashoId: string;
  status: IngestionStatus;
  skipped: boolean;
  summary?: IngestSingleBashoSummary;
  errorMessage?: string;
};

type IngestRangeResult = {
  from: string;
  to: string;
  total: number;
  complete: number;
  failed: number;
  skipped: number;
  results: BashoIngestionResult[];
};

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SERVER_ENV = path.join(ROOT, 'server', '.env');
const ROOT_ENV = path.join(ROOT, '.env');

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

async function createPrismaClient(): Promise<any> {
  await maybeLoadEnvFile(ROOT_ENV);
  await maybeLoadEnvFile(SERVER_ENV);
  const mod: any = await import('../../server/node_modules/@prisma/client/index.js');
  return new mod.PrismaClient();
}

export async function ingestRange(input: {
  from: string;
  to: string;
  mode?: IngestMode;
  force?: boolean;
}): Promise<IngestRangeResult> {
  const mode = input.mode || ingestConfig.mode;
  const force = Boolean(input.force);
  const bashoIds = generateBashoRange(input.from, input.to);
  const prisma = await createPrismaClient();

  try {
    for (const bashoId of bashoIds) {
      await prisma.$transaction(async (tx: any) => {
        await tx.bashoIngestion.upsert({
          where: { bashoId },
          create: {
            bashoId,
            status: 'PENDING' as IngestionStatus,
          },
          update: {},
        });
      });
    }

    const results: BashoIngestionResult[] = [];

    for (const bashoId of bashoIds) {
      const row = await prisma.bashoIngestion.findUnique({ where: { bashoId } });
      if (row?.status === 'COMPLETE' && !force) {
        results.push({ bashoId, status: 'COMPLETE', skipped: true });
        continue;
      }

      await prisma.$transaction(async (tx: any) => {
        await tx.bashoIngestion.update({
          where: { bashoId },
          data: {
            status: 'IN_PROGRESS' as IngestionStatus,
            startedAt: new Date(),
            finishedAt: null,
            snapshotCount: 0,
            buildId: null,
            errorMessage: null,
          },
        });
      });

      try {
        const summary = await ingestSingleBasho(bashoId, { mode });

        await prisma.$transaction(async (tx: any) => {
          await tx.bashoIngestion.update({
            where: { bashoId },
            data: {
              status: 'COMPLETE' as IngestionStatus,
              finishedAt: new Date(),
              snapshotCount: summary.snapshotCount,
              buildId: summary.buildId,
              errorMessage: null,
            },
          });
        });

        results.push({
          bashoId,
          status: 'COMPLETE',
          skipped: false,
          summary,
        });
      } catch (err) {
        const errorMessage = toCompactIngestError(err);

        await prisma.$transaction(async (tx: any) => {
          await tx.bashoIngestion.update({
            where: { bashoId },
            data: {
              status: 'FAILED' as IngestionStatus,
              finishedAt: new Date(),
              errorMessage,
            },
          });
        });

        results.push({
          bashoId,
          status: 'FAILED',
          skipped: false,
          errorMessage,
        });
      }
    }

    return {
      from: input.from,
      to: input.to,
      total: bashoIds.length,
      complete: results.filter((r) => r.status === 'COMPLETE').length,
      failed: results.filter((r) => r.status === 'FAILED').length,
      skipped: results.filter((r) => r.skipped).length,
      results,
    };
  } finally {
    await prisma.$disconnect();
  }
}
