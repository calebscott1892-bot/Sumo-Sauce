import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { sha256Hex, stableStringify } from '../hash.ts';
import { snapshotStoreError } from './errors.ts';
import { StoredSnapshotMetaSchema, type StoredSnapshotMeta, type Source } from './snapshotTypes.ts';

type WriteSnapshotInput = {
  source: Source;
  bodyBytes: Buffer;
  contentType: string;
  httpStatus: number;
};

type WriteSnapshotResult = {
  meta: StoredSnapshotMeta;
  bodyPath: string;
  metaPath: string;
};

type ReadSnapshotInput = {
  source: Source;
  sha256: string;
};

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SNAPSHOT_ROOT = path.join(ROOT, 'data', 'snapshots');

function extFromContentType(contentType: string): '.json' | '.html' | '.txt' {
  const t = contentType.toLowerCase();
  if (t.includes('json')) return '.json';
  if (t.includes('html')) return '.html';
  return '.txt';
}

async function writeAtomic(filePath: string, bytes: Buffer): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(tempPath, bytes);
  await rename(tempPath, filePath);
}

async function ensureFileBytes(filePath: string, expected: Buffer): Promise<void> {
  try {
    const existing = await readFile(filePath);
    if (Buffer.compare(existing, expected) !== 0) {
      throw snapshotStoreError('SNAPSHOT_BYTES_MISMATCH', 'existing snapshot content differs', {
        filePath,
      });
    }
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === 'ENOENT') {
      await writeAtomic(filePath, expected);
      return;
    }
    throw err;
  }
}

function toMetaPath(sourceDir: string, sha: string): string {
  return path.join(sourceDir, `${sha}.meta.json`);
}

function toBodyPath(sourceDir: string, sha: string, contentType: string): string {
  return path.join(sourceDir, `${sha}${extFromContentType(contentType)}`);
}

function normalizeStoredMeta(value: unknown): StoredSnapshotMeta {
  const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return StoredSnapshotMetaSchema.parse({
    source: obj.source,
    contentSha256: obj.contentSha256,
    bytes: obj.bytes,
    contentType: obj.contentType,
    httpStatus: obj.httpStatus,
  });
}

export async function writeSnapshot(input: WriteSnapshotInput): Promise<WriteSnapshotResult> {
  const contentSha256 = sha256Hex(input.bodyBytes);
  const sourceDir = path.join(SNAPSHOT_ROOT, input.source);
  const bodyPath = toBodyPath(sourceDir, contentSha256, input.contentType);
  const metaPath = toMetaPath(sourceDir, contentSha256);

  await ensureFileBytes(bodyPath, input.bodyBytes);

  try {
    const existingMetaText = await readFile(metaPath, 'utf8');
    const existingMeta = normalizeStoredMeta(JSON.parse(existingMetaText));
    return { meta: existingMeta, bodyPath, metaPath };
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code !== 'ENOENT') {
      throw err;
    }
  }

  const meta: StoredSnapshotMeta = StoredSnapshotMetaSchema.parse({
    source: input.source,
    contentSha256,
    bytes: input.bodyBytes.byteLength,
    contentType: input.contentType,
    httpStatus: input.httpStatus,
  });

  const metaText = `${stableStringify(meta)}\n`;
  await writeAtomic(metaPath, Buffer.from(metaText, 'utf8'));

  return { meta, bodyPath, metaPath };
}

export async function readSnapshot(input: ReadSnapshotInput): Promise<{ meta: StoredSnapshotMeta; bodyBytes: Buffer }> {
  const sourceDir = path.join(SNAPSHOT_ROOT, input.source);
  const metaPath = toMetaPath(sourceDir, input.sha256);

  const rawMeta = await readFile(metaPath, 'utf8');
  const meta = normalizeStoredMeta(JSON.parse(rawMeta));

  if (meta.contentSha256 !== input.sha256) {
    throw snapshotStoreError('SNAPSHOT_META_SHA_MISMATCH', 'meta sha does not match requested sha', {
      requestedSha256: input.sha256,
      metaSha256: meta.contentSha256,
      metaPath,
    });
  }

  const bodyPath = toBodyPath(sourceDir, input.sha256, meta.contentType);
  const bodyBytes = await readFile(bodyPath);

  const computed = sha256Hex(bodyBytes);
  if (computed !== input.sha256) {
    throw snapshotStoreError('SNAPSHOT_BODY_SHA_MISMATCH', 'snapshot body sha mismatch', {
      expectedSha256: input.sha256,
      actualSha256: computed,
      bodyPath,
    });
  }

  const s = await stat(bodyPath);
  if (s.size !== meta.bytes) {
    throw snapshotStoreError('SNAPSHOT_BODY_BYTES_MISMATCH', 'snapshot body byte size mismatch', {
      expectedBytes: meta.bytes,
      actualBytes: s.size,
      bodyPath,
    });
  }

  return { meta, bodyBytes };
}
