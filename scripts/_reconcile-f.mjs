import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('data/makuuchi_verified_profiles.json','utf8'));
const juryo = data.filter(r => r.division === 'Juryo');

console.log(`=== ALL JURYO PROFILES (${juryo.length}) ===`);
for (const j of juryo) {
  const complete = j.rikishiId && j.birthDate && j.heightCm && j.weightKg;
  const missing = [
    !j.rikishiId && 'rikishiId',
    !j.birthDate && 'birthDate',
    !j.heightCm && 'height',
    !j.weightKg && 'weight',
    !j.nationality && 'nationality'
  ].filter(Boolean);
  const status = complete ? '✅ complete' : `⚠️  needs: ${missing.join(', ')}`;
  console.log(`  ${(j.shikona||'').padEnd(16)} id=${String(j.rikishiId||'null').padEnd(6)} heya=${String(j.heya||'null').padEnd(14)} ${status}`);
}

// Cross-reference against Batch F plan
const plan = JSON.parse(readFileSync('data/batch-f-juryo-missing.json','utf8'));
const jurNames = new Set(juryo.map(j => j.shikona.toLowerCase()));

console.log('\n=== BATCH F PLAN - STILL MISSING ===');
let stillMissing = 0;
for (const m of plan.fullyMissing_needsNewProfile) {
  if (!jurNames.has(m.shikona.toLowerCase())) {
    stillMissing++;
    console.log(`  ❌ ${m.rank} ${m.shikona}`);
  } else {
    console.log(`  ✅ ${m.rank} ${m.shikona} — now present`);
  }
}
console.log(`\nStill missing: ${stillMissing} of ${plan.fullyMissing_needsNewProfile.length}`);

console.log('\n=== ENRICHMENT NEEDED ===');
for (const e of plan.alreadyPresent_needsRikishiId) {
  const p = data.find(r => r.shikona.toLowerCase() === e.shikona.toLowerCase());
  if (p) {
    console.log(`  ${e.shikona}: rikishiId=${p.rikishiId || 'null'} birthDate=${p.birthDate || 'null'}`);
  }
}

console.log('\n=== NEW WRESTLERS NOT IN ORIGINAL PLAN ===');
const planNames = new Set([
  ...plan.alreadyPresent_noActionNeeded.map(p => p.shikona.toLowerCase()),
  ...plan.alreadyPresent_needsRikishiId.map(p => p.shikona.toLowerCase()),
  ...plan.fullyMissing_needsNewProfile.map(p => p.shikona.toLowerCase()),
]);
for (const j of juryo) {
  if (!planNames.has(j.shikona.toLowerCase())) {
    console.log(`  ➕ ${j.shikona} (id ${j.rikishiId}) — added via Batch F research but not in original banzuke list`);
  }
}
