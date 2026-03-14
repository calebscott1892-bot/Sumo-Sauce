#!/usr/bin/env node
/**
 * export-unresolved.mjs
 * =====================
 * Deterministic export of all unresolved + quarantined profiles from the
 * canonical dataset.  Output is designed to be handed off for external
 * research (division lookup, sourceRef verification, image backfill, etc.)
 * and then merged back via `merge-research.mjs`.
 *
 * Usage:
 *   node scripts/export-unresolved.mjs                  # default output
 *   node scripts/export-unresolved.mjs --out path.json  # custom output path
 *   node scripts/export-unresolved.mjs --quarantined    # quarantined only
 *   node scripts/export-unresolved.mjs --unresolved     # unresolved only
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args       = process.argv.slice(2);
const outIdx     = args.indexOf('--out');
const outPath    = outIdx !== -1 ? args[outIdx + 1] : 'data/unresolved_profiles.json';
const onlyQuar   = args.includes('--quarantined');
const onlyUnres  = args.includes('--unresolved');

const CANONICAL  = 'data/makuuchi_verified_profiles.json';

// ---------------------------------------------------------------------------
// Load & filter
// ---------------------------------------------------------------------------

const profiles = JSON.parse(readFileSync(CANONICAL, 'utf8'));

let selected;
if (onlyQuar) {
  selected = profiles.filter(p => p.provenanceStatus === 'quarantined');
} else if (onlyUnres) {
  selected = profiles.filter(p => p.provenanceStatus === 'unresolved');
} else {
  selected = profiles.filter(
    p => p.provenanceStatus === 'unresolved' || p.provenanceStatus === 'quarantined'
  );
}

// ---------------------------------------------------------------------------
// Shape the export — full profile fields + research-handoff metadata
// ---------------------------------------------------------------------------

const exportDate = new Date().toISOString();

const exportPayload = {
  _meta: {
    exportDate,
    sourceFile: CANONICAL,
    description:
      'Profiles requiring external research to resolve division, batchRef, ' +
      'and/or verify identity. Return researched rows in the same schema ' +
      'to merge via: node scripts/merge-research.mjs --file <returned.json>',
    counts: {
      total: selected.length,
      unresolved: selected.filter(p => p.provenanceStatus === 'unresolved').length,
      quarantined: selected.filter(p => p.provenanceStatus === 'quarantined').length,
    },
    identityFields: ['rikishiId', 'shikona'],
    researchTargetFields: [
      'division',
      'batchRef',
      'officialImageUrl',
      'imageSource',
      'imageConfidence',
      'heya',
      'nationality',
      'heightCm',
      'weightKg',
    ],
    instructions: [
      'For each profile, research the correct current division and any missing fields.',
      'Set provenanceStatus to "confirmed" when you have verified the data.',
      'Add or append to sourceRefs with the source you used.',
      'Append research notes to the notes field (pipe-delimited: " | <your note>").',
      'Do NOT change rikishiId — it is the primary match key.',
      'Do NOT downgrade profileConfidence or imageConfidence.',
      'Return the full array of researched profiles in the same schema.',
    ],
  },
  profiles: selected.map(p => ({
    // --- Identity (do not change) ---
    rikishiId: p.rikishiId,
    shikona: p.shikona,

    // --- Biographical (fill if known) ---
    heya: p.heya,
    birthDate: p.birthDate,
    nationality: p.nationality,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    status: p.status,

    // --- Image (upgrade if found) ---
    officialImageUrl: p.officialImageUrl,
    imageSource: p.imageSource,
    imageConfidence: p.imageConfidence,

    // --- Profile trust ---
    profileConfidence: p.profileConfidence,

    // --- Provenance (primary research target) ---
    division: p.division,
    batchRef: p.batchRef,
    lastVerifiedBasho: p.lastVerifiedBasho,
    provenanceStatus: p.provenanceStatus,

    // --- Audit trail ---
    sourceRefs: p.sourceRefs,
    notes: p.notes,
  })),
};

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

writeFileSync(outPath, JSON.stringify(exportPayload, null, 2) + '\n');

const u = exportPayload._meta.counts.unresolved;
const q = exportPayload._meta.counts.quarantined;
console.log(`\n✅  Exported ${selected.length} profiles (${u} unresolved, ${q} quarantined)`);
console.log(`    → ${outPath}\n`);
