#!/usr/bin/env node
/**
 * dedup-tsushimanada.mjs
 * ──────────────────────
 * Purpose: Remove the quarantined ghost duplicate of Tsushimanada Masamitsu (idx 230)
 *          and upgrade the surviving profile's shikona from "Tsushimanada" to the
 *          full JSA-confirmed form "Tsushimanada Masamitsu".
 *
 * Evidence:
 *   • idx 230: shikona "Tsushimanada Masamitsu", no rikishiId, no heya, no sourceRefs,
 *              provenanceStatus "quarantined", profileConfidence "unverified"
 *   • idx 381: shikona "Tsushimanada", rikishiId 3733, heya Sakaigawa,
 *              provenanceStatus "unresolved", profileConfidence "likely"
 *   • Both share birthDate 1993-06-27 — same person
 *   • JSA profile (rikishiId 3733) confirms full name is "Tsushimanada Masamitsu"
 *
 * Usage:
 *   node scripts/dedup-tsushimanada.mjs            # dry run
 *   node scripts/dedup-tsushimanada.mjs --apply     # write changes
 *
 * Run AFTER merge-research.mjs has upgraded idx 381's other fields.
 */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APPLY = process.argv.includes('--apply');
const CANONICAL = resolve('data/makuuchi_verified_profiles.json');
const BACKUP_SUFFIX = `.pre-dedup-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;

const canonical = JSON.parse(readFileSync(CANONICAL, 'utf8'));

console.log(`\n🔍  Tsushimanada dedup ${APPLY ? '(APPLY)' : '(DRY RUN)'}`);
console.log(`    Canonical: ${CANONICAL}  (${canonical.length} profiles)\n`);

// ---------------------------------------------------------------------------
// Step 1: Find the quarantined ghost duplicate (idx 230)
// ---------------------------------------------------------------------------

let ghostIdx = -1;
for (let i = 0; i < canonical.length; i++) {
  const p = canonical[i];
  if (
    p.shikona === 'Tsushimanada Masamitsu' &&
    p.provenanceStatus === 'quarantined' &&
    p.rikishiId === null &&
    p.birthDate === '1993-06-27'
  ) {
    ghostIdx = i;
    break;
  }
}

if (ghostIdx === -1) {
  console.log('  ℹ️  No quarantined ghost duplicate found — already removed or never existed.');
  process.exit(0);
}

console.log(`  🔎  Found ghost duplicate at idx ${ghostIdx}:`);
console.log(`       shikona: "${canonical[ghostIdx].shikona}"`);
console.log(`       rikishiId: ${canonical[ghostIdx].rikishiId}`);
console.log(`       provenanceStatus: ${canonical[ghostIdx].provenanceStatus}`);
console.log(`       profileConfidence: ${canonical[ghostIdx].profileConfidence}`);
console.log(`       sourceRefs: ${JSON.stringify(canonical[ghostIdx].sourceRefs)}`);

// ---------------------------------------------------------------------------
// Step 2: Find the surviving profile (rikishiId 3733)
// ---------------------------------------------------------------------------

let survivorIdx = -1;
for (let i = 0; i < canonical.length; i++) {
  if (canonical[i].rikishiId === '3733') {
    survivorIdx = i;
    break;
  }
}

if (survivorIdx === -1) {
  console.error('  ❌  Survivor profile (rikishiId 3733) not found!');
  process.exit(1);
}

console.log(`\n  🔎  Found survivor at idx ${survivorIdx}:`);
console.log(`       shikona: "${canonical[survivorIdx].shikona}"`);
console.log(`       rikishiId: ${canonical[survivorIdx].rikishiId}`);
console.log(`       heya: ${canonical[survivorIdx].heya}`);
console.log(`       provenanceStatus: ${canonical[survivorIdx].provenanceStatus}`);

// ---------------------------------------------------------------------------
// Step 3: Verify they share the same birthDate (safety check)
// ---------------------------------------------------------------------------

if (canonical[ghostIdx].birthDate !== canonical[survivorIdx].birthDate) {
  console.error('  ❌  BirthDate mismatch — aborting! These may not be the same person.');
  console.error(`       ghost birthDate: ${canonical[ghostIdx].birthDate}`);
  console.error(`       survivor birthDate: ${canonical[survivorIdx].birthDate}`);
  process.exit(1);
}

console.log(`\n  ✅  BirthDate match confirmed: ${canonical[ghostIdx].birthDate}`);

// ---------------------------------------------------------------------------
// Step 4: Apply changes
// ---------------------------------------------------------------------------

console.log('\n  📋  Planned changes:');
console.log(`       1. REMOVE idx ${ghostIdx} ("${canonical[ghostIdx].shikona}") — ghost duplicate`);

const shikonaUpdate = canonical[survivorIdx].shikona !== 'Tsushimanada Masamitsu';
if (shikonaUpdate) {
  console.log(`       2. UPDATE idx ${survivorIdx} shikona: "${canonical[survivorIdx].shikona}" → "Tsushimanada Masamitsu"`);
} else {
  console.log(`       2. SKIP shikona update — already "Tsushimanada Masamitsu"`);
}

if (APPLY) {
  // Update shikona BEFORE splicing (indices are still valid)
  if (shikonaUpdate) {
    canonical[survivorIdx].shikona = 'Tsushimanada Masamitsu';
  }

  // Remove ghost duplicate
  canonical.splice(ghostIdx, 1);

  // Backup & write
  const backupPath = CANONICAL + BACKUP_SUFFIX;
  copyFileSync(CANONICAL, backupPath);
  console.log(`\n  💾  Backup: ${backupPath}`);

  writeFileSync(CANONICAL, JSON.stringify(canonical, null, 2) + '\n');
  console.log(`  ✅  Written: ${CANONICAL} (${canonical.length} profiles)`);
  console.log('\n  👉  Next: run  node scripts/validate-profiles.mjs  to verify\n');
} else {
  console.log(`\n  🔍  Dry run — no files changed. Re-run with --apply to write.\n`);
}
