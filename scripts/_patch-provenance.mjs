#!/usr/bin/env node
/**
 * _patch-provenance.mjs
 * =====================
 * One-shot script to add machine-readable provenance fields to every profile
 * in the canonical dataset and fix the 9 empty-sourceRefs cases.
 *
 * New fields added:
 *   division          – "Makuuchi" | "Juryo" | "Makushita" | "Sandanme" |
 *                       "Jonidan" | "Jonokuchi" | "Historical" | null
 *   batchRef          – canonical batch identifier string | null
 *   lastVerifiedBasho – "202603" (Haru 2026) for all profiles
 *
 * Inference rules are content-based (sourceRefs labels + notes text).
 * No division is assigned unless the evidence supports it.
 *
 * Run:  node scripts/_patch-provenance.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from 'fs';

const DRY_RUN = process.argv.includes('--dry-run');
const CANONICAL = 'data/makuuchi_verified_profiles.json';
const profiles = JSON.parse(readFileSync(CANONICAL, 'utf8'));

// ---------------------------------------------------------------------------
// Division inference (content-based, priority order)
// ---------------------------------------------------------------------------

function inferDivision(p) {
  const labels = (p.sourceRefs || []).map(r => (r.label || '').toLowerCase()).join(' ');
  const notes  = (p.notes || '').toLowerCase();

  // 1. Makuuchi — sourceRef mentions "makuuchi roster"
  if (labels.includes('makuuchi roster'))
    return 'Makuuchi';

  // 2. Jūryō — notes or sourceRef mention Jūryō/Juryo (before Historical,
  //    because some Jūryō wrestlers retired mid-tournament)
  if (/jūryō|juryo/i.test(notes) || /jūryō|juryo/i.test(labels))
    return 'Juryo';

  // 3. Historical — retired wrestlers with no active-division signals
  //    (the Historical batch is all Yokozuna/Ōzeki legends, none of whom
  //    have division-banzuke references in their notes)
  if (p.status === 'retired')
    return 'Historical';

  // 4. Jonokuchi — notes mention Jonokuchi
  if (/jonokuchi/i.test(notes))
    return 'Jonokuchi';

  // 5. Jonidan — notes mention Jonidan or jdNNN rank codes
  if (/jonidan/i.test(notes) || /\bjd\d+/i.test(notes))
    return 'Jonidan';

  // 6. Sandanme — sourceRef or notes mention Sandanme (but check for
  //    Makushita rank override in notes — "Sandanme/lower-Makushita" batch)
  if (/sandanme/i.test(labels) || /sandanme/i.test(notes)) {
    // If notes also explicitly mention a Makushita rank, prefer Makushita
    if (/makushita\s*#?\d+|east\s+makushita|west\s+makushita/i.test(notes))
      return 'Makushita';
    return 'Sandanme';
  }

  // 7. Makushita — notes or sourceRef mention Makushita or MsNNN codes
  if (/makushita/i.test(notes) || /\bms\d+/i.test(notes) || /makushita/i.test(labels))
    return 'Makushita';

  return null;
}

// ---------------------------------------------------------------------------
// Batch-ref inference (requires division + rank info from notes/sourceRefs)
// ---------------------------------------------------------------------------

function extractRank(p) {
  const notes = (p.notes || '');
  // Try "DivisionName #NN" or "DivisionName NNE/W" patterns
  const m = notes.match(/(?:makuuchi|jūryō|juryo|makushita|sandanme|jonidan|jonokuchi)\s*#?(\d+)/i)
         || notes.match(/(?:E|W)(\d+)/i)
         || notes.match(/rank\s+(\d+)/i);
  if (m) return parseInt(m[1], 10);

  // Try sourceRef labels: "Sandanme, rank 47W"
  for (const ref of (p.sourceRefs || [])) {
    const lm = (ref.label || '').match(/rank\s+(\d+)/i);
    if (lm) return parseInt(lm[1], 10);
  }

  // Try "MsNNTD" terminal patterns
  const td = notes.match(/ms(\d+)td/i);
  if (td) return parseInt(td[1], 10);

  return null;
}

function inferBatchRef(p, division) {
  if (!division) return null;
  const notes = (p.notes || '').toLowerCase();
  const rank = extractRank(p);

  switch (division) {
    case 'Makuuchi':   return 'makuuchi-roster';
    case 'Historical': return 'historical-legends';
    case 'Juryo':      return 'juryo-roster';
    case 'Jonokuchi':  return 'jonokuchi';

    case 'Sandanme':
      if (rank !== null) {
        if (rank <= 50) return 'sandanme-1-50';
        if (rank <= 80) return 'sandanme-51-80';
      }
      return 'sandanme';

    case 'Makushita':
      if (rank !== null) {
        if (rank <= 20) return 'makushita-1-20';
        if (rank <= 40) return 'makushita-21-40';
        if (rank <= 60) return 'makushita-41-60';
      }
      return 'makushita';

    case 'Jonidan':
      if (rank !== null) {
        if (rank <= 80) return 'jonidan-1-80';
        if (rank <= 100) return 'jonidan-81-100';
        return 'jonidan-81-160';
      }
      if (/81[–\-]160|81\s*–?\s*160/i.test(notes)) return 'jonidan-81-160';
      return 'jonidan';

    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Empty-sourceRefs fixes (evidence-based only)
// ---------------------------------------------------------------------------

function fixEmptySourceRefs(p, idx) {
  if (p.sourceRefs && p.sourceRefs.length > 0) return false;

  const notes = (p.notes || '').toLowerCase();
  const shikona = (p.shikona || '').toLowerCase();

  // Profiles mentioning "sumo db" / "sumo database" / "sumo-stat" as source
  if (notes.includes('sumo db') || notes.includes('sumo database') || notes.includes('sumo-stat')) {
    // Determine which banzuke page from notes
    if (/jonidan/i.test(notes)) {
      p.sourceRefs = [{
        label: 'SumoDB banzuke (Jonidan, Haru 2026) — referenced in import notes',
        url: 'https://sumodb.sumogames.de/Banzuke.aspx?b=202603&heya=-1&shusshin=-1&d=5'
      }];
      return true;
    }
    // Generic sumo database mention
    p.sourceRefs = [{
      label: 'Sumo reference database — referenced in import notes',
      url: ''
    }];
    return true;
  }

  // Kirinryu Yuto — confirmed in legacy/wrestlers_final_merged.json as Makushita 29E
  if (shikona.includes('kirinryu')) {
    p.sourceRefs = [{
      label: 'Legacy data file (data/legacy/wrestlers_final_merged.json) — Makushita 29E',
      url: ''
    }];
    return true;
  }

  // Remaining profile with truly no source (Tsushimanada) — cannot fix honestly
  return false;
}

// ---------------------------------------------------------------------------
// Main pass
// ---------------------------------------------------------------------------

const stats = {
  divisionSet: 0,
  divisionNull: 0,
  batchRefSet: 0,
  batchRefNull: 0,
  sourceRefsFixed: 0,
  sourceRefsUnfixable: 0,
  divisionCounts: {},
  batchRefCounts: {},
};

for (let i = 0; i < profiles.length; i++) {
  const p = profiles[i];

  // Fix empty sourceRefs FIRST (so inference can use the new refs)
  if (!p.sourceRefs || p.sourceRefs.length === 0) {
    if (fixEmptySourceRefs(p, i)) {
      stats.sourceRefsFixed++;
    } else {
      stats.sourceRefsUnfixable++;
    }
  }

  // Infer division
  const division = inferDivision(p);
  p.division = division;
  if (division) {
    stats.divisionSet++;
    stats.divisionCounts[division] = (stats.divisionCounts[division] || 0) + 1;
  } else {
    stats.divisionNull++;
  }

  // Infer batchRef
  const batchRef = inferBatchRef(p, division);
  p.batchRef = batchRef;
  if (batchRef) {
    stats.batchRefSet++;
    stats.batchRefCounts[batchRef] = (stats.batchRefCounts[batchRef] || 0) + 1;
  } else {
    stats.batchRefNull++;
  }

  // All profiles were collected for / verified against Haru 2026
  p.lastVerifiedBasho = '202603';
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('=== Provenance Patch Report ===\n');
console.log(`Total profiles:      ${profiles.length}`);
console.log(`Division assigned:   ${stats.divisionSet}  (null: ${stats.divisionNull})`);
console.log(`BatchRef assigned:   ${stats.batchRefSet}  (null: ${stats.batchRefNull})`);
console.log(`SourceRefs fixed:    ${stats.sourceRefsFixed}  (unfixable: ${stats.sourceRefsUnfixable})`);
console.log(`LastVerifiedBasho:   all → 202603\n`);

console.log('Division breakdown:');
for (const [k, v] of Object.entries(stats.divisionCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(14)} ${v}`);
}

console.log('\nBatchRef breakdown:');
for (const [k, v] of Object.entries(stats.batchRefCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(30)} ${v}`);
}

// List null-division profiles
const nullDiv = profiles
  .map((p, i) => ({ i, shikona: p.shikona, rikishiId: p.rikishiId }))
  .filter((_, idx) => profiles[idx].division === null);

console.log(`\nNull-division profiles (${nullDiv.length}):`);
for (const x of nullDiv) {
  console.log(`  [${x.i}] ${x.shikona} (id=${x.rikishiId})`);
}

// List still-empty sourceRefs
const emptyRefs = profiles
  .map((p, i) => ({ i, shikona: p.shikona }))
  .filter((_, idx) => !profiles[idx].sourceRefs || profiles[idx].sourceRefs.length === 0);

if (emptyRefs.length > 0) {
  console.log(`\nStill-empty sourceRefs (${emptyRefs.length}):`);
  for (const x of emptyRefs) {
    console.log(`  [${x.i}] ${x.shikona}`);
  }
}

// ---------------------------------------------------------------------------
// Write (unless --dry-run)
// ---------------------------------------------------------------------------

if (DRY_RUN) {
  console.log('\n[DRY RUN] No files written.');
} else {
  writeFileSync(CANONICAL, JSON.stringify(profiles, null, 2) + '\n', 'utf8');
  console.log(`\n✅  Wrote ${CANONICAL} (${profiles.length} profiles patched)`);
}
