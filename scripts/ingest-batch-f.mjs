#!/usr/bin/env node
/**
 * ingest-batch-f.mjs
 * Safely adds new Batch F Juryo profiles to the canonical dataset.
 *
 * Guards:
 *   • Rejects profiles that already exist (by rikishiId or shikona)
 *   • Creates a timestamped backup before writing
 *   • Validates required fields
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';

const CANONICAL = 'data/makuuchi_verified_profiles.json';
const RESOLVED  = 'data/resolved-f-juryo-population.json';
const APPLY     = process.argv.includes('--apply');

const canonical = JSON.parse(readFileSync(CANONICAL, 'utf8'));
const incoming  = JSON.parse(readFileSync(RESOLVED, 'utf8'));

const existingIds   = new Set(canonical.filter(p => p.rikishiId).map(p => String(p.rikishiId)));
const existingNames = new Set(canonical.map(p => (p.shikona || '').toLowerCase()));

console.log(`\n📥  Batch F ingest ${APPLY ? '(APPLY)' : '(DRY RUN)'}:`);
console.log(`    Canonical: ${canonical.length} profiles`);
console.log(`    Incoming:  ${incoming.length} profiles\n`);

const toAdd = [];
const rejected = [];

for (const p of incoming) {
  const id   = String(p.rikishiId || '');
  const name = (p.shikona || '').toLowerCase();

  // Duplicate guard
  if (id && existingIds.has(id)) {
    rejected.push({ shikona: p.shikona, reason: `rikishiId ${id} already exists` });
    continue;
  }
  if (name && existingNames.has(name)) {
    rejected.push({ shikona: p.shikona, reason: `shikona "${p.shikona}" already exists` });
    continue;
  }

  // Required fields check
  if (!p.shikona || !p.rikishiId || !p.division) {
    rejected.push({ shikona: p.shikona || '(none)', reason: 'missing required field (shikona/rikishiId/division)' });
    continue;
  }

  toAdd.push(p);
  console.log(`  ✅  ADD: ${p.shikona} (id ${p.rikishiId}) — ${p.heya}, ${p.division}`);
}

if (rejected.length > 0) {
  console.log('\n  ⏭️  Skipped:');
  for (const r of rejected) {
    console.log(`     ${r.shikona}: ${r.reason}`);
  }
}

console.log(`\n📊  Summary: ${toAdd.length} to add, ${rejected.length} skipped`);

if (APPLY && toAdd.length > 0) {
  const backup = CANONICAL + `.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  copyFileSync(CANONICAL, backup);
  console.log(`💾  Backup: ${backup}`);

  canonical.push(...toAdd);
  writeFileSync(CANONICAL, JSON.stringify(canonical, null, 2) + '\n');
  console.log(`✅  Written: ${CANONICAL} (${canonical.length} profiles)\n`);
} else if (APPLY) {
  console.log('\n⏭️  No profiles to add.\n');
} else {
  console.log(`\n🔍  Dry run — re-run with --apply to write.\n`);
}
