/*
 * ingest-juryo-final.mjs
 * ----------------------
 * Ingest script for the final Juryo recovery batch.
 *
 * Reads:  data/resolved-f-final-juryo.json
 *           — a JSON array with two object shapes:
 *             1. NEW profiles: full profile objects (must have rikishiId + shikona)
 *             2. ENRICH patches: { shikona, rikishiId?, birthDate?, nationality?, heightCm?, weightKg? }
 *                (matched by shikona against existing profiles)
 *
 * Writes: data/makuuchi_verified_profiles.json  (in-place, with backup)
 *
 * Usage:
 *   node scripts/ingest-juryo-final.mjs --dry-run     # preview only
 *   node scripts/ingest-juryo-final.mjs --apply        # write changes
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';

const DRY = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');
if (!DRY && !APPLY) {
  console.error('Usage: node scripts/ingest-juryo-final.mjs [--dry-run | --apply]');
  process.exit(1);
}

const CANONICAL = 'data/makuuchi_verified_profiles.json';
const RESOLVED  = 'data/resolved-f-final-juryo.json';

const data     = JSON.parse(readFileSync(CANONICAL, 'utf8'));
const resolved = JSON.parse(readFileSync(RESOLVED, 'utf8'));

const REQUIRED_NEW = ['rikishiId', 'shikona', 'heya', 'birthDate', 'heightCm', 'weightKg'];
const ENRICH_FIELDS = ['rikishiId', 'birthDate', 'nationality', 'heightCm', 'weightKg'];

const existingIds   = new Set(data.filter(r => r.rikishiId).map(r => String(r.rikishiId)));
const existingNames = new Map(data.map((r, i) => [r.shikona?.toLowerCase(), i]));

let added = 0, enriched = 0, skipped = 0, errors = 0;

for (const entry of resolved) {
  const name = entry.shikona;
  if (!name) { console.error('  ❌ Entry missing shikona — skipped'); errors++; continue; }

  const existingIdx = existingNames.get(name.toLowerCase());

  if (existingIdx !== undefined) {
    // ENRICH existing profile
    const existing = data[existingIdx];
    const patches = [];
    for (const field of ENRICH_FIELDS) {
      if (entry[field] != null && (existing[field] == null || existing[field] === '')) {
        patches.push(field);
        existing[field] = entry[field];
      }
    }
    // nationality special case: always accept if provided and existing is null
    if (entry.nationality && !existing.nationality) {
      if (!patches.includes('nationality')) {
        patches.push('nationality');
        existing.nationality = entry.nationality;
      }
    }
    if (patches.length > 0) {
      console.log(`  ✏️  ENRICH ${name}: ${patches.join(', ')}`);
      enriched++;
    } else {
      console.log(`  ⏭️  SKIP ${name}: nothing to update`);
      skipped++;
    }
  } else {
    // NEW profile — validate required fields
    const missingReq = REQUIRED_NEW.filter(f => entry[f] == null);
    if (missingReq.length > 0) {
      console.error(`  ❌ NEW ${name}: missing required fields: ${missingReq.join(', ')}`);
      errors++;
      continue;
    }
    // Check for duplicate rikishiId
    if (existingIds.has(String(entry.rikishiId))) {
      console.error(`  ❌ NEW ${name}: rikishiId ${entry.rikishiId} already exists in dataset`);
      errors++;
      continue;
    }
    // Build profile
    const profile = {
      rikishiId:        String(entry.rikishiId),
      shikona:          entry.shikona,
      heya:             entry.heya,
      birthDate:        entry.birthDate,
      nationality:      entry.nationality || null,
      heightCm:         entry.heightCm,
      weightKg:         entry.weightKg,
      status:           entry.status || 'active',
      officialImageUrl: entry.officialImageUrl || null,
      imageSource:      entry.imageSource || null,
      imageConfidence:  entry.imageConfidence || 'missing',
      profileConfidence: entry.profileConfidence || 'verified',
      sourceRefs:       entry.sourceRefs || [
        { label: 'JSA Rikishi Profile', url: `https://www.sumo.or.jp/EnSumoDataRikishi/profile/${entry.rikishiId}/` }
      ],
      notes:            entry.notes || `Batch F final: Haru 2026 Juryo. JSA-verified profile.`,
      division:         'Juryo',
      batchRef:         'juryo-roster',
      lastVerifiedBasho: '202603',
      provenanceStatus: 'confirmed'
    };
    data.push(profile);
    existingIds.add(String(entry.rikishiId));
    existingNames.set(name.toLowerCase(), data.length - 1);
    console.log(`  ➕ NEW ${name} (id ${entry.rikishiId})`);
    added++;
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`  Added:    ${added}`);
console.log(`  Enriched: ${enriched}`);
console.log(`  Skipped:  ${skipped}`);
console.log(`  Errors:   ${errors}`);
console.log(`  Total Juryo after: ${data.filter(r => r.division === 'Juryo').length}`);
console.log(`  Total profiles after: ${data.length}`);

if (errors > 0) {
  console.error(`\n⚠️  ${errors} error(s) — review above before applying.`);
}

if (APPLY && errors === 0) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${CANONICAL}.backup-${ts}`;
  copyFileSync(CANONICAL, backup);
  console.log(`  Backup: ${backup}`);
  writeFileSync(CANONICAL, JSON.stringify(data, null, 2) + '\n');
  console.log(`  ✅ Written to ${CANONICAL}`);
} else if (APPLY && errors > 0) {
  console.error(`  ❌ NOT written — fix errors first.`);
} else {
  console.log(`  (dry-run — no changes written)`);
}
