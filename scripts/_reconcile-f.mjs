import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('data/makuuchi_verified_profiles.json', 'utf8'));

const coreFields = ['rikishiId', 'heya', 'birthDate', 'heightCm', 'weightKg'];
const isMissing = value => value == null || value === '';

const juryo = data
  .filter(profile => profile.division === 'Juryo')
  .sort((a, b) => (a.shikona || '').localeCompare(b.shikona || '', 'en', { sensitivity: 'base' }));

const missingCore = juryo
  .map(profile => ({
    shikona: profile.shikona,
    missing: coreFields.filter(field => isMissing(profile[field])),
  }))
  .filter(profile => profile.missing.length > 0);

const missingCoreNames = new Set(missingCore.map(profile => profile.shikona));

const missingNationalityOnly = juryo
  .filter(profile => !missingCoreNames.has(profile.shikona) && isMissing(profile.nationality))
  .map(profile => profile.shikona);

const inferredJuryo = juryo
  .filter(profile => profile.provenanceStatus !== 'confirmed' || !Array.isArray(profile.sourceRefs) || profile.sourceRefs.length === 0)
  .map(profile => ({
    shikona: profile.shikona,
    provenanceStatus: profile.provenanceStatus,
    sourceRefs: Array.isArray(profile.sourceRefs) ? profile.sourceRefs.length : 0,
    reason:
      profile.provenanceStatus !== 'confirmed'
        ? `provenanceStatus=${profile.provenanceStatus}`
        : 'missing sourceRefs',
  }));

const staleCleanupLeftovers = data
  .filter(profile =>
    profile.division !== 'Juryo' &&
    profile.status === 'active' &&
    /Removed from Juryo during strict reconciliation/.test(profile.notes || '')
  )
  .sort((a, b) => (a.shikona || '').localeCompare(b.shikona || '', 'en', { sensitivity: 'base' }))
  .map(profile => ({
    shikona: profile.shikona,
    division: profile.division,
    batchRef: profile.batchRef,
    lastVerifiedBasho: profile.lastVerifiedBasho,
    reason: 'still outside Juryo solely because of the retired Batch F target-list cleanup',
  }));

console.log('=== JURYO STATE REPORT (REPO-LOCAL) ===');
console.log('Source of truth: data/makuuchi_verified_profiles.json');
console.log('Historical only: data/batch-f-juryo-missing.json and docs/BATCH_F_PLAN.md');
console.log('');
console.log(`Current Juryo count: ${juryo.length}`);
console.log('Current Juryo list:');
for (const profile of juryo) {
  console.log(`  - ${profile.shikona}`);
}

console.log('');
console.log('Juryo profiles missing core fields:');
if (missingCore.length === 0) {
  console.log('  - none');
} else {
  for (const profile of missingCore) {
    console.log(`  - ${profile.shikona}: ${profile.missing.join(', ')}`);
  }
}

console.log('');
console.log('Juryo profiles missing nationality only:');
if (missingNationalityOnly.length === 0) {
  console.log('  - none');
} else {
  for (const shikona of missingNationalityOnly) {
    console.log(`  - ${shikona}`);
  }
}

console.log('');
console.log('Remaining true manual-review cases:');
if (inferredJuryo.length === 0 && staleCleanupLeftovers.length === 0) {
  console.log('  - none');
} else {
  for (const profile of inferredJuryo) {
    console.log(`  - ${profile.shikona}: ${profile.reason}`);
  }
  for (const profile of staleCleanupLeftovers) {
    console.log(`  - ${profile.shikona}: ${profile.reason}`);
  }
}
