#!/usr/bin/env node
/**
 * validate-profiles.mjs
 * =====================
 * Permanent validation script for the canonical verified-profiles dataset.
 *
 * Validates:
 *   1. Schema compliance — every required field present with correct types
 *   2. Duplicate detection — no duplicate shikona or rikishiId values
 *   3. Cross-reference integrity — sourceRefs structure, URL format
 *   4. Provenance coverage — division, batchRef, lastVerifiedBasho completeness
 *   5. Confidence consistency — imageConfidence/profileConfidence valid values
 *   6. Import-candidate merge preview — when --merge <file> is provided,
 *      shows what would happen if the candidate batch were merged
 *
 * Usage:
 *   node scripts/validate-profiles.mjs                    # validate canonical file
 *   node scripts/validate-profiles.mjs --merge batch.json # preview merge with candidate
 *   node scripts/validate-profiles.mjs --strict           # exit 1 on any warning
 *   node scripts/validate-profiles.mjs --report-json out.json
 *                                                    # write a structured review report
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const STRICT     = args.includes('--strict');
const mergeIdx   = args.indexOf('--merge');
const reportIdx  = args.indexOf('--report-json');
const MERGE_FILE = mergeIdx !== -1 ? args[mergeIdx + 1] : null;
const REPORT_FILE = reportIdx !== -1 ? args[reportIdx + 1] : null;
const CANONICAL  = 'data/makuuchi_verified_profiles.json';

if (reportIdx !== -1 && !REPORT_FILE) {
  console.error('ERROR: --report-json requires an output file path');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

const VALID_IMAGE_CONF   = new Set(['verified', 'likely', 'unverified', 'missing']);
const VALID_PROFILE_CONF = new Set(['verified', 'likely', 'unverified']);
const VALID_DIVISIONS    = new Set([
  'Makuuchi', 'Juryo', 'Makushita', 'Sandanme',
  'Jonidan', 'Jonokuchi', 'Historical',
]);
const VALID_STATUSES = new Set(['active', 'retired']);
const VALID_PROVENANCE_STATUS = new Set(['confirmed', 'inferred', 'unresolved', 'quarantined']);

const REQUIRED_FIELDS = [
  'shikona', 'status', 'imageConfidence', 'profileConfidence',
  'sourceRefs', 'notes', 'provenanceStatus',
];
const NULLABLE_STRING_FIELDS = [
  'rikishiId', 'heya', 'birthDate', 'nationality',
  'officialImageUrl', 'imageSource', 'division', 'batchRef', 'lastVerifiedBasho',
];
const NULLABLE_NUMBER_FIELDS = ['heightCm', 'weightKg'];
const REVIEW_METADATA_FIELDS = [
  'rikishiId', 'heya', 'birthDate', 'nationality',
  'heightCm', 'weightKg', 'division', 'batchRef', 'lastVerifiedBasho',
];

// ---------------------------------------------------------------------------
// Validation engine
// ---------------------------------------------------------------------------

let errors   = 0;
let warnings = 0;

function error(idx, shikona, msg) {
  console.error(`  ❌  [${idx}] ${shikona}: ${msg}`);
  errors++;
}

function warn(idx, shikona, msg) {
  console.warn(`  ⚠️  [${idx}] ${shikona}: ${msg}`);
  warnings++;
}

function validateProfile(p, idx, seenShikona, seenRikishiId) {
  const shikona = p.shikona || `(no shikona at index ${idx})`;

  // --- Required string fields ---
  for (const f of REQUIRED_FIELDS) {
    if (p[f] === undefined || p[f] === null) {
      error(idx, shikona, `missing required field "${f}"`);
    }
  }

  // --- Shikona must be non-empty string ---
  if (typeof p.shikona !== 'string' || !p.shikona.trim()) {
    error(idx, shikona, 'shikona is empty or not a string');
  }

  // --- Status ---
  if (!VALID_STATUSES.has(p.status)) {
    error(idx, shikona, `invalid status "${p.status}"`);
  }

  // --- Confidence values ---
  if (!VALID_IMAGE_CONF.has(p.imageConfidence)) {
    error(idx, shikona, `invalid imageConfidence "${p.imageConfidence}"`);
  }
  if (!VALID_PROFILE_CONF.has(p.profileConfidence)) {
    error(idx, shikona, `invalid profileConfidence "${p.profileConfidence}"`);
  }

  // --- Image consistency ---
  if (p.imageConfidence === 'verified' && !p.officialImageUrl) {
    error(idx, shikona, 'imageConfidence is "verified" but officialImageUrl is empty/null');
  }
  if (p.officialImageUrl && typeof p.officialImageUrl === 'string' &&
      p.officialImageUrl.trim() && !p.officialImageUrl.startsWith('https://')) {
    warn(idx, shikona, `officialImageUrl is not HTTPS: "${p.officialImageUrl.substring(0, 60)}..."`);
  }

  // --- Nullable fields type checks ---
  for (const f of NULLABLE_STRING_FIELDS) {
    if (p[f] !== null && p[f] !== undefined && typeof p[f] !== 'string') {
      error(idx, shikona, `field "${f}" should be string or null, got ${typeof p[f]}`);
    }
  }
  for (const f of NULLABLE_NUMBER_FIELDS) {
    if (p[f] !== null && p[f] !== undefined && typeof p[f] !== 'number') {
      error(idx, shikona, `field "${f}" should be number or null, got ${typeof p[f]}`);
    }
  }

  // --- sourceRefs structure ---
  if (!Array.isArray(p.sourceRefs)) {
    error(idx, shikona, 'sourceRefs is not an array');
  } else {
    if (p.sourceRefs.length === 0) {
      warn(idx, shikona, 'sourceRefs is empty');
    }
    for (let j = 0; j < p.sourceRefs.length; j++) {
      const ref = p.sourceRefs[j];
      if (!ref || typeof ref.label !== 'string') {
        error(idx, shikona, `sourceRefs[${j}] missing label`);
      }
      if (ref && ref.url === undefined) {
        error(idx, shikona, `sourceRefs[${j}] missing url field`);
      }
    }
  }

  // --- Provenance fields ---
  if (p.division !== null && p.division !== undefined && !VALID_DIVISIONS.has(p.division)) {
    error(idx, shikona, `invalid division "${p.division}"`);
  }
  if (p.provenanceStatus && !VALID_PROVENANCE_STATUS.has(p.provenanceStatus)) {
    error(idx, shikona, `invalid provenanceStatus "${p.provenanceStatus}"`);
  }
  // Only warn about null division/batchRef if NOT explicitly marked unresolved/quarantined
  const isExplicitlyUnresolved = p.provenanceStatus === 'unresolved' || p.provenanceStatus === 'quarantined';
  if (!p.division && !isExplicitlyUnresolved) {
    warn(idx, shikona, 'division is null (provenance gap)');
  }
  if (!p.batchRef && !isExplicitlyUnresolved) {
    warn(idx, shikona, 'batchRef is null (provenance gap)');
  }
  if (!p.lastVerifiedBasho) {
    warn(idx, shikona, 'lastVerifiedBasho is null');
  }

  // --- Duplicate detection ---
  const normShikona = (p.shikona || '').trim().toLowerCase();
  if (normShikona) {
    if (seenShikona.has(normShikona)) {
      error(idx, shikona, `duplicate shikona "${normShikona}" (first seen at index ${seenShikona.get(normShikona)})`);
    } else {
      seenShikona.set(normShikona, idx);
    }
  }

  if (p.rikishiId && typeof p.rikishiId === 'string' && p.rikishiId.trim()) {
    const rid = p.rikishiId.trim();
    if (seenRikishiId.has(rid)) {
      error(idx, shikona, `duplicate rikishiId "${rid}" (first seen at index ${seenRikishiId.get(rid)})`);
    } else {
      seenRikishiId.set(rid, idx);
    }
  }

  // --- Notes type check ---
  if (typeof p.notes !== 'string') {
    error(idx, shikona, `notes should be string, got ${typeof p.notes}`);
  }
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function buildReviewRows(rows) {
  return rows.map((profile, idx) => {
    const sourceRefs = Array.isArray(profile.sourceRefs) ? profile.sourceRefs : [];
    const missingFields = REVIEW_METADATA_FIELDS.filter((field) => !hasValue(profile[field]));
    const nonHttpsSourceCount = sourceRefs.filter((ref) => {
      const url = typeof ref?.url === 'string' ? ref.url.trim() : '';
      return Boolean(url) && !url.startsWith('https://');
    }).length;

    return {
      index: idx,
      shikona: profile.shikona || `(index ${idx})`,
      rikishiId: profile.rikishiId || null,
      division: profile.division || null,
      batchRef: profile.batchRef || null,
      lastVerifiedBasho: profile.lastVerifiedBasho || null,
      profileConfidence: profile.profileConfidence || 'unverified',
      imageConfidence: profile.imageConfidence || 'missing',
      provenanceStatus: profile.provenanceStatus || 'unresolved',
      sourceRefCount: sourceRefs.length,
      nonHttpsSourceCount,
      missingFields,
      metadataGapCount: missingFields.length,
    };
  });
}

function withQueueReason(rows, nextStep, reasonBuilder) {
  return rows.map((row) => ({
    ...row,
    nextStep,
    reason: reasonBuilder(row),
  }));
}

function sortQueueRows(rows) {
  return [...rows].sort((a, b) => {
    const gapDelta = b.metadataGapCount - a.metadataGapCount;
    if (gapDelta !== 0) return gapDelta;

    const sourceDelta = a.sourceRefCount - b.sourceRefCount;
    if (sourceDelta !== 0) return sourceDelta;

    return a.shikona.localeCompare(b.shikona);
  });
}

function buildReviewQueues(rows) {
  const reviewRows = buildReviewRows(rows);

  return [
    {
      key: 'unverified-profiles',
      title: 'Unverified profiles',
      description: 'Profiles still below the trusted identity threshold.',
      nextStep: 'Verify core identity and provenance fields before treating the profile as trusted.',
      items: sortQueueRows(withQueueReason(
        reviewRows.filter((row) => row.profileConfidence === 'unverified'),
        'Verify core identity and provenance fields before treating the profile as trusted.',
        (row) => `profileConfidence=unverified with ${row.sourceRefCount} source ref${row.sourceRefCount === 1 ? '' : 's'}`,
      )),
    },
    {
      key: 'inferred-provenance',
      title: 'Inferred provenance',
      description: 'Profiles whose lineage still depends on inference.',
      nextStep: 'Confirm division and batch lineage so the profile can move out of inferred status.',
      items: sortQueueRows(withQueueReason(
        reviewRows.filter((row) => row.provenanceStatus === 'inferred'),
        'Confirm division and batch lineage so the profile can move out of inferred status.',
        (row) => `provenanceStatus=inferred${row.batchRef ? '' : ' and batchRef is still missing'}`,
      )),
    },
    {
      key: 'provenance-hotspots',
      title: 'Batch / provenance gaps',
      description: 'Profiles missing batchRef, division, or lastVerifiedBasho context.',
      nextStep: 'Backfill the missing provenance field before wider enrichment work.',
      items: sortQueueRows(withQueueReason(
        reviewRows.filter((row) => (!row.batchRef || !row.division || !row.lastVerifiedBasho) && row.provenanceStatus !== 'quarantined'),
        'Backfill the missing provenance field before wider enrichment work.',
        (row) => `missing provenance fields: ${row.missingFields.filter((field) => field === 'division' || field === 'batchRef' || field === 'lastVerifiedBasho').join(', ')}`,
      )),
    },
    {
      key: 'missing-images',
      title: 'Missing or withheld images',
      description: 'Profiles that still need image verification or image coverage work.',
      nextStep: 'Keep image safety rules intact and research publishable official imagery separately from identity cleanup.',
      items: sortQueueRows(withQueueReason(
        reviewRows.filter((row) => row.imageConfidence === 'missing' || row.imageConfidence === 'unverified'),
        'Keep image safety rules intact and research publishable official imagery separately from identity cleanup.',
        (row) => row.imageConfidence === 'missing' ? 'no verified official image is published' : 'image exists but remains below publishable confidence',
      )),
    },
    {
      key: 'weak-source-coverage',
      title: 'Missing or thin source coverage',
      description: 'Profiles with zero or one published source ref, or non-HTTPS source URLs.',
      nextStep: 'Add corroborating refs or normalize URLs before raising confidence.',
      items: sortQueueRows(withQueueReason(
        reviewRows.filter((row) => row.sourceRefCount <= 1 || row.nonHttpsSourceCount > 0),
        'Add corroborating refs or normalize URLs before raising confidence.',
        (row) => {
          if (row.sourceRefCount === 0) return 'no source refs are published';
          if (row.nonHttpsSourceCount > 0) return `${row.nonHttpsSourceCount} source URL${row.nonHttpsSourceCount === 1 ? '' : 's'} are not HTTPS`;
          return 'only one source ref is published';
        },
      )),
    },
    {
      key: 'metadata-hotspots',
      title: 'Null metadata hotspots',
      description: 'Profiles missing multiple core metadata fields at once.',
      nextStep: 'Use this queue for multi-field cleanup before the next dataset expansion.',
      items: sortQueueRows(withQueueReason(
        reviewRows.filter((row) => row.metadataGapCount >= 3),
        'Use this queue for multi-field cleanup before the next dataset expansion.',
        (row) => `missing ${row.metadataGapCount} core fields: ${row.missingFields.join(', ')}`,
      )),
    },
  ];
}

function printQueuePreview(queue, previewCount = 5) {
  if (!queue.items.length) return;

  console.log(`\n  ${queue.title}: ${queue.items.length}`);
  console.log(`    Next step: ${queue.nextStep}`);
  for (const item of queue.items.slice(0, previewCount)) {
    const rid = item.rikishiId ? ` (RID ${item.rikishiId})` : '';
    console.log(`    - ${item.shikona}${rid}: ${item.reason}`);
  }
  if (queue.items.length > previewCount) {
    console.log(`    ... +${queue.items.length - previewCount} more`);
  }
}

// ---------------------------------------------------------------------------
// Run validation on canonical file
// ---------------------------------------------------------------------------

console.log(`\n🔍  Validating ${CANONICAL}...\n`);

if (!existsSync(CANONICAL)) {
  console.error(`❌  File not found: ${CANONICAL}`);
  process.exit(1);
}

const profiles = JSON.parse(readFileSync(CANONICAL, 'utf8'));
if (!Array.isArray(profiles)) {
  console.error('❌  Root element is not an array');
  process.exit(1);
}

const seenShikona  = new Map();
const seenRikishiId = new Map();

for (let i = 0; i < profiles.length; i++) {
  validateProfile(profiles[i], i, seenShikona, seenRikishiId);
}

// ---------------------------------------------------------------------------
// Summary statistics
// ---------------------------------------------------------------------------

const divCounts = {};
const confCounts = { verified: 0, likely: 0, unverified: 0 };
const imgCounts  = { verified: 0, likely: 0, unverified: 0, missing: 0 };
const provCounts = { confirmed: 0, inferred: 0, unresolved: 0, quarantined: 0 };
let nullDiv = 0, nullBatch = 0, nullBasho = 0, emptyRefs = 0;

for (const p of profiles) {
  if (p.division) divCounts[p.division] = (divCounts[p.division] || 0) + 1;
  else nullDiv++;
  if (!p.batchRef) nullBatch++;
  if (!p.lastVerifiedBasho) nullBasho++;
  if (!p.sourceRefs || p.sourceRefs.length === 0) emptyRefs++;
  if (p.profileConfidence) confCounts[p.profileConfidence] = (confCounts[p.profileConfidence] || 0) + 1;
  if (p.imageConfidence) imgCounts[p.imageConfidence] = (imgCounts[p.imageConfidence] || 0) + 1;
  if (p.provenanceStatus) provCounts[p.provenanceStatus] = (provCounts[p.provenanceStatus] || 0) + 1;
}

console.log('\n📊  Summary:');
console.log(`  Total profiles:     ${profiles.length}`);
console.log(`  Errors:             ${errors}`);
console.log(`  Warnings:           ${warnings}`);
console.log(`  Duplicate shikona:  0 (would be errors above)`);
console.log(`  Empty sourceRefs:   ${emptyRefs}`);
console.log(`  Null division:      ${nullDiv} / ${profiles.length}`);
console.log(`  Null batchRef:      ${nullBatch} / ${profiles.length}`);
console.log(`  Null basho:         ${nullBasho} / ${profiles.length}`);

console.log('\n  Division breakdown:');
for (const [k, v] of Object.entries(divCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(14)} ${v}`);
}

console.log('\n  Profile confidence:');
for (const [k, v] of Object.entries(confCounts)) {
  if (v) console.log(`    ${k.padEnd(14)} ${v}`);
}

console.log('\n  Image confidence:');
for (const [k, v] of Object.entries(imgCounts)) {
  if (v) console.log(`    ${k.padEnd(14)} ${v}`);
}

console.log('\n  Provenance status:');
for (const [k, v] of Object.entries(provCounts)) {
  if (v) console.log(`    ${k.padEnd(14)} ${v}`);
}

const reviewQueues = buildReviewQueues(profiles);

console.log('\n  Action queues:');
for (const queue of reviewQueues) {
  console.log(`    ${queue.title.padEnd(28)} ${queue.items.length}`);
}

console.log('\n  Queue previews:');
for (const queue of reviewQueues) {
  printQueuePreview(queue);
}

if (REPORT_FILE) {
  const report = {
    generatedAt: new Date().toISOString(),
    canonicalFile: CANONICAL,
    validation: {
      errors,
      warnings,
      totalProfiles: profiles.length,
      emptySourceRefs: emptyRefs,
      nullDivision: nullDiv,
      nullBatchRef: nullBatch,
      nullLastVerifiedBasho: nullBasho,
      divisions: divCounts,
      profileConfidence: confCounts,
      imageConfidence: imgCounts,
      provenanceStatus: provCounts,
    },
    reviewQueues,
  };

  writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\n  Review report written to ${REPORT_FILE}`);
}

// ---------------------------------------------------------------------------
// Merge preview (--merge <file>)
// ---------------------------------------------------------------------------

if (MERGE_FILE) {
  console.log(`\n🔗  Merge preview: ${MERGE_FILE}\n`);

  if (!existsSync(MERGE_FILE)) {
    console.error(`❌  Merge file not found: ${MERGE_FILE}`);
    process.exit(1);
  }

  const candidates = JSON.parse(readFileSync(MERGE_FILE, 'utf8'));
  if (!Array.isArray(candidates)) {
    console.error('❌  Merge file root is not an array');
    process.exit(1);
  }

  let newCount = 0, conflictCount = 0, updateCount = 0;

  for (const c of candidates) {
    const normShikona = (c.shikona || '').trim().toLowerCase();
    if (!normShikona) {
      console.log(`  ⚠️  Candidate with empty shikona — skipped`);
      continue;
    }

    const existingIdx = seenShikona.get(normShikona);
    if (existingIdx === undefined) {
      // New profile
      newCount++;
      console.log(`  ➕  NEW: ${c.shikona} (${c.division || 'no division'})`);
    } else {
      // Existing — check for conflicts
      const existing = profiles[existingIdx];
      const conflicts = [];

      if (c.rikishiId && existing.rikishiId && c.rikishiId !== existing.rikishiId) {
        conflicts.push(`rikishiId: ${existing.rikishiId} → ${c.rikishiId}`);
      }
      if (c.heya && existing.heya && c.heya !== existing.heya) {
        conflicts.push(`heya: ${existing.heya} → ${c.heya}`);
      }
      if (c.status && existing.status && c.status !== existing.status) {
        conflicts.push(`status: ${existing.status} → ${c.status}`);
      }

      if (conflicts.length > 0) {
        conflictCount++;
        console.log(`  ⚠️  CONFLICT: ${c.shikona} — ${conflicts.join('; ')}`);
      } else {
        updateCount++;
        // Check which fields would be backfilled
        const fills = [];
        for (const f of [...NULLABLE_STRING_FIELDS, ...NULLABLE_NUMBER_FIELDS]) {
          if (!existing[f] && c[f]) fills.push(f);
        }
        if (fills.length > 0) {
          console.log(`  📝  UPDATE: ${c.shikona} — backfill: ${fills.join(', ')}`);
        }
      }
    }
  }

  console.log(`\n  Merge summary: ${newCount} new, ${updateCount} updates, ${conflictCount} conflicts`);
  console.log(`  Post-merge total: ${profiles.length + newCount} profiles`);
}

// ---------------------------------------------------------------------------
// Exit code
// ---------------------------------------------------------------------------

if (errors > 0) {
  console.log(`\n❌  Validation FAILED (${errors} errors)\n`);
  process.exit(1);
} else if (STRICT && warnings > 0) {
  console.log(`\n⚠️  Validation passed with ${warnings} warnings (--strict mode → exit 1)\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Validation PASSED${warnings > 0 ? ` (${warnings} warnings)` : ''}\n`);
  process.exit(0);
}
