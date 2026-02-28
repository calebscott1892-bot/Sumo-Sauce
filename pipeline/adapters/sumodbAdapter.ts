import { load } from 'cheerio';

import { StagedRikishiSumoDBSchema, type StagedRikishiSumoDB } from '../staged/stagedTypes.ts';
import { ParseError, SchemaError } from '../staged/stagedErrors.ts';
import type { SnapshotMeta } from '../snapshots/snapshotTypes.ts';

type SnapshotInput = { meta: SnapshotMeta; bodyBytes: Buffer };

function cleanText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function isLikelyDateToken(value: string): boolean {
  return /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(value) || /^\d{4}[./-]\d{2}$/.test(value);
}

function parseTitleMeta(title: string): { heya?: string; nationality?: string } {
  const parts = cleanText(title)
    .split(',')
    .map((x) => cleanText(x))
    .filter(Boolean);

  if (!parts.length) return {};

  const candidates = parts.slice(1).filter((x) => !isLikelyDateToken(x));
  const heya = candidates[0] || undefined;
  const nationality = candidates.find((x) => /^[A-Za-z\s-]{2,}$/.test(x) && x !== heya) || undefined;
  return { heya, nationality };
}

function toRows(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.rikishi)) return obj.rikishi;
    if (obj.id || obj.rikishiId || obj.shikona) return [obj];
  }
  return [];
}

function parseHtmlRows(snapshot: SnapshotInput): StagedRikishiSumoDB[] {
  const html = snapshot.bodyBytes.toString('utf8');
  const $ = load(html);
  const rows: StagedRikishiSumoDB[] = [];
  const seen = new Set<string>();

  $('a[href*="Rikishi.aspx?r="]').each((_idx, a) => {
    const href = String($(a).attr('href') || '');
    const idMatch = href.match(/[?&]r=(\d+)/i);
    if (!idMatch) return;

    const rikishiId = idMatch[1];
    if (seen.has(rikishiId)) return;
    seen.add(rikishiId);

    const shikonaRaw = cleanText($(a).text());
    const shikona = shikonaRaw
      .replace(/^(Y|O|S|K|M|J|Ms|Sd|Jd|Jk)\d+[ew]\s+/i, '')
      .trim();
    if (!shikona) return;

    const title = cleanText($(a).attr('title'));
    const titleMeta = parseTitleMeta(title);
    const heya = titleMeta.heya;
    const nationality = titleMeta.nationality;

    let heightCm: number | undefined;
    let weightKg: number | undefined;
    const hw = title.match(/(\d+)\s*cm\s+(\d+)\s*kg/i);
    if (hw) {
      const h = Number(hw[1]);
      const w = Number(hw[2]);
      if (Number.isFinite(h) && h > 0) heightCm = h;
      if (Number.isFinite(w) && w > 0) weightKg = w;
    }

    rows.push(
      StagedRikishiSumoDBSchema.parse({
        rikishiId,
        shikona,
        heya,
        heightCm,
        weightKg,
        nationality,
        snapshotSha256: snapshot.meta.contentSha256,
        snapshotUrl: snapshot.meta.url,
      })
    );
  });

  if (!rows.length) {
    throw new SchemaError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'Expected SumoDB banzuke HTML links to Rikishi.aspx?r=... rows',
    });
  }

  return rows;
}

export function parse(snapshot: SnapshotInput): StagedRikishiSumoDB[] {
  const ctype = snapshot.meta.contentType.toLowerCase();
  if (ctype.includes('html')) {
    return parseHtmlRows(snapshot);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot.bodyBytes.toString('utf8'));
  } catch {
    throw new ParseError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'Invalid JSON in SumoDB snapshot body',
    });
  }

  const rows = toRows(parsed);
  if (!rows.length) {
    throw new SchemaError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'Expected SumoDB snapshot rows at root array or .rikishi[]',
    });
  }

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return StagedRikishiSumoDBSchema.parse({
      rikishiId: item.rikishiId ?? item.id ?? item.rid,
      shikona: item.shikona,
      heya: item.heya,
      heightCm: item.heightCm,
      weightKg: item.weightKg,
      nationality: item.nationality,
      snapshotSha256: snapshot.meta.contentSha256,
      snapshotUrl: snapshot.meta.url,
    });
  });
}
