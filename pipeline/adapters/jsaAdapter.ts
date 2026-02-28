import { load } from 'cheerio';

import { ParseError, SchemaError } from '../staged/stagedErrors.ts';
import { StagedRikishiJSASchema, type StagedRikishiJSA } from '../staged/stagedTypes.ts';
import type { SnapshotMeta } from '../snapshots/snapshotTypes.ts';

type SnapshotInput = { meta: SnapshotMeta; bodyBytes: Buffer };

function parseJsonRows(snapshot: SnapshotInput): StagedRikishiJSA[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot.bodyBytes.toString('utf8'));
  } catch {
    throw new ParseError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'Invalid JSON in JSA snapshot body',
    });
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : (parsed && typeof parsed === 'object' ? [parsed] : []);

  if (!rows.length) {
    throw new SchemaError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'Expected JSA JSON profile rows',
    });
  }

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    const officialImageUrl = typeof item.officialImageUrl === 'string' && item.officialImageUrl.trim()
      ? item.officialImageUrl.trim()
      : undefined;
    return StagedRikishiJSASchema.parse({
      rikishiId: item.rikishiId ?? item.id ?? item.rid,
      shikona: item.shikona ?? item.title,
      heya: item.heya,
      officialImageUrl,
      snapshotSha256: snapshot.meta.contentSha256,
      snapshotUrl: snapshot.meta.url,
    });
  });
}

function parseHtmlRows(snapshot: SnapshotInput): StagedRikishiJSA[] {
  const html = snapshot.bodyBytes.toString('utf8');
  const $ = load(html);
  const rows: StagedRikishiJSA[] = [];

  $('table#banzuke tbody tr').each((_idx, tr) => {
    const tds = $(tr).find('td');
    const record = {
      rikishiId: $(tds[0]).text().trim(),
      shikona: $(tds[1]).text().trim(),
      heya: $(tds[2]).text().trim(),
      bashoId: $(tds[3]).text().trim(),
      division: $(tds[4]).text().trim().toLowerCase(),
      rankValue: Number($(tds[5]).text().trim()),
      side: $(tds[6]).text().trim().toLowerCase(),
      officialImageUrl: $(tds[7]).text().trim() || undefined,
      snapshotSha256: snapshot.meta.contentSha256,
      snapshotUrl: snapshot.meta.url,
    };

    rows.push(StagedRikishiJSASchema.parse(record));
  });

  if (!rows.length) {
    throw new SchemaError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'Expected #banzuke table rows in JSA HTML snapshot',
    });
  }

  return rows;
}

export function parse(snapshot: SnapshotInput): StagedRikishiJSA[] {
  const ctype = snapshot.meta.contentType.toLowerCase();
  if (ctype.includes('html')) return parseHtmlRows(snapshot);
  if (ctype.includes('json')) return parseJsonRows(snapshot);

  throw new ParseError({
    source: snapshot.meta.source,
    snapshotSha256: snapshot.meta.contentSha256,
    url: snapshot.meta.url,
    message: `Unsupported JSA snapshot contentType: ${snapshot.meta.contentType}`,
  });
}
