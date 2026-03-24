#!/usr/bin/env node
/**
 * export-research-batches.mjs
 * ===========================
 * Splits all unresolved/quarantined profiles into targeted research batches,
 * writes them to data/research_exports/, and generates a manifest.
 *
 * Batch plan (priority order):
 *   Q  — Quarantined singleton (1 profile)
 *   A  — Verified-identity unresolved (21 profiles)
 *   B  — Makushita/Sandanme border zone, indices 341–383 (19 profiles)
 *   C  — Upper transition block, indices 392–411 (10 profiles)
 *   D  — Lower unknown block, indices 413–457 (45 profiles)
 *
 * Usage:
 *   node scripts/export-research-batches.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const CANONICAL = 'data/makuuchi_verified_profiles.json';
const OUT_DIR   = 'data/research_exports';

// ---------------------------------------------------------------------------
// Load canonical dataset + build index maps
// ---------------------------------------------------------------------------

const canonical = JSON.parse(readFileSync(CANONICAL, 'utf8'));

const ridToIdx = new Map();
canonical.forEach((p, i) => { if (p.rikishiId) ridToIdx.set(p.rikishiId, i); });

const shikonaToIdx = new Map();
canonical.forEach((p, i) => {
  const ns = (p.shikona || '').trim().toLowerCase();
  if (ns) shikonaToIdx.set(ns, i);
});

function canonicalIndex(p) {
  if (p.rikishiId && ridToIdx.has(p.rikishiId)) return ridToIdx.get(p.rikishiId);
  const ns = (p.shikona || '').trim().toLowerCase();
  return shikonaToIdx.get(ns) ?? -1;
}

// ---------------------------------------------------------------------------
// Select all unresolved + quarantined
// ---------------------------------------------------------------------------

const all = canonical.filter(
  p => p.provenanceStatus === 'unresolved' || p.provenanceStatus === 'quarantined'
);

// ---------------------------------------------------------------------------
// Batch definitions
// ---------------------------------------------------------------------------

// Batch Q — quarantined singleton
const batchQ = all.filter(p => p.provenanceStatus === 'quarantined');

// Batch A — verified-identity unresolved (any canonical position)
const batchA = all.filter(
  p => p.provenanceStatus === 'unresolved' && p.profileConfidence === 'verified'
);

// Remaining: likely-confidence unresolved
const remaining = all.filter(
  p => p.provenanceStatus === 'unresolved' && p.profileConfidence !== 'verified'
);

// Batch B — Makushita/Sandanme border zone (canonical indices 341–383)
const batchB = remaining.filter(p => {
  const idx = canonicalIndex(p);
  return idx >= 341 && idx <= 383;
});

// Batch C — upper transition block (indices 392–411)
// Bordered by confirmed Makushita (idx 384–401 resolved) and
// inferred Sandanme (idx 397, 412)
const batchC = remaining.filter(p => {
  const idx = canonicalIndex(p);
  return idx >= 392 && idx <= 411;
});

// Batch D — lower unknown block (indices 413–457)
// Bordered by inferred Sandanme (idx 412) above and
// confirmed Jonidan (idx 458+) below
const batchD = remaining.filter(p => {
  const idx = canonicalIndex(p);
  return idx >= 413 && idx <= 457;
});

// ---------------------------------------------------------------------------
// Assignment integrity check
// ---------------------------------------------------------------------------

const totalAssigned = batchQ.length + batchA.length + batchB.length + batchC.length + batchD.length;
if (totalAssigned !== all.length) {
  console.error(`❌  Assignment mismatch: ${totalAssigned} assigned vs ${all.length} total`);
  const assignedIds = new Set([
    ...batchQ, ...batchA, ...batchB, ...batchC, ...batchD,
  ].map(p => p.rikishiId || p.shikona));
  const unassigned = all.filter(p => !assignedIds.has(p.rikishiId || p.shikona));
  for (const p of unassigned) {
    console.error(`   ⚠  Missing: [${canonicalIndex(p)}] ${p.shikona}`);
  }
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Export helper — writes a batch file with full profile data + research context
// ---------------------------------------------------------------------------

function shapeProfile(p) {
  const idx = canonicalIndex(p);
  const prev = idx > 0 ? canonical[idx - 1] : null;
  const next = idx < canonical.length - 1 ? canonical[idx + 1] : null;

  return {
    _researchContext: {
      canonicalIndex: idx,
      neighborBefore: prev
        ? { shikona: prev.shikona, division: prev.division, batchRef: prev.batchRef, provenanceStatus: prev.provenanceStatus }
        : null,
      neighborAfter: next
        ? { shikona: next.shikona, division: next.division, batchRef: next.batchRef, provenanceStatus: next.provenanceStatus }
        : null,
    },

    rikishiId:          p.rikishiId,
    shikona:            p.shikona,
    heya:               p.heya,
    birthDate:          p.birthDate,
    nationality:        p.nationality,
    heightCm:           p.heightCm,
    weightKg:           p.weightKg,
    status:             p.status,
    officialImageUrl:   p.officialImageUrl,
    imageSource:        p.imageSource,
    imageConfidence:    p.imageConfidence,
    profileConfidence:  p.profileConfidence,
    division:           p.division,
    batchRef:           p.batchRef,
    lastVerifiedBasho:  p.lastVerifiedBasho,
    provenanceStatus:   p.provenanceStatus,
    sourceRefs:         p.sourceRefs,
    notes:              p.notes,
  };
}

const exportDate = new Date().toISOString();

function writeBatch(filename, batch, batchId, description, researchNotes, priority) {
  const profiles = batch.map(shapeProfile);

  const payload = {
    _meta: {
      batchId,
      exportDate,
      sourceFile: CANONICAL,
      description,
      researchNotes,
      priority,
      counts: {
        total: profiles.length,
        unresolved: profiles.filter(p => p.provenanceStatus === 'unresolved').length,
        quarantined: profiles.filter(p => p.provenanceStatus === 'quarantined').length,
      },
      mergeCommand: `node scripts/merge-research.mjs --file ${OUT_DIR}/${filename}`,
      instructions: [
        'For each profile, research the correct current division and any missing fields.',
        'Set provenanceStatus to "confirmed" when you have verified the data.',
        'Add or append to sourceRefs with the source you used.',
        'Append research notes to the notes field (pipe-delimited: " | <your note>").',
        'Do NOT change rikishiId — it is the primary match key.',
        'Do NOT downgrade profileConfidence or imageConfidence.',
        'The _researchContext field is for reference only — ignored during merge.',
        'Return the full profiles array in the same schema.',
      ],
    },
    profiles,
  };

  const outPath = `${OUT_DIR}/${filename}`;
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  return { filename, outPath, count: profiles.length, batchId, description, priority };
}

// ---------------------------------------------------------------------------
// Write all batches
// ---------------------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });

console.log(`\n📦  Exporting research batches → ${OUT_DIR}/\n`);

const results = [];

results.push(writeBatch(
  'batch-q-quarantined.json',
  batchQ, 'Q',
  'Quarantined singleton — requires identity re-verification',
  [
    'This profile has no sourceRefs, unverified confidence, and no rikishiId.',
    'The official JSA profile was previously inaccessible.',
    'Research task: determine if this wrestler exists and is currently active.',
    'If confirmed, provide rikishiId, division, heya, and set provenanceStatus to "confirmed".',
    'If the wrestler cannot be found, leave provenanceStatus as "quarantined".',
  ],
  1
));

results.push(writeBatch(
  'batch-a-verified-identity.json',
  batchA, 'A',
  'Verified-identity profiles — need division lookup only',
  [
    'All 21 profiles have profileConfidence="verified" with valid JSA rikishiId.',
    'All biographical fields (heya, birthDate, nationality, height, weight) are populated.',
    'The ONLY missing field is division.',
    'These are the highest-value, lowest-risk research targets.',
    '19 are from the early-import block (indices 223–250), 2 outliers at 354 and 375.',
    'Expect a mix of Makushita, Sandanme, Jonidan, and possibly Juryo.',
  ],
  2
));

results.push(writeBatch(
  'batch-b-border-zone.json',
  batchB, 'B',
  'Makushita/Sandanme border zone (indices 341–383)',
  [
    '19 profiles scattered in the Makushita–Sandanme transition zone.',
    'Neighbors include confirmed Makushita, Sandanme, and one Juryo profile.',
    'Original import batch spanned multiple divisions — position alone cannot determine division.',
    'Each profile needs individual division lookup.',
    'All have dual JSA + SumoDB sourceRefs and "likely" confidence.',
  ],
  4
));

results.push(writeBatch(
  'batch-c-upper-transition.json',
  batchC, 'C',
  'Upper transition block (indices 392–411) — Makushita/Sandanme boundary',
  [
    '10 profiles between confirmed Makushita (idx 384–401) and inferred Sandanme (idx 412).',
    'Most likely Makushita or Sandanme — needs per-row verification.',
    'Resolving this batch before batch D will improve context for the lower block.',
    'All have dual JSA + SumoDB sourceRefs and "likely" confidence.',
  ],
  3
));

results.push(writeBatch(
  'batch-d-lower-block.json',
  batchD, 'D',
  'Lower unknown block (indices 413–457) — deep lower-division territory',
  [
    '45 profiles — the largest contiguous unresolved block.',
    'Bordered by inferred Sandanme (idx 412) above and confirmed Jonidan (idx 458+) below.',
    'Division could span Sandanme, Jonidan, or Jonokuchi — each needs individual lookup.',
    'This is the lowest-confidence, highest-risk batch.',
    'Research batch C first to establish the upper boundary.',
    'All have dual JSA + SumoDB sourceRefs and "likely" confidence.',
  ],
  5
));

// ---------------------------------------------------------------------------
// Print summary
// ---------------------------------------------------------------------------

for (const r of results) {
  console.log(`  ✅  ${r.outPath.padEnd(52)} ${String(r.count).padStart(3)} profiles  [priority ${r.priority}]  ${r.description}`);
}

console.log(`\n📊  Totals: ${results.map(r => `${r.batchId}=${r.count}`).join(' + ')} = ${totalAssigned}`);
console.log(`    Canonical unresolved+quarantined: ${all.length}`);
if (totalAssigned === all.length) {
  console.log('    ✅  All profiles assigned — zero drift\n');
} else {
  console.log('    ❌  MISMATCH\n');
}

// ---------------------------------------------------------------------------
// Write manifest
// ---------------------------------------------------------------------------

const manifest = {
  _meta: {
    generatedAt: exportDate,
    sourceFile: CANONICAL,
    totalProfiles: all.length,
    description: 'Manifest of research-ready export batches for the Sumo Sauce unresolved profile verification cycle.',
    mergeWorkflow: 'For each completed batch, run: node scripts/merge-research.mjs --file <batch-file> [--apply]',
    validationCommand: 'node scripts/validate-profiles.mjs',
  },
  batches: results.map(r => ({
    batchId: r.batchId,
    filename: r.filename,
    path: r.outPath,
    profileCount: r.count,
    purpose: r.description,
    priority: r.priority,
    mergeCommand: `node scripts/merge-research.mjs --file ${r.outPath}`,
  })),
  researchOrder: [
    { priority: 1, batchId: 'Q', reason: 'Quick win. Binary outcome: wrestler exists or does not. Resolves the only quarantined profile.' },
    { priority: 2, batchId: 'A', reason: 'Highest value/lowest risk. All 21 have verified identity — only need division lookup. Full biographical data already present.' },
    { priority: 3, batchId: 'C', reason: 'Establishes the upper boundary of the big unknown block. Resolving 10 profiles here narrows the division range for batch D.' },
    { priority: 4, batchId: 'B', reason: 'Mixed border zone. Independent of C/D — can be researched in parallel with C. Division mix expected (Makushita/Sandanme/Juryo).' },
    { priority: 5, batchId: 'D', reason: 'Largest and lowest-confidence batch. Should be done last — resolving C first constrains the possible division range.' },
  ],
  risks: [
    { batchId: 'Q', level: 'low', note: 'If Tsushimanada cannot be found, the profile stays quarantined permanently. Impact: 1 profile.' },
    { batchId: 'A', level: 'low', note: '2 outlier profiles (idx 354, 375) are outside the main 223–250 block and may be in unexpected divisions.' },
    { batchId: 'B', level: 'medium', note: 'Original import batch crossed division boundaries. Each profile genuinely could be Makushita, Sandanme, or Juryo.' },
    { batchId: 'C', level: 'medium', note: 'Small batch but neighbors show Makushita/Sandanme mixing. Some "stale-rank" notes suggest rank data may be outdated.' },
    { batchId: 'D', level: 'high', note: '45 profiles with almost no resolved neighbors between them. Division span is wide (Sandanme → Jonokuchi). Expect the most surprises.' },
  ],
};

const manifestPath = `${OUT_DIR}/manifest.json`;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`📋  Manifest: ${manifestPath}\n`);
