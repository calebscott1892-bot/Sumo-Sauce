import { load } from 'cheerio';

import { ParseError, SchemaError } from '../staged/stagedErrors.ts';
import type { SnapshotMeta } from '../snapshots/snapshotTypes.ts';
import type { Division } from '../types.ts';

type SnapshotInput = { meta: SnapshotMeta; bodyBytes: Buffer };

export type ParsedSumodbBoutRow = {
  day: number;
  division: Division;
  boutNo: number;
  eastShikona: string;
  eastSumodbRikishiId?: string;
  westShikona: string;
  westSumodbRikishiId?: string;
  winnerShikona?: string;
  winnerSumodbRikishiId?: string;
  kimariteId?: string;
  source: {
    source: 'sumodb';
    snapshotSha256: string;
    url: string;
  };
};

function asText(value: unknown): string {
  return String(value ?? '').trim();
}

function asInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normalizeDivision(value: unknown): Division | '' {
  const v = asText(value).toLowerCase();
  if (
    v === 'makuuchi'
    || v === 'juryo'
    || v === 'makushita'
    || v === 'sandanme'
    || v === 'jonidan'
    || v === 'jonokuchi'
  ) {
    return v;
  }
  return '';
}

function divisionFromRank(rank: string): Division | '' {
  const v = asText(rank);
  if (/^(Y|O|S|K|M)\d+[ew]$/i.test(v)) return 'makuuchi';
  if (/^J\d+[ew]$/i.test(v)) return 'juryo';
  if (/^Ms\d+[ew]$/i.test(v)) return 'makushita';
  if (/^Sd\d+[ew]$/i.test(v)) return 'sandanme';
  if (/^Jd\d+[ew]$/i.test(v)) return 'jonidan';
  if (/^Jk\d+[ew]$/i.test(v)) return 'jonokuchi';
  return '';
}

function extractRikishiIdFromHref(href: string): string | undefined {
  const m = String(href || '').match(/[?&]r=(\d+)/i);
  return m?.[1] ? String(m[1]) : undefined;
}

function toRows(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const candidates = ['bouts', 'matches', 'torikumi', 'records', 'results', 'data'];
    for (const key of candidates) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }

    if (obj.east || obj.west || obj.eastRikishiId || obj.westRikishiId) return [obj];
  }
  return [];
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
      return obj[key];
    }
  }
  return undefined;
}

function normalizedId(value: unknown): string | undefined {
  const digits = String(value ?? '').match(/\d+/)?.[0] || '';
  return digits || undefined;
}

function parseJsonRows(snapshot: SnapshotInput, input: { division: Division }): ParsedSumodbBoutRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot.bodyBytes.toString('utf8'));
  } catch {
    throw new ParseError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'Invalid JSON in SumoDB bouts snapshot body',
    });
  }

  const rows = toRows(parsed);
  if (!rows.length) {
    throw new SchemaError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'Expected SumoDB bouts rows at root array or known array key',
    });
  }

  const out: ParsedSumodbBoutRow[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;

    const divisionRaw = pick(item, ['division', 'Division']) || input.division;
    const division = normalizeDivision(divisionRaw);

    const day = asInt(pick(item, ['day', 'Day', 'torikumiDay', 'nDay']));
    const boutNo = asInt(pick(item, ['boutNo', 'BoutNo', 'matchNo', 'MatchNo', 'no', 'No', 'bout']));

    const eastShikona = asText(pick(item, ['eastShikona', 'EastShikona', 'east', 'East', 'eastName', 'EastName']));
    const westShikona = asText(pick(item, ['westShikona', 'WestShikona', 'west', 'West', 'westName', 'WestName']));
    const eastSumodbRikishiId = normalizedId(pick(item, ['eastRikishiId', 'EastRikishiId', 'eastId', 'east_id']));
    const westSumodbRikishiId = normalizedId(pick(item, ['westRikishiId', 'WestRikishiId', 'westId', 'west_id']));

    let winnerShikona = asText(
      pick(item, ['winnerShikona', 'WinnerShikona', 'winner', 'Winner', 'winnerName', 'WinnerName'])
    );
    const winnerSumodbRikishiId = normalizedId(
      pick(item, ['winnerRikishiId', 'WinnerRikishiId', 'winnerId', 'winner_id'])
    );
    if (winnerShikona && winnerShikona !== eastShikona && winnerShikona !== westShikona) {
      winnerShikona = '';
    }

    const kimariteId = asText(pick(item, ['kimariteId', 'KimariteId', 'kimarite', 'Kimarite', 'decision', 'technique']));

    if (!day || day < 1 || day > 15 || !boutNo || !eastShikona || !westShikona) {
      continue;
    }

    if (!division) {
      continue;
    }

    out.push({
      day,
      division,
      boutNo,
      eastShikona,
      eastSumodbRikishiId,
      westShikona,
      westSumodbRikishiId,
      winnerShikona: winnerShikona || undefined,
      winnerSumodbRikishiId,
      kimariteId: kimariteId || undefined,
      source: {
        source: 'sumodb',
        snapshotSha256: snapshot.meta.contentSha256,
        url: snapshot.meta.url,
      },
    });
  }

  if (!out.length) {
    throw new SchemaError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: 'No valid bout rows found in SumoDB bouts snapshot',
    });
  }

  return out.sort(
    (a, b) =>
      a.division.localeCompare(b.division)
      || a.day - b.day
      || a.boutNo - b.boutNo
      || a.eastShikona.localeCompare(b.eastShikona)
      || a.westShikona.localeCompare(b.westShikona)
  );
}

function parseHtmlRows(snapshot: SnapshotInput, input: { division: Division }): ParsedSumodbBoutRow[] {
  const html = snapshot.bodyBytes.toString('utf8');
  const $ = load(html);
  let day = 1;
  const titleText = asText($('title').first().text()) || asText($('h2').first().text());
  const titleDay = titleText.match(/\bDay\s+(\d+)\b/i);
  if (titleDay) {
    day = Number(titleDay[1]);
  } else {
    const urlDay = String(snapshot.meta.url || '').match(/[?&]d=(\d{1,2})(?:&|$)/i);
    if (urlDay) day = Number(urlDay[1]);
  }
  if (!Number.isFinite(day) || day < 1 || day > 15) {
    throw new SchemaError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: `Invalid day in Results.aspx snapshot: ${String(day)}`,
    });
  }

  const targetDivision = input.division;
  let boutNoByDivision = new Map<Division, number>();
  const out: ParsedSumodbBoutRow[] = [];

  $('tr').each((_idx, tr) => {
    const row = $(tr);
    const eastCell = row.find('td.tk_east').first();
    const westCell = row.find('td.tk_west').first();
    const kimCell = row.find('td.tk_kim').first();
    if (!eastCell.length || !westCell.length || !kimCell.length) return;

    const eastRank = asText(eastCell.find('font').first().text());
    const division = divisionFromRank(eastRank);
    if (!division || division !== targetDivision) return;

    const eastAnchor = eastCell.find('a[href*="Rikishi.aspx?r="]').first();
    const westAnchor = westCell.find('a[href*="Rikishi.aspx?r="]').first();
    const eastHref = asText(eastAnchor.attr('href'));
    const westHref = asText(westAnchor.attr('href'));

    const eastShikona = asText(eastAnchor.text());
    const westShikona = asText(westAnchor.text());
    const eastSumodbRikishiId = extractRikishiIdFromHref(eastHref);
    const westSumodbRikishiId = extractRikishiIdFromHref(westHref);

    if (!eastShikona || !westShikona || !eastSumodbRikishiId || !westSumodbRikishiId) return;

    const kimariteId = asText(kimCell.clone().find('font').remove().end().text()).toLowerCase() || undefined;

    const resultCells = row.find('td.tk_kekka');
    const leftResult = asText(resultCells.eq(0).html() || '');
    const rightResult = asText(resultCells.eq(1).html() || '');

    let winnerShikona: string | undefined;
    let winnerSumodbRikishiId: string | undefined;
    if (/hoshi_kuro/i.test(leftResult)) {
      winnerShikona = eastShikona;
      winnerSumodbRikishiId = eastSumodbRikishiId;
    } else if (/hoshi_kuro/i.test(rightResult)) {
      winnerShikona = westShikona;
      winnerSumodbRikishiId = westSumodbRikishiId;
    }

    const nextBoutNo = (boutNoByDivision.get(division) || 0) + 1;
    boutNoByDivision.set(division, nextBoutNo);

    out.push({
      day,
      division,
      boutNo: nextBoutNo,
      eastShikona,
      eastSumodbRikishiId,
      westShikona,
      westSumodbRikishiId,
      winnerShikona,
      winnerSumodbRikishiId,
      kimariteId,
      source: {
        source: 'sumodb',
        snapshotSha256: snapshot.meta.contentSha256,
        url: snapshot.meta.url,
      },
    });
  });

  if (!out.length) {
    throw new SchemaError({
      source: snapshot.meta.source,
      snapshotSha256: snapshot.meta.contentSha256,
      url: snapshot.meta.url,
      message: `No parseable ${targetDivision} rows found in Results.aspx snapshot`,
    });
  }

  return out.sort(
    (a, b) =>
      a.division.localeCompare(b.division)
      || a.day - b.day
      || a.boutNo - b.boutNo
      || a.eastShikona.localeCompare(b.eastShikona)
      || a.westShikona.localeCompare(b.westShikona)
  );
}

export function parse(snapshot: SnapshotInput, input: { division: Division }): ParsedSumodbBoutRow[] {
  const ctype = snapshot.meta.contentType.toLowerCase();
  if (ctype.includes('html')) {
    return parseHtmlRows(snapshot, input);
  }
  return parseJsonRows(snapshot, input);
}
