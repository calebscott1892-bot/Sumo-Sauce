import { ParseError, SchemaError } from '../staged/stagedErrors.ts';
import { StagedImageWikimediaSchema, type StagedImageWikimedia } from '../staged/stagedTypes.ts';
import type { SnapshotMeta } from '../snapshots/snapshotTypes.ts';

type SnapshotInput = { meta: SnapshotMeta; bodyBytes: Buffer };

function toRows(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.images)) return obj.images;
    if (obj.file || obj.wikimediaFile) return [obj];
  }
  return [];
}

export function parse(snapshot: SnapshotInput): StagedImageWikimedia[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot.bodyBytes.toString('utf8'));
  } catch {
    throw new ParseError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'Invalid JSON in Wikimedia snapshot body',
    });
  }

  const rows = toRows(parsed);
  if (!rows.length) {
    throw new SchemaError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'Expected Wikimedia rows at images[] or root object',
    });
  }

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return StagedImageWikimediaSchema.parse({
      wikimediaFile: item.wikimediaFile ?? item.file,
      imageUrl: item.imageUrl ?? item.url,
      snapshotSha256: snapshot.meta.contentSha256,
      snapshotUrl: snapshot.meta.url,
    });
  });
}
