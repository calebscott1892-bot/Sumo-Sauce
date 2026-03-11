import { load } from 'cheerio';

import { BanzukeEntrySchema, type BanzukeEntry, type Division } from '../types.ts';
import type { SourceRef, SnapshotMeta } from '../snapshots/snapshotTypes.ts';
import { sortBanzukeEntries } from '../order.ts';

type SnapshotInput = { meta: SnapshotMeta; bodyBytes: Buffer };

/**
 * Map SumoDB rank-prefix letters to canonical division names.
 * Prefixes from Banzuke.aspx link text: Y, O, S, K, M, J, Ms, Sd, Jd, Jk
 */
const PREFIX_TO_DIVISION: Record<string, Division> = {
  y: 'makuuchi',
  o: 'makuuchi',
  s: 'makuuchi',
  k: 'makuuchi',
  m: 'makuuchi',
  j: 'juryo',
  ms: 'makushita',
  sd: 'sandanme',
  jd: 'jonidan',
  jk: 'jonokuchi',
};

/**
 * Map SumoDB rank-prefix letters to human-readable rank labels.
 */
const PREFIX_TO_LABEL: Record<string, string> = {
  y: 'Yokozuna',
  o: 'Ozeki',
  s: 'Sekiwake',
  k: 'Komusubi',
  m: 'Maegashira',
  j: 'Juryo',
  ms: 'Makushita',
  sd: 'Sandanme',
  jd: 'Jonidan',
  jk: 'Jonokuchi',
};

/**
 * Ordinal position of each makuuchi sub-rank in banzuke row order.
 * Used to compute a sequential rankValue across Y/O/S/K/M prefixes
 * that all share the 'makuuchi' division.
 *
 * For non-makuuchi divisions only one prefix maps per division,
 * so the raw number from the prefix IS the rankValue.
 */
const MAKUUCHI_PREFIX_ORDER: Record<string, number> = {
  y: 0,
  o: 1,
  s: 2,
  k: 3,
  m: 4,
};

type RawEntry = {
  prefix: string;
  number: number;
  side: 'east' | 'west';
  rikishiId: string;
  division: Division;
};

/**
 * Compute a stable sort key for a makuuchi entry.
 * Yokozuna comes first, then Ozeki, Sekiwake, Komusubi, Maegashira.
 * Within each sub-rank, lower numbers come first.
 */
function makuuchiSortKey(prefix: string, number: number): number {
  const order = MAKUUCHI_PREFIX_ORDER[prefix] ?? 99;
  return order * 1000 + number;
}

/**
 * Parse a SumoDB Banzuke.aspx HTML snapshot to extract banzuke entries.
 *
 * Link text format: `{RankPrefix}{Number}{Side} {Shikona}`
 *   e.g. "Y1e Terunofuji", "M14w Shonannoumi", "Jd43e Fujinoumi"
 *
 * Each `<a href="Rikishi.aspx?r=NNN">` carries a unique SumoDB rikishi ID
 * in the URL param. Rikishi that appear in multiple links (e.g. award
 * section repeats) are de-duplicated by rikishiId.
 *
 * rankValue assignment:
 * - For makuuchi, a sequential position is computed across Y/O/S/K/M so
 *   that Y1→1, O1→(maxY+1), S1→(maxY+maxO+1), etc.  East and west of
 *   the same row share the same rankValue.
 * - For other divisions (juryo, makushita, …) only one prefix exists,
 *   so the raw number from the prefix is used directly.
 */
export function parseSumodbBanzuke(
  snapshot: SnapshotInput,
  opts: { bashoId: string },
): BanzukeEntry[] {
  const html = snapshot.bodyBytes.toString('utf8');
  const $ = load(html);
  const seen = new Set<string>(); // rikishiId dedup key

  // Regex: multi-letter prefix (e.g. Ms, Sd, Jd, Jk) must come first,
  // then single-letter (Y, O, S, K, M, J), followed by digit(s) and e/w.
  const rankRe = /^(Ms|Sd|Jd|Jk|[YOSKMJ])(\d+)([ew])\s+(.+)$/i;

  const ref: SourceRef = {
    source: 'sumodb',
    snapshotSha256: snapshot.meta.contentSha256,
    url: snapshot.meta.url,
    refType: 'banzuke',
  };

  // ── First pass: collect raw entries ──────────────────────────────
  const rawEntries: RawEntry[] = [];

  $('a[href*="Rikishi.aspx?r="]').each((_idx, a) => {
    const href = String($(a).attr('href') || '');
    const idMatch = href.match(/[?&]r=(\d+)/i);
    if (!idMatch) return;

    const rikishiId = String(idMatch[1]).trim();
    if (!rikishiId) return;

    const text = String($(a).text() || '').trim();
    const m = rankRe.exec(text);
    if (!m) return; // non-ranked link (header or awards section)

    // Dedup: same rikishi may appear in awards section with same rank prefix
    if (seen.has(rikishiId)) return;
    seen.add(rikishiId);

    const prefix = m[1].toLowerCase();
    const number = Number(m[2]);
    const sideChar = m[3].toLowerCase();
    const division = PREFIX_TO_DIVISION[prefix];
    if (!division) return;

    rawEntries.push({
      prefix,
      number,
      side: sideChar === 'e' ? 'east' : 'west',
      rikishiId,
      division,
    });
  });

  // ── Second pass: compute rankValue per division ──────────────────
  // For makuuchi we need a sequential position across Y/O/S/K/M.
  // For other divisions only one prefix exists, so raw number suffices.
  const makuuchiEntries = rawEntries.filter((e) => e.division === 'makuuchi');

  // Collect distinct (prefix, number) sort-keys and assign positions
  const makuuchiKeys = [
    ...new Set(makuuchiEntries.map((e) => makuuchiSortKey(e.prefix, e.number))),
  ].sort((a, b) => a - b);

  const makuuchiPositionByKey = new Map<number, number>();
  makuuchiKeys.forEach((key, idx) => {
    makuuchiPositionByKey.set(key, idx + 1); // 1-based
  });

  // ── Build BanzukeEntry array ─────────────────────────────────────
  const out: BanzukeEntry[] = [];

  for (const entry of rawEntries) {
    const labelPrefix = PREFIX_TO_LABEL[entry.prefix] || entry.prefix;
    const rankLabel = `${labelPrefix} ${entry.number}`;

    const rankValue =
      entry.division === 'makuuchi'
        ? makuuchiPositionByKey.get(makuuchiSortKey(entry.prefix, entry.number))!
        : entry.number;

    out.push(
      BanzukeEntrySchema.parse({
        bashoId: opts.bashoId,
        division: entry.division,
        rankValue,
        side: entry.side,
        rikishiId: entry.rikishiId,
        rankLabel,
        sourceRefs: [ref],
      }),
    );
  }

  return sortBanzukeEntries(out);
}
