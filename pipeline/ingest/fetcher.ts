import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { sha256Hex } from '../hash.ts';
import { writeSnapshot } from '../snapshots/snapshotStore.ts';
import { CaptureSnapshotMetaSchema, type CaptureSnapshotMeta } from '../snapshots/snapshotTypes.ts';
import { IngestError } from './ingestErrors.ts';

type IngestMode = 'offline' | 'live';
type Source = 'jsa' | 'sumodb' | 'wikipedia' | 'wikimedia';

type FetchSnapshotInput = {
  source: Source;
  url: string;
  contentTypeHint: string;
  kind: string;
  bashoId: string;
  mode: IngestMode;
  fixturesDir: string;
  userAgent: string;
  timeoutMs: number;
  rateLimitMs: number;
};

let lastLiveFetchAt = 0;

const ALLOWED_HEADERS = new Set(['etag', 'last-modified', 'content-type']);

function fixtureBaseName(input: { bashoId: string; source: Source; kind: string }): string {
  return `${input.bashoId}.${input.source}.${input.kind}`;
}

async function readFixturePair(input: {
  fixturesDir: string;
  bashoId: string;
  source: Source;
  kind: string;
  url: string;
  contentTypeHint: string;
}): Promise<{ meta: CaptureSnapshotMeta; bodyBytes: Buffer }> {
  const ext = input.contentTypeHint.toLowerCase().includes('html') ? 'html' : 'json';
  const base = fixtureBaseName({ bashoId: input.bashoId, source: input.source, kind: input.kind });
  const bodyPath = path.join(input.fixturesDir, `${base}.${ext}`);
  const metaPath = path.join(input.fixturesDir, `${base}.meta.json`);

  let bodyBytes: Buffer;
  let rawMeta: string;

  try {
    [bodyBytes, rawMeta] = await Promise.all([
      readFile(bodyPath),
      readFile(metaPath, 'utf8'),
    ]);
  } catch {
    throw new IngestError({
      code: 'OFFLINE_FIXTURE_MISSING',
      message: `Offline fixture missing for ${base}`,
      source: input.source,
      url: input.url,
      bashoId: input.bashoId,
      details: `${bodyPath} or ${metaPath}`,
    });
  }

  let parsedMeta: CaptureSnapshotMeta;
  try {
    parsedMeta = CaptureSnapshotMetaSchema.parse(JSON.parse(rawMeta));
  } catch (err) {
    throw new IngestError({
      code: 'VALIDATION_FAILED',
      message: `Invalid fixture meta schema for ${base}`,
      source: input.source,
      url: input.url,
      bashoId: input.bashoId,
      details: String((err as any)?.message || err),
    });
  }

  const computedSha = sha256Hex(bodyBytes);
  if (computedSha !== parsedMeta.contentSha256) {
    throw new IngestError({
      code: 'SOURCE_CHANGED',
      message: `Fixture sha mismatch for ${base}`,
      source: input.source,
      url: input.url,
      bashoId: input.bashoId,
      details: `expected=${parsedMeta.contentSha256} actual=${computedSha}`,
    });
  }

  if (bodyBytes.byteLength !== parsedMeta.bytes) {
    throw new IngestError({
      code: 'SOURCE_CHANGED',
      message: `Fixture byte length mismatch for ${base}`,
      source: input.source,
      url: input.url,
      bashoId: input.bashoId,
      details: `expected=${parsedMeta.bytes} actual=${bodyBytes.byteLength}`,
    });
  }

  return {
    meta: parsedMeta,
    bodyBytes,
  };
}

function sanitizeContentType(value: string | null, fallback: string): string {
  const v = String(value || '').trim();
  return v || fallback;
}

function getAllowlistedHeader(res: Response, key: string): string | undefined {
  if (!ALLOWED_HEADERS.has(key.toLowerCase())) return undefined;
  const value = res.headers.get(key);
  if (!value) return undefined;
  return String(value).trim() || undefined;
}

async function fetchLiveBody(input: FetchSnapshotInput): Promise<{ bodyBytes: Buffer; contentType: string; httpStatus: number; etag?: string; lastModified?: string; fetchedAt: string }> {
  const now = Date.now();
  const sinceLast = now - lastLiveFetchAt;
  if (sinceLast < input.rateLimitMs) {
    await sleep(input.rateLimitMs - sinceLast);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  let res: Response;
  try {
    res = await fetch(input.url, {
      method: 'GET',
      headers: {
        'User-Agent': input.userAgent,
        Accept: input.contentTypeHint,
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw new IngestError({
      code: 'FETCH_FAILED',
      message: `Fetch failed for ${input.url}`,
      source: input.source,
      url: input.url,
      bashoId: input.bashoId,
      details: String((err as any)?.message || err),
    });
  }

  clearTimeout(timeout);
  lastLiveFetchAt = Date.now();

  let bodyBytes: Buffer;
  try {
    bodyBytes = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    throw new IngestError({
      code: 'FETCH_FAILED',
      message: `Failed reading response body for ${input.url}`,
      source: input.source,
      url: input.url,
      bashoId: input.bashoId,
      details: String((err as any)?.message || err),
    });
  }

  if (!res.ok) {
    throw new IngestError({
      code: 'FETCH_FAILED',
      message: `HTTP ${res.status} for ${input.url}`,
      source: input.source,
      url: input.url,
      bashoId: input.bashoId,
      details: `status=${res.status}`,
    });
  }

  return {
    bodyBytes,
    contentType: sanitizeContentType(getAllowlistedHeader(res, 'content-type') || null, input.contentTypeHint),
    httpStatus: res.status,
    etag: getAllowlistedHeader(res, 'etag'),
    lastModified: getAllowlistedHeader(res, 'last-modified'),
    fetchedAt: new Date().toISOString(),
  };
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchSnapshot(input: FetchSnapshotInput): Promise<{ meta: CaptureSnapshotMeta; bodyBytes: Buffer }> {
  if (input.mode === 'offline') {
    const fixture = await readFixturePair({
      fixturesDir: input.fixturesDir,
      bashoId: input.bashoId,
      source: input.source,
      kind: input.kind,
      url: input.url,
      contentTypeHint: input.contentTypeHint,
    });

    return {
      meta: fixture.meta,
      bodyBytes: fixture.bodyBytes,
    };
  }

  const live = await fetchLiveBody(input);

  const persisted = await writeSnapshot({
    source: input.source,
    bodyBytes: live.bodyBytes,
    contentType: live.contentType,
    httpStatus: live.httpStatus,
  });

  const captureMeta = CaptureSnapshotMetaSchema.parse({
    source: input.source,
    url: input.url,
    fetchedAt: live.fetchedAt,
    contentSha256: persisted.meta.contentSha256,
    bytes: persisted.meta.bytes,
    contentType: persisted.meta.contentType,
    httpStatus: persisted.meta.httpStatus,
    etag: live.etag,
    lastModified: live.lastModified,
  });

  return {
    meta: captureMeta,
    bodyBytes: live.bodyBytes,
  };
}
