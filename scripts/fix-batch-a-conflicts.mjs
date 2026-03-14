#!/usr/bin/env node
/**
 * fix-batch-a-conflicts.mjs
 * ─────────────────────────
 * Pre-merge corrections for Batch A profiles that have field-level
 * conflicts with the canonical dataset. These corrections are based
 * on authoritative JSA official profile data.
 *
 * Must run BEFORE merge-research.mjs to avoid CONFLICT_FIELD rejections.
 *
 * Corrections:
 *   1. Kotokenryu Takeaki (4115): birthDate 1995-09-06 → 2004-01-19 (JSA confirmed)
 *   2. Tosamidori Kiyota (3654): heya Onoumi → Onomatsu (JSA confirmed)
 *   3. Anhiki Kaoto (4235): heya Anjigawa → Ajigawa, shikona → Anhibiki Kaoto (JSA confirmed)
 *   4. Kumanoryu (4080): heya Takasago → Takekuma (JSA confirmed)
 *   5. Fujimune (4201): shikona → Fujiso Yudai (JSA confirmed; rikishiId+heya match)
 *
 * Usage:
 *   node scripts/fix-batch-a-conflicts.mjs           # dry run
 *   node scripts/fix-batch-a-conflicts.mjs --apply    # write changes
 */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APPLY = process.argv.includes('--apply');
const CANONICAL = resolve('data/makuuchi_verified_profiles.json');
const BACKUP_SUFFIX = `.pre-fix-batch-a-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;

const canonical = JSON.parse(readFileSync(CANONICAL, 'utf8'));

console.log(`\n🔧  Batch A conflict fixes ${APPLY ? '(APPLY)' : '(DRY RUN)'}`);
console.log(`    Canonical: ${CANONICAL}  (${canonical.length} profiles)\n`);

// ---------------------------------------------------------------------------
// Define corrections
// ---------------------------------------------------------------------------

const corrections = [
  {
    rikishiId: '4115',
    label: 'Kotokenryu Takeaki',
    source: 'https://www.sumo.or.jp/EnSumoDataRikishi/profile/4115/',
    fixes: [
      { field: 'birthDate', from: '1995-09-06', to: '2004-01-19' },
    ],
  },
  {
    rikishiId: '3654',
    label: 'Tosamidori Kiyota',
    source: 'https://www.sumo.or.jp/EnSumoDataRikishi/profile/3654/',
    fixes: [
      { field: 'heya', from: 'Onoumi', to: 'Onomatsu' },
    ],
  },
  {
    rikishiId: '4235',
    label: 'Anhiki Kaoto → Anhibiki Kaoto',
    source: 'https://www.sumo.or.jp/EnSumoDataRikishi/profile/4235/',
    fixes: [
      { field: 'heya', from: 'Anjigawa', to: 'Ajigawa' },
      { field: 'shikona', from: 'Anhiki Kaoto', to: 'Anhibiki Kaoto' },
    ],
  },
  {
    rikishiId: '4080',
    label: 'Kumanoryu',
    source: 'https://www.sumo.or.jp/EnSumoDataRikishi/profile/4080/',
    fixes: [
      { field: 'heya', from: 'Takasago', to: 'Takekuma' },
    ],
  },
  {
    rikishiId: '4201',
    label: 'Fujimune → Fujiso Yudai',
    source: 'https://www.sumo.or.jp/EnSumoDataRikishi/profile/4201/',
    fixes: [
      { field: 'shikona', from: 'Fujimune', to: 'Fujiso Yudai' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Apply corrections
// ---------------------------------------------------------------------------

let applied = 0;
let notFound = 0;
let mismatch = 0;

for (const c of corrections) {
  const idx = canonical.findIndex(p => p.rikishiId === c.rikishiId);

  if (idx === -1) {
    console.log(`  ❌  NOT FOUND: rikishiId ${c.rikishiId} (${c.label})`);
    notFound++;
    continue;
  }

  const profile = canonical[idx];
  console.log(`  🔎  [${idx}] ${profile.shikona} (${c.rikishiId}):`);

  let rowOk = true;
  for (const fix of c.fixes) {
    const current = profile[fix.field];
    if (current !== fix.from) {
      console.log(`       ⚠️  ${fix.field}: expected "${fix.from}", found "${current}" — SKIPPED`);
      mismatch++;
      rowOk = false;
      continue;
    }
    console.log(`       ${fix.field}: "${fix.from}" → "${fix.to}"`);
    if (APPLY) {
      profile[fix.field] = fix.to;
    }
  }

  if (rowOk) {
    // Append note about correction
    const note = `Field correction from JSA profile (${c.source}).`;
    const existingNotes = (profile.notes || '').trim();
    if (APPLY && !existingNotes.includes('Field correction from JSA')) {
      profile.notes = existingNotes ? `${existingNotes} | ${note}` : note;
    }
    applied++;
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n📊  Fix summary:`);
console.log(`    Corrections defined: ${corrections.length}`);
console.log(`    Applied:             ${applied}`);
console.log(`    Not found:           ${notFound}`);
console.log(`    Field mismatches:    ${mismatch}`);

if (APPLY && applied > 0) {
  const backupPath = CANONICAL + BACKUP_SUFFIX;
  copyFileSync(CANONICAL, backupPath);
  console.log(`\n💾  Backup: ${backupPath}`);
  writeFileSync(CANONICAL, JSON.stringify(canonical, null, 2) + '\n');
  console.log(`✅  Written: ${CANONICAL} (${canonical.length} profiles)`);
  console.log('\n👉  Next: run merge-research.mjs with resolved-a output\n');
} else if (APPLY && applied === 0) {
  console.log('\n⏭️  No corrections to apply.\n');
} else {
  console.log(`\n🔍  Dry run — no files changed. Re-run with --apply to write.\n`);
}
