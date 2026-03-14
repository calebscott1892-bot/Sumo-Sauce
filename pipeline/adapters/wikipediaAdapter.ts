import { ParseError, SchemaError } from '../staged/stagedErrors.ts';
import { StagedRikishiWikipediaSchema, type StagedRikishiWikipedia } from '../staged/stagedTypes.ts';
import type { SnapshotMeta } from '../snapshots/snapshotTypes.ts';

type SnapshotInput = { meta: SnapshotMeta; bodyBytes: Buffer };

function toRows(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (obj.query && typeof obj.query === 'object') {
      const query = obj.query as Record<string, unknown>;
      if (Array.isArray(query.pages)) return query.pages;
    }
    if (obj.title || obj.wikipediaTitle) return [obj];
  }
  return [];
}

export function parse(snapshot: SnapshotInput): StagedRikishiWikipedia[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot.bodyBytes.toString('utf8'));
  } catch {
    throw new ParseError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'Invalid JSON in Wikipedia snapshot body',
    });
  }

  const rows = toRows(parsed);
  if (!rows.length) {
    throw new SchemaError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'Expected MediaWiki-style rows at query.pages[] or root object',
    });
  }

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return StagedRikishiWikipediaSchema.parse({
      rikishiId: item.rikishiId,
      shikona: item.shikona,
      wikipediaTitle: item.wikipediaTitle ?? item.title,
      wikimediaFile: item.wikimediaFile,
      snapshotSha256: snapshot.meta.contentSha256,
      snapshotUrl: snapshot.meta.url,
    });
  });
}
