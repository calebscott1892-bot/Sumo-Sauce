#!/usr/bin/env node
import { ingestConfig } from '../pipeline/ingest/ingestConfig.ts';
import { fetchSnapshot } from '../pipeline/ingest/fetcher.ts';
import { requiredSnapshotsForBasho } from '../pipeline/ingest/sources.ts';
import { parse as parseJsa } from '../pipeline/adapters/jsaAdapter.ts';
import { parse as parseSumodb } from '../pipeline/adapters/sumodbAdapter.ts';
import { parse as parseSumodbBouts } from '../pipeline/adapters/sumodbBoutsAdapter.ts';
import { canonicalizeRikishi } from '../pipeline/canonicalize/canonicalizeRikishi.ts';
import { DivisionSchema } from '../pipeline/types.ts';

function parseArgs(argv) {
  const out = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1];
    if (value == null || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }
    out.set(key.slice(2), value);
    i += 1;
  }
  return out;
}

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bashoId = String(args.get('basho') || '202403').trim();

  const required = requiredSnapshotsForBasho(bashoId);
  const snapshots = [];

  for (const snap of required) {
    const fetched = await fetchSnapshot({
      source: snap.source,
      url: snap.url,
      contentTypeHint: snap.contentTypeHint,
      kind: snap.kind,
      bashoId,
      mode: 'offline',
      fixturesDir: ingestConfig.fixturesDir,
      userAgent: ingestConfig.userAgent,
      timeoutMs: ingestConfig.timeoutMs,
      rateLimitMs: ingestConfig.rateLimitMs,
    });
    snapshots.push({ ...snap, meta: fetched.meta, bodyBytes: fetched.bodyBytes });
  }

  const staged = {
    sumodbRikishi: [],
    jsaRikishi: [],
    wikipediaRikishi: [],
    wikimediaImages: [],
  };

  const parsedBouts = [];

  for (const item of snapshots) {
    if (item.source === 'sumodb' && item.kind === 'rikishi') {
      staged.sumodbRikishi.push(...parseSumodb({ meta: item.meta, bodyBytes: item.bodyBytes }));
      continue;
    }

    if (item.source === 'jsa' && item.kind === 'banzuke') {
      try {
        staged.jsaRikishi.push(...parseJsa({ meta: item.meta, bodyBytes: item.bodyBytes }));
      } catch {
        // best-effort for diagnostics
      }
      continue;
    }

    if (item.source === 'sumodb' && item.kind.startsWith('bouts.')) {
      const division = DivisionSchema.parse(item.kind.slice('bouts.'.length));
      parsedBouts.push(...parseSumodbBouts({ meta: item.meta, bodyBytes: item.bodyBytes }, { division }));
    }
  }

  const canonicalRikishi = canonicalizeRikishi({
    sumodb: staged.sumodbRikishi,
    jsa: staged.jsaRikishi,
    wikipedia: staged.wikipediaRikishi,
    wikimedia: staged.wikimediaImages,
  });

  const rikishiById = new Map();
  const shikonaToIds = new Map();

  for (const r of canonicalRikishi) {
    const id = String(r.rikishiId || '').trim();
    const key = normalizeName(r.shikona);
    if (!id || !key) continue;
    rikishiById.set(id, id);
    const curr = shikonaToIds.get(key) || new Set();
    curr.add(id);
    shikonaToIds.set(key, curr);
  }

  const rows = [];

  for (const row of parsedBouts) {
    const eastCandidates = [...(shikonaToIds.get(normalizeName(row.eastShikona)) || new Set())].sort();
    const westCandidates = [...(shikonaToIds.get(normalizeName(row.westShikona)) || new Set())].sort();

    const eastNumericFailed = !row.eastSumodbRikishiId || !rikishiById.has(String(row.eastSumodbRikishiId));
    const westNumericFailed = !row.westSumodbRikishiId || !rikishiById.has(String(row.westSumodbRikishiId));

    const eastAmbiguous = eastCandidates.length > 1;
    const westAmbiguous = westCandidates.length > 1;

    if ((eastNumericFailed && eastAmbiguous) || (westNumericFailed && westAmbiguous)) {
      rows.push({
        bashoId,
        division: row.division,
        day: row.day,
        eastShikona: row.eastShikona,
        westShikona: row.westShikona,
        eastCandidates,
        westCandidates,
      });
    }
  }

  rows.sort(
    (a, b) =>
      a.division.localeCompare(b.division)
      || a.day - b.day
      || a.eastShikona.localeCompare(b.eastShikona)
      || a.westShikona.localeCompare(b.westShikona)
  );

  for (const row of rows) {
    process.stdout.write(`${JSON.stringify(row)}\n`);
  }

  process.stdout.write(`${JSON.stringify({ bashoId, totalAmbiguous: rows.length })}\n`);
}

main().catch((err) => {
  process.stderr.write(`${String(err?.stack || err)}\n`);
  process.exit(1);
});
