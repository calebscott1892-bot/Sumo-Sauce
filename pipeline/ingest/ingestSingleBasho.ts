import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

import { parse as parseJsa } from '../adapters/jsaAdapter.ts';
import { parse as parseSumodbBouts } from '../adapters/sumodbBoutsAdapter.ts';
import { parse as parseSumodb } from '../adapters/sumodbAdapter.ts';
import { canonicalizeBanzuke } from '../canonicalize/canonicalizeBanzuke.ts';
import { canonicalizeBouts } from '../canonicalize/canonicalizeBouts.ts';
import { canonicalizeRikishi } from '../canonicalize/canonicalizeRikishi.ts';
import { sha256Hex, stableStringify } from '../hash.ts';
import { IngestError } from './ingestErrors.ts';
import { ingestConfig, type IngestMode } from './ingestConfig.ts';
import { fetchSnapshot } from './fetcher.ts';
import { detectJsaBlockedOrInterstitial } from './jsaBlocked.ts';
import { BOUT_DIVISIONS, requiredSnapshotsForBasho } from './sources.ts';
import { sortBasho } from '../order.ts';
import type { SnapshotMeta } from '../snapshots/snapshotTypes.ts';
import { BashoSchema, DivisionSchema, FixtureBoutSchema, type Basho, type Division, type FixtureBout } from '../types.ts';
import { writeStagedOutputs, type StagedOutputs } from '../staged/stagedWriters.ts';
import { ParseError, SchemaError } from '../staged/stagedErrors.ts';

type Source = 'sumodb' | 'jsa' | 'wikipedia' | 'wikimedia';

type PersistedSnapshot = {
  source: Source;
  kind: string;
  meta: SnapshotMeta;
  bodyBytes: Buffer;
};

export type IngestSingleBashoSummary = {
  bashoId: string;
  snapshotCount: number;
  stagedCount: number;
  canonicalCount: number;
  warningCount: number;
  buildId: string;
  outputDir: string;
};

async function writeAtomic(filePath: string, bytes: Buffer): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(tempPath, bytes);
  await rename(tempPath, filePath);
}

async function writeJsonl(filePath: string, rows: Array<Record<string, unknown>>): Promise<void> {
  const text = rows.map((row) => `${stableStringify(row)}\n`).join('');
  await writeAtomic(filePath, Buffer.from(text, 'utf8'));
}

function parseYearMonth(bashoId: string): { year: number; month: number } {
  return {
    year: Number(bashoId.slice(0, 4)),
    month: Number(bashoId.slice(4, 6)),
  };
}

function fetchedAtFor(bashoId: string): string {
  const { year, month } = parseYearMonth(bashoId);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
}

function normalizeName(value: string): string {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

type AliasWindow = { fromBashoId?: string; toBashoId?: string };

function isBashoWithinWindow(bashoId: string, window: AliasWindow): boolean {
  const from = String(window.fromBashoId || '').trim();
  const to = String(window.toBashoId || '').trim();
  if (from && bashoId < from) return false;
  if (to && bashoId > to) return false;
  return true;
}

function extractActiveSumodbRikishiIds(bodyBytes: Buffer): Set<string> {
  const html = bodyBytes.toString('utf8');
  const $ = load(html);
  const out = new Set<string>();
  const activeRankPrefix = /^(Y|O|S|K|M|J|Ms|Sd|Jd|Jk)\d+[ew]\s+/i;

  $('a[href*="Rikishi.aspx?r="]').each((_idx, a) => {
    const href = String($(a).attr('href') || '');
    const text = String($(a).text() || '').trim();
    if (!activeRankPrefix.test(text)) return;
    const m = href.match(/[?&]r=(\d+)/i);
    if (!m) return;
    out.add(String(m[1]));
  });

  return out;
}

function extractSumodbBashoRoster(bodyBytes: Buffer): {
  uniqueIdByShikona: Map<string, string>;
  ambiguousIdsByShikona: Map<string, string[]>;
} {
  const html = bodyBytes.toString('utf8');
  const $ = load(html);
  const activeRankPrefix = /^(Y|O|S|K|M|J|Ms|Sd|Jd|Jk)\d+[ew]\s+/i;
  const idsByShikona = new Map<string, Set<string>>();

  $('a[href*="Rikishi.aspx?r="]').each((_idx, a) => {
    const href = String($(a).attr('href') || '');
    const text = String($(a).text() || '').trim();
    if (!activeRankPrefix.test(text)) return;

    const idMatch = href.match(/[?&]r=(\d+)/i);
    if (!idMatch) return;
    const rikishiId = String(idMatch[1]).trim();
    if (!rikishiId) return;

    const shikonaText = text.replace(activeRankPrefix, '').trim();
    const shikona = normalizeName(shikonaText);
    if (!shikona) return;

    const set = idsByShikona.get(shikona) || new Set<string>();
    set.add(rikishiId);
    idsByShikona.set(shikona, set);
  });

  const uniqueIdByShikona = new Map<string, string>();
  const ambiguousIdsByShikona = new Map<string, string[]>();
  for (const [shikona, ids] of idsByShikona.entries()) {
    const sortedIds = [...ids].sort();
    if (sortedIds.length === 1) {
      uniqueIdByShikona.set(shikona, sortedIds[0]);
      continue;
    }
    ambiguousIdsByShikona.set(shikona, sortedIds);
  }

  return { uniqueIdByShikona, ambiguousIdsByShikona };
}

function dedupeBashoRefs(rows: Array<{ sourceRefs?: Array<{ source: string; snapshotSha256: string; url: string }> }>): Array<{ source: string; snapshotSha256: string; url: string }> {
  const seen = new Set<string>();
  const out: Array<{ source: string; snapshotSha256: string; url: string }> = [];

  for (const row of rows) {
    for (const ref of row.sourceRefs || []) {
      const key = `${ref.source}:${ref.snapshotSha256}:${ref.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(ref);
    }
  }

  return out.sort(
    (a, b) =>
      a.source.localeCompare(b.source)
      || a.snapshotSha256.localeCompare(b.snapshotSha256)
      || a.url.localeCompare(b.url)
  );
}

function toIngestError(err: unknown, fallback: { bashoId: string; source?: string; url?: string }): IngestError {
  const e: any = err;
  if (e?.name === 'IngestError') return e as IngestError;

  if (e?.name === 'ParseError') {
    const pe = e as ParseError;
    return new IngestError({
      code: 'PARSE_FAILED',
      message: pe.message,
      source: pe.source,
      url: pe.url,
      bashoId: fallback.bashoId,
      details: `snapshotSha256=${pe.snapshotSha256}`,
    });
  }

  if (e?.name === 'SchemaError') {
    const se = e as SchemaError;
    return new IngestError({
      code: 'VALIDATION_FAILED',
      message: se.message,
      source: se.source,
      url: se.url,
      bashoId: fallback.bashoId,
      details: `snapshotSha256=${se.snapshotSha256}`,
    });
  }

  return new IngestError({
    code: 'VALIDATION_FAILED',
    message: String(e?.message || e || 'Unknown ingestion failure'),
    source: fallback.source,
    url: fallback.url,
    bashoId: fallback.bashoId,
  });
}

export async function ingestSingleBasho(
  bashoId: string,
  opts?: { mode?: IngestMode }
): Promise<IngestSingleBashoSummary> {
  const mode = opts?.mode || ingestConfig.mode;
  const required = requiredSnapshotsForBasho(bashoId);
  const persisted: PersistedSnapshot[] = [];

  for (const snap of required) {
    try {
      const fetched = await fetchSnapshot({
        source: snap.source,
        url: snap.url,
        contentTypeHint: snap.contentTypeHint,
        kind: snap.kind,
        bashoId,
        mode,
        fixturesDir: ingestConfig.fixturesDir,
        userAgent: ingestConfig.userAgent,
        timeoutMs: ingestConfig.timeoutMs,
        rateLimitMs: ingestConfig.rateLimitMs,
      });

      persisted.push({
        source: snap.source,
        kind: snap.kind,
        meta: fetched.meta,
        bodyBytes: fetched.bodyBytes,
      });
    } catch (err) {
      throw toIngestError(err, { bashoId, source: snap.source, url: snap.url });
    }
  }

  const staged: StagedOutputs = {
    sumodbRikishi: [],
    jsaRikishi: [],
    wikipediaRikishi: [],
    wikimediaImages: [],
  };
  const parsedBouts = [] as Array<{
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
  }>;
  const warnings: IngestError[] = [];
  const rosterNumericIdByShikona = new Map<string, string>();
  const rosterAmbiguousNumericIdsByShikona = new Map<string, string[]>();

  for (const item of persisted) {
    try {
      if (item.source === 'sumodb' && item.kind === 'rikishi') {
        staged.sumodbRikishi.push(...parseSumodb({ meta: item.meta, bodyBytes: item.bodyBytes }));
        const roster = extractSumodbBashoRoster(item.bodyBytes);
        for (const [shikona, id] of roster.uniqueIdByShikona.entries()) {
          const existing = rosterNumericIdByShikona.get(shikona);
          if (!existing) {
            rosterNumericIdByShikona.set(shikona, id);
            continue;
          }
          if (existing !== id) {
            const ids = [...new Set([existing, id, ...(rosterAmbiguousNumericIdsByShikona.get(shikona) || [])])].sort();
            rosterAmbiguousNumericIdsByShikona.set(shikona, ids);
            rosterNumericIdByShikona.delete(shikona);
          }
        }
        for (const [shikona, ids] of roster.ambiguousIdsByShikona.entries()) {
          const existingUnique = rosterNumericIdByShikona.get(shikona);
          const merged = [...new Set([...(ids || []), ...(rosterAmbiguousNumericIdsByShikona.get(shikona) || []), ...(existingUnique ? [existingUnique] : [])])].sort();
          rosterAmbiguousNumericIdsByShikona.set(shikona, merged);
          rosterNumericIdByShikona.delete(shikona);
        }
      }
      if (item.source === 'jsa' && item.kind === 'banzuke') {
        const blocked = detectJsaBlockedOrInterstitial({ meta: item.meta, bodyBytes: item.bodyBytes });
        if (blocked.blocked) {
          warnings.push(new IngestError({
            code: 'SOURCE_BLOCKED',
            message: `JSA banzuke source appears blocked/interstitial (${blocked.reason || 'unknown'})`,
            source: item.source,
            url: item.meta.url,
            bashoId,
            details: `bytes=${item.bodyBytes.byteLength} sha=${item.meta.contentSha256}`,
          }));
          continue;
        }
        try {
          staged.jsaRikishi.push(...parseJsa({ meta: item.meta, bodyBytes: item.bodyBytes }));
        } catch (err) {
          const warning = toIngestError(err, {
            bashoId,
            source: item.source,
            url: item.meta.url,
          });
          warnings.push(warning);
        }
      }
      if (item.source === 'sumodb' && item.kind.startsWith('bouts.')) {
        const divisionKey = item.kind.slice('bouts.'.length);
        const division = DivisionSchema.parse(divisionKey);
        if (BOUT_DIVISIONS.includes(division)) {
          parsedBouts.push(...parseSumodbBouts({ meta: item.meta, bodyBytes: item.bodyBytes }, { division }));
        }
      }
    } catch (err) {
      throw toIngestError(err, {
        bashoId,
        source: item.source,
        url: item.meta.url,
      });
    }
  }

  const outputDir = path.join(ingestConfig.outputDir, bashoId);
  const stagedOut = await writeStagedOutputs(outputDir, staged);

  const canonicalRikishi = canonicalizeRikishi({
    sumodb: staged.sumodbRikishi,
    jsa: staged.jsaRikishi,
    wikipedia: staged.wikipediaRikishi,
    wikimedia: staged.wikimediaImages,
  });

  const rikishiById = new Map<string, string>();
  const shikonaByRikishiId = new Map<string, string>();
  const shikonaToIds = new Map<string, Set<string>>();
  for (const row of canonicalRikishi) {
    const id = String(row.rikishiId || '').trim();
    const shikona = normalizeName(row.shikona);
    if (!id || !shikona) continue;

    rikishiById.set(id, id);
    shikonaByRikishiId.set(id, shikona);
    const existing = shikonaToIds.get(shikona) || new Set<string>();
    existing.add(id);
    shikonaToIds.set(shikona, existing);
  }

  const canonicalBanzuke = canonicalizeBanzuke({
    jsa: staged.jsaRikishi.filter((r) => r.bashoId === bashoId),
    rikishiIdByShikona: new Map(
      [...shikonaToIds.entries()]
        .map(([shikona, ids]) => ({ shikona, ids: [...ids].sort() }))
        .filter((x) => x.ids.length === 1)
        .map((x) => [x.shikona, x.ids[0]])
    ),
  });

  const aliasWindowsByShikona = new Map<string, Map<string, AliasWindow[]>>();
  for (const entry of canonicalBanzuke) {
    const id = String(entry.rikishiId || '').trim();
    const shikona = shikonaByRikishiId.get(id);
    if (!id || !shikona) continue;

    const byId = aliasWindowsByShikona.get(shikona) || new Map<string, AliasWindow[]>();
    const windows = byId.get(id) || [];
    windows.push({ fromBashoId: bashoId, toBashoId: bashoId });
    byId.set(id, windows);
    aliasWindowsByShikona.set(shikona, byId);
  }

  const mapMisses: string[] = [];
  const idMapMisses: string[] = [];
  const ambiguousMapMisses: string[] = [];

  function candidatesForShikona(shikona: string): string[] {
    const key = normalizeName(shikona);
    const all = [...(shikonaToIds.get(key) || new Set<string>())].sort();
    if (all.length <= 1) return all;

    const byId = aliasWindowsByShikona.get(key);
    if (!byId) return all;

    const filtered = all.filter((id) => {
      const windows = byId.get(id) || [];
      if (!windows.length) return false;
      return windows.some((w) => isBashoWithinWindow(bashoId, w));
    });

    return filtered.length ? filtered : all;
  }

  function resolveRikishiId(
    side: 'east' | 'west' | 'winner',
    sumodbId: string | undefined,
    shikona: string | undefined,
    context: string,
    opts?: { requireNumericId?: boolean }
  ): string | undefined {
    const explicitId = String(sumodbId || '').trim();
    if (explicitId) {
      const mapped = rikishiById.get(explicitId);
      if (mapped) return mapped;
      idMapMisses.push(`${context}:${side}:sumodbId=${explicitId}`);
      return undefined;
    }

    if (opts?.requireNumericId) {
      idMapMisses.push(`${context}:${side}:missing-sumodb-id`);
      return undefined;
    }

    const key = normalizeName(String(shikona || ''));
    if (!key) {
      mapMisses.push(`${context}:${side}:empty-shikona`);
      return undefined;
    }

    const rosterAmbiguous = rosterAmbiguousNumericIdsByShikona.get(key);
    if (rosterAmbiguous?.length) {
      ambiguousMapMisses.push(`${context}:${side}:${String(shikona)}=>[${rosterAmbiguous.join(',')}]`);
      return undefined;
    }

    const rosterNumericId = rosterNumericIdByShikona.get(key);
    if (rosterNumericId) {
      const mapped = rikishiById.get(rosterNumericId);
      if (mapped) return mapped;
      idMapMisses.push(`${context}:${side}:rosterSumodbId=${rosterNumericId}`);
      return undefined;
    }

    const candidates = candidatesForShikona(String(shikona || ''));
    if (candidates.length > 1) {
      ambiguousMapMisses.push(`${context}:${side}:${String(shikona)}=>[${candidates.join(',')}]`);
      return undefined;
    }

    const mapped = candidates[0];
    if (!mapped) {
      mapMisses.push(`${context}:${side}:${String(shikona)}`);
      return undefined;
    }

    return mapped;
  }

  const fixtureBouts: FixtureBout[] = parsedBouts.flatMap((row) => {
    const context = `${row.division}:day${row.day}:bout${row.boutNo}`;
    const requireNumericIds = /\/Results\.aspx(?:\?|$)/i.test(String(row.source.url || ''));

    const eastRikishiId = resolveRikishiId('east', row.eastSumodbRikishiId, row.eastShikona, context, {
      requireNumericId: requireNumericIds,
    });
    const westRikishiId = resolveRikishiId('west', row.westSumodbRikishiId, row.westShikona, context, {
      requireNumericId: requireNumericIds,
    });
    if (!eastRikishiId || !westRikishiId) {
      return [];
    }

    let winnerRikishiId: string | undefined;
    if (row.winnerShikona || row.winnerSumodbRikishiId) {
      const winner = resolveRikishiId('winner', row.winnerSumodbRikishiId, row.winnerShikona, context, {
        requireNumericId: requireNumericIds,
      });
      if (!winner || (winner !== eastRikishiId && winner !== westRikishiId)) {
        mapMisses.push(`${context}:winner:${String(row.winnerShikona || row.winnerSumodbRikishiId || '')}`);
        return [];
      }
      winnerRikishiId = winner;
    }

    return [
      FixtureBoutSchema.parse({
        bashoId,
        day: row.day,
        division: row.division,
        boutNo: row.boutNo,
        eastRikishiId,
        westRikishiId,
        winnerRikishiId,
        kimariteId: row.kimariteId || undefined,
        sourceRefs: [
          {
            source: row.source.source,
            snapshotSha256: row.source.snapshotSha256,
            url: row.source.url,
            refType: 'match',
          },
        ],
      }),
    ];
  });
  if (idMapMisses.length) {
    throw new IngestError({
      code: 'SUMODB_ID_MAP_MISS',
      message: 'Unable to map SumoDB numeric rikishi ID to canonical rikishiId',
      source: 'sumodb',
      bashoId,
      details: idMapMisses.slice(0, 25).join(' | '),
    });
  }
  if (ambiguousMapMisses.length) {
    throw new IngestError({
      code: 'SHIKONA_MAP_AMBIGUOUS',
      message: 'Ambiguous shikona mapped to multiple canonical rikishiId values',
      source: 'sumodb',
      bashoId,
      details: ambiguousMapMisses.slice(0, 25).join(' | '),
    });
  }
  if (mapMisses.length) {
    throw new IngestError({
      code: 'SHIKONA_MAP_MISS',
      message: 'Unable to map bout shikona to canonical rikishiId',
      source: 'sumodb',
      bashoId,
      details: mapMisses.slice(0, 25).join(' | '),
    });
  }
  const canonicalBouts = canonicalizeBouts({ fixtureBouts });
  const bashoSourceRefs = dedupeBashoRefs([
    ...canonicalBanzuke,
    ...canonicalBouts,
  ]);

  const canonicalBasho = sortBasho([
    BashoSchema.parse({
      bashoId,
      label: `Basho ${bashoId}`,
      sourceRefs: bashoSourceRefs.length ? bashoSourceRefs : undefined,
    }) as Basho,
  ]);

  const canonicalDir = path.join(outputDir, 'canonical');
  await mkdir(canonicalDir, { recursive: true });

  await writeJsonl(
    path.join(canonicalDir, 'rikishi.jsonl'),
    canonicalRikishi as unknown as Array<Record<string, unknown>>
  );
  await writeJsonl(
    path.join(canonicalDir, 'basho.jsonl'),
    canonicalBasho as unknown as Array<Record<string, unknown>>
  );
  await writeJsonl(
    path.join(canonicalDir, 'banzuke_entries.jsonl'),
    canonicalBanzuke as unknown as Array<Record<string, unknown>>
  );
  await writeJsonl(
    path.join(canonicalDir, 'bouts.jsonl'),
    canonicalBouts as unknown as Array<Record<string, unknown>>
  );
  await writeJsonl(path.join(canonicalDir, 'kimarite.jsonl'), []);

  const snapshotShas = persisted.map((p) => p.meta.contentSha256).sort();
  const buildId = sha256Hex(stableStringify({ bashoId, snapshotShas, fetchedAt: fetchedAtFor(bashoId) }));

  const stagedCount =
    staged.sumodbRikishi.length
    + staged.jsaRikishi.length
    + staged.wikipediaRikishi.length
    + staged.wikimediaImages.length;

  const canonicalCount = canonicalRikishi.length + canonicalBasho.length + canonicalBanzuke.length + canonicalBouts.length;

  for (const warning of warnings) {
    process.stderr.write(`[ingest-warning] ${stableStringify({
      code: warning.code,
      bashoId,
      source: warning.source,
      url: warning.url,
      message: warning.message,
      details: warning.details,
    })}\n`);
  }

  return {
    bashoId,
    snapshotCount: persisted.length,
    stagedCount,
    canonicalCount,
    warningCount: warnings.length,
    buildId,
    outputDir,
  };
}
