#!/usr/bin/env node
/**
 * _patch-null-provenance.mjs
 * ==========================
 * Second-pass provenance cleanup: resolves null division/batchRef rows
 * using ONLY repo-local evidence.
 *
 * Evidence tiers (applied in order):
 *
 *   TIER 1 — SANDWICH (structural)
 *     Single-row gaps where BOTH neighbors share the same division + batchRef.
 *     Same sourceRef pattern as neighbors. Same import batch.
 *     → Assign the neighbor's division + batchRef.
 *     Applies to: 8 scattered singles in the Jonidan 81-100 run.
 *
 *   TIER 2 — LEGACY CROSS-REFERENCE (independent data source)
 *     Profile's shikona matches an entry in data/legacy/wrestlers_final_merged.json
 *     with an explicit current_division value.
 *     → Assign the legacy division. BatchRef assigned if division + rank map cleanly.
 *
 *   TIER 3 — BLOCK IMPORT CONTEXT (moderate)
 *     Null rows interleaved within a resolved batch run (e.g., rows 385-400
 *     are sandwiched between makushita-41-60 rows, share the same sourceRef
 *     pattern, and were imported together).
 *     → Only applied when BOTH immediate neighbors have the same batch.
 *
 *   NOT APPLIED:
 *   - Block C [340-383] and Block H [402-457]: Large contiguous null blocks.
 *     These were from the "Sandanme / lower-Makushita" batch, which is known
 *     to span MULTIPLE divisions. Without per-row division evidence, we cannot
 *     assign a specific division. These remain null.
 *   - Block A [223-228] and Block B [230-250]: Empty notes, no division
 *     evidence in notes or refs. Only legacy matches for some.
 *
 * Also introduces: `provenanceStatus` field on all profiles.
 *   - "confirmed"    — division + batchRef assigned from direct evidence
 *   - "inferred"     — division + batchRef assigned from structural/legacy evidence
 *   - "unresolved"   — division/batchRef could not be safely assigned
 *   - "quarantined"  — profile has serious data quality issues
 *
 * Run:  node scripts/_patch-null-provenance.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from 'fs';

const DRY_RUN = process.argv.includes('--dry-run');
const CANONICAL = 'data/makuuchi_verified_profiles.json';
const LEGACY_FILE = 'data/legacy/wrestlers_final_merged.json';

const profiles = JSON.parse(readFileSync(CANONICAL, 'utf8'));
const legacy = JSON.parse(readFileSync(LEGACY_FILE, 'utf8'));

// Build legacy lookup
const legacyMap = new Map();
for (const w of legacy) {
  if (w.shikona) legacyMap.set(w.shikona.toLowerCase(), w);
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

const stats = {
  tier1_sandwich: 0,
  tier2_legacy: 0,
  tier3_block: 0,
  alreadyResolved: 0,
  remainUnresolved: 0,
  quarantined: 0,
};

// ---------------------------------------------------------------------------
// Helper: determine batchRef from division + rank
// ---------------------------------------------------------------------------

function batchRefFromDivisionRank(division, rank) {
  if (!division) return null;
  switch (division) {
    case 'Makuuchi':   return 'makuuchi-roster';
    case 'Historical': return 'historical-legends';
    case 'Juryo':      return 'juryo-roster';
    case 'Jonokuchi':  return 'jonokuchi';
    case 'Sandanme':
      if (rank !== null && rank !== undefined) {
        if (rank <= 50) return 'sandanme-1-50';
        if (rank <= 80) return 'sandanme-51-80';
      }
      return null; // can't determine without rank
    case 'Makushita':
      if (rank !== null && rank !== undefined) {
        if (rank <= 20) return 'makushita-1-20';
        if (rank <= 40) return 'makushita-21-40';
        if (rank <= 60) return 'makushita-41-60';
      }
      return null; // can't determine without rank
    case 'Jonidan':
      if (rank !== null && rank !== undefined) {
        if (rank <= 80) return 'jonidan-1-80';
        if (rank <= 100) return 'jonidan-81-100';
        return 'jonidan-81-160';
      }
      return null;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Pass 1: Set provenanceStatus for ALL profiles
// ---------------------------------------------------------------------------

for (const p of profiles) {
  if (p.division !== null && p.batchRef !== null) {
    p.provenanceStatus = 'confirmed';
    stats.alreadyResolved++;
  }
  // Remaining will be set in passes below
}

// ---------------------------------------------------------------------------
// Pass 2: TIER 1 — Sandwich evidence
// Single-row null gaps where both neighbors agree on division + batchRef
// ---------------------------------------------------------------------------

for (let i = 1; i < profiles.length - 1; i++) {
  const p = profiles[i];
  if (p.division !== null) continue;

  const prev = profiles[i - 1];
  const next = profiles[i + 1];

  if (prev.division && next.division &&
      prev.division === next.division &&
      prev.batchRef && next.batchRef &&
      prev.batchRef === next.batchRef) {
    // Verify same sourceRef pattern
    const pRefs = (p.sourceRefs || []).map(r => r.label).sort().join('|');
    const prevRefs = (prev.sourceRefs || []).map(r => r.label).sort().join('|');
    const nextRefs = (next.sourceRefs || []).map(r => r.label).sort().join('|');

    if (pRefs === prevRefs || pRefs === nextRefs) {
      p.division = prev.division;
      p.batchRef = prev.batchRef;
      p.provenanceStatus = 'inferred';
      p.notes = (p.notes ? p.notes + ' | ' : '') +
        `[Provenance inferred: sandwich evidence — both neighbors are ${prev.division}/${prev.batchRef}]`;
      stats.tier1_sandwich++;
    }
  }
}

// ---------------------------------------------------------------------------
// Pass 3: TIER 2 — Legacy cross-reference
// Only for rows that are still null AND have a legacy match with division
// ---------------------------------------------------------------------------

for (let i = 0; i < profiles.length; i++) {
  const p = profiles[i];
  if (p.division !== null) continue;

  const shortShikona = (p.shikona || '').split(/\s+/)[0].toLowerCase();
  const fullShikona = (p.shikona || '').toLowerCase();
  const lm = legacyMap.get(fullShikona) || legacyMap.get(shortShikona);

  if (lm && lm.current_division) {
    const legacyDiv = lm.current_division;
    const legacyRank = lm.current_rank_number;

    // Validate: the legacy division must be a recognized value
    const validDivs = new Set(['Makuuchi', 'Juryo', 'Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi']);
    if (!validDivs.has(legacyDiv)) continue;

    p.division = legacyDiv;
    const batch = batchRefFromDivisionRank(legacyDiv, legacyRank);
    if (batch) p.batchRef = batch;

    p.provenanceStatus = 'inferred';
    p.notes = (p.notes ? p.notes + ' | ' : '') +
      `[Provenance inferred: legacy cross-ref — data/legacy/wrestlers_final_merged.json lists ${legacyDiv}` +
      (legacyRank ? ` #${legacyRank}${lm.current_side || ''}` : '') + `]`;
    stats.tier2_legacy++;
  }
}

// ---------------------------------------------------------------------------
// Pass 4: TIER 3 — Block import context (re-check after Tier 2)
// Null rows where both immediate neighbors NOW share the same batch
// (some neighbors may have been resolved by Tier 2)
// ---------------------------------------------------------------------------

for (let i = 1; i < profiles.length - 1; i++) {
  const p = profiles[i];
  if (p.division !== null) continue;

  const prev = profiles[i - 1];
  const next = profiles[i + 1];

  if (prev.division && next.division &&
      prev.division === next.division &&
      prev.batchRef && next.batchRef &&
      prev.batchRef === next.batchRef) {
    p.division = prev.division;
    p.batchRef = prev.batchRef;
    p.provenanceStatus = 'inferred';
    p.notes = (p.notes ? p.notes + ' | ' : '') +
      `[Provenance inferred: block context — neighbors are ${prev.division}/${prev.batchRef}]`;
    stats.tier3_block++;
  }
}

// ---------------------------------------------------------------------------
// Pass 4b: Division-only sandwich
// Both neighbors agree on division but not necessarily batchRef.
// Assign division only; leave batchRef null if neighbors disagree.
// ---------------------------------------------------------------------------

for (let i = 1; i < profiles.length - 1; i++) {
  const p = profiles[i];
  if (p.division !== null) continue;

  const prev = profiles[i - 1];
  const next = profiles[i + 1];

  if (prev.division && next.division && prev.division === next.division) {
    // Verify same sourceRef pattern
    const pRefs = (p.sourceRefs || []).map(r => r.label).sort().join('|');
    const prevRefs = (prev.sourceRefs || []).map(r => r.label).sort().join('|');
    const nextRefs = (next.sourceRefs || []).map(r => r.label).sort().join('|');

    if (pRefs === prevRefs || pRefs === nextRefs) {
      p.division = prev.division;
      // Only assign batchRef if neighbors agree
      if (prev.batchRef && next.batchRef && prev.batchRef === next.batchRef) {
        p.batchRef = prev.batchRef;
      }
      p.provenanceStatus = 'inferred';
      p.notes = (p.notes ? p.notes + ' | ' : '') +
        `[Provenance inferred: division-sandwich — both neighbors are ${prev.division}]`;
      stats.tier3_block++;
    }
  }
}

// ---------------------------------------------------------------------------
// Pass 5: Mark remaining unresolved + quarantine Tsushimanada
// ---------------------------------------------------------------------------

for (const p of profiles) {
  if (p.provenanceStatus) continue; // already set

  // Tsushimanada Masamitsu — empty sourceRefs, unverified, no evidence
  if ((p.shikona || '').toLowerCase().includes('tsushimanada') &&
      p.profileConfidence === 'unverified' &&
      (!p.sourceRefs || p.sourceRefs.length === 0)) {
    p.provenanceStatus = 'quarantined';
    p.notes = (p.notes ? p.notes + ' | ' : '') +
      '[Quarantined: no sourceRefs, profile unverified, official profile inaccessible. Requires manual re-verification before trust upgrade.]';
    stats.quarantined++;
  } else {
    p.provenanceStatus = 'unresolved';
    stats.remainUnresolved++;
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('=== Null-Provenance Patch Report ===\n');
console.log(`Total profiles:       ${profiles.length}`);
console.log(`Already resolved:     ${stats.alreadyResolved}`);
console.log(`Tier 1 (sandwich):    ${stats.tier1_sandwich}`);
console.log(`Tier 2 (legacy):      ${stats.tier2_legacy}`);
console.log(`Tier 3 (block ctx):   ${stats.tier3_block}`);
console.log(`Quarantined:          ${stats.quarantined}`);
console.log(`Remain unresolved:    ${stats.remainUnresolved}`);
console.log(`Total resolved now:   ${stats.alreadyResolved + stats.tier1_sandwich + stats.tier2_legacy + stats.tier3_block}`);

// List remaining unresolved
const unresolved = profiles
  .map((p, i) => ({ i, shikona: p.shikona, division: p.division, batchRef: p.batchRef, status: p.provenanceStatus }))
  .filter(x => x.status === 'unresolved' || x.status === 'quarantined');

console.log(`\nUnresolved/Quarantined profiles (${unresolved.length}):`);
for (const x of unresolved) {
  console.log(`  [${x.i}] ${x.shikona} div=${x.division} batch=${x.batchRef} status=${x.status}`);
}

// Division breakdown of newly resolved
const newlyResolved = profiles.filter(p => p.provenanceStatus === 'inferred');
const newDivCounts = {};
for (const p of newlyResolved) {
  newDivCounts[p.division || 'null'] = (newDivCounts[p.division || 'null'] || 0) + 1;
}
console.log('\nNewly resolved division breakdown:');
for (const [k, v] of Object.entries(newDivCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(14)} ${v}`);
}

// ProvenanceStatus breakdown
const statusCounts = {};
for (const p of profiles) {
  statusCounts[p.provenanceStatus] = (statusCounts[p.provenanceStatus] || 0) + 1;
}
console.log('\nProvenanceStatus breakdown:');
for (const [k, v] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(14)} ${v}`);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

if (DRY_RUN) {
  console.log('\n[DRY RUN] No files written.');
} else {
  writeFileSync(CANONICAL, JSON.stringify(profiles, null, 2) + '\n', 'utf8');
  console.log(`\n✅  Wrote ${CANONICAL} (${profiles.length} profiles patched)`);
}
