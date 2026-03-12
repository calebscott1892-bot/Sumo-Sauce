#!/usr/bin/env node
/**
 * merge-research.mjs
 * ==================
 * Safe, deterministic merge of externally-researched profiles back into the
 * canonical dataset.
 *
 * Design principles:
 *   • Match by rikishiId (primary) then shikona (fallback)
 *   • NEVER silently overwrite — surface all conflicts
 *   • NEVER weaken confidence (imageConfidence / profileConfidence)
 *   • Preserve existing sourceRefs — append new ones
 *   • Preserve existing notes — append new ones (pipe-delimited)
 *   • Upgrade provenanceStatus: unresolved/quarantined → confirmed/inferred
 *   • Reject provenanceStatus downgrades (confirmed → inferred, etc.)
 *   • Dry-run by default — requires --apply to write
 *
 * Usage:
 *   node scripts/merge-research.mjs --file researched.json           # dry run
 *   node scripts/merge-research.mjs --file researched.json --apply   # write
 *   node scripts/merge-research.mjs --file researched.json --verbose # show all fields
 *
 * Input format:
 *   The --file should be either:
 *     a) The same envelope from export-unresolved.mjs (has ._meta + .profiles)
 *     b) A plain JSON array of profile objects
 *
 *   Each profile must have at least `rikishiId` or `shikona` for matching.
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args     = process.argv.slice(2);
const fileIdx  = args.indexOf('--file');
const APPLY    = args.includes('--apply');
const VERBOSE  = args.includes('--verbose');

if (fileIdx === -1 || !args[fileIdx + 1]) {
  console.error('Usage: node scripts/merge-research.mjs --file <researched.json> [--apply] [--verbose]');
  process.exit(1);
}

const RESEARCH_FILE = args[fileIdx + 1];
const CANONICAL     = 'data/makuuchi_verified_profiles.json';
const BACKUP_SUFFIX = `.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;

// ---------------------------------------------------------------------------
// Confidence strength ordering (higher index = stronger)
// ---------------------------------------------------------------------------

const IMAGE_CONF_ORDER   = ['missing', 'unverified', 'likely', 'verified'];
const PROFILE_CONF_ORDER = ['unverified', 'likely', 'verified'];
const PROV_STATUS_ORDER  = ['quarantined', 'unresolved', 'inferred', 'confirmed'];

function confRank(scale, val) {
  const idx = scale.indexOf(val);
  return idx === -1 ? -1 : idx;
}

// ---------------------------------------------------------------------------
// Load canonical dataset
// ---------------------------------------------------------------------------

const canonical = JSON.parse(readFileSync(CANONICAL, 'utf8'));
if (!Array.isArray(canonical)) {
  console.error('❌  Canonical file root is not an array');
  process.exit(1);
}

// Build lookup indexes
const byRikishiId = new Map();
const byShikona   = new Map();
for (let i = 0; i < canonical.length; i++) {
  const p = canonical[i];
  if (p.rikishiId) byRikishiId.set(p.rikishiId, i);
  const ns = (p.shikona || '').trim().toLowerCase();
  if (ns) byShikona.set(ns, i);
}

// ---------------------------------------------------------------------------
// Load researched profiles
// ---------------------------------------------------------------------------

const rawResearch = JSON.parse(readFileSync(RESEARCH_FILE, 'utf8'));
const researched  = Array.isArray(rawResearch)
  ? rawResearch
  : (rawResearch.profiles && Array.isArray(rawResearch.profiles))
    ? rawResearch.profiles
    : null;

if (!researched) {
  console.error('❌  Research file must be a JSON array or { profiles: [...] }');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Fields that can be backfilled (null → value) without conflict
// ---------------------------------------------------------------------------

const BACKFILL_FIELDS = [
  'rikishiId', 'heya', 'birthDate', 'nationality', 'heightCm', 'weightKg',
  'officialImageUrl', 'imageSource', 'division', 'batchRef',
];

// Fields that trigger a conflict if both sides have different non-null values
const CONFLICT_FIELDS = [
  'rikishiId', 'heya', 'birthDate', 'status',
];

// ---------------------------------------------------------------------------
// Merge engine
// ---------------------------------------------------------------------------

console.log(`\n🔀  Merge ${APPLY ? '(APPLY)' : '(DRY RUN)'}: ${RESEARCH_FILE} → ${CANONICAL}\n`);

let merged    = 0;
let skipped   = 0;
let conflicts = 0;
let newProfiles = 0;
const conflictLog = [];
const mergeLog    = [];

for (const r of researched) {
  // --- Match ---
  let idx = -1;
  let matchType = '';

  if (r.rikishiId && byRikishiId.has(r.rikishiId)) {
    idx = byRikishiId.get(r.rikishiId);
    matchType = 'rikishiId';
  } else {
    const ns = (r.shikona || '').trim().toLowerCase();
    if (ns && byShikona.has(ns)) {
      idx = byShikona.get(ns);
      matchType = 'shikona';
    }
  }

  if (idx === -1) {
    // No match — this is a truly new profile
    newProfiles++;
    console.log(`  ➕  NEW: ${r.shikona || '(unknown)'} — not in canonical dataset`);
    continue;
  }

  const existing = canonical[idx];
  const label    = `[${idx}] ${existing.shikona}`;

  // --- Detect conflicts ---
  const rowConflicts = [];

  for (const f of CONFLICT_FIELDS) {
    if (r[f] && existing[f] && r[f] !== existing[f]) {
      rowConflicts.push(`${f}: "${existing[f]}" → "${r[f]}"`);
    }
  }

  // --- Confidence downgrade checks ---
  if (r.imageConfidence &&
      confRank(IMAGE_CONF_ORDER, r.imageConfidence) < confRank(IMAGE_CONF_ORDER, existing.imageConfidence)) {
    rowConflicts.push(`imageConfidence downgrade: ${existing.imageConfidence} → ${r.imageConfidence}`);
  }
  if (r.profileConfidence &&
      confRank(PROFILE_CONF_ORDER, r.profileConfidence) < confRank(PROFILE_CONF_ORDER, existing.profileConfidence)) {
    rowConflicts.push(`profileConfidence downgrade: ${existing.profileConfidence} → ${r.profileConfidence}`);
  }

  // --- Provenance status downgrade check ---
  if (r.provenanceStatus &&
      confRank(PROV_STATUS_ORDER, r.provenanceStatus) < confRank(PROV_STATUS_ORDER, existing.provenanceStatus)) {
    rowConflicts.push(`provenanceStatus downgrade: ${existing.provenanceStatus} → ${r.provenanceStatus}`);
  }

  if (rowConflicts.length > 0) {
    conflicts++;
    const msg = `  ⚠️  CONFLICT: ${label} — ${rowConflicts.join('; ')}`;
    console.log(msg);
    conflictLog.push({ index: idx, shikona: existing.shikona, conflicts: rowConflicts });
    continue; // skip this row entirely — human must resolve
  }

  // --- Apply safe updates ---
  const changes = [];

  // Backfill null fields
  for (const f of BACKFILL_FIELDS) {
    if ((existing[f] === null || existing[f] === undefined) && r[f] != null) {
      if (APPLY) existing[f] = r[f];
      changes.push(`${f}: null → ${JSON.stringify(r[f])}`);
    }
  }

  // Upgrade confidence (only upward)
  if (r.imageConfidence &&
      confRank(IMAGE_CONF_ORDER, r.imageConfidence) > confRank(IMAGE_CONF_ORDER, existing.imageConfidence)) {
    if (APPLY) existing.imageConfidence = r.imageConfidence;
    changes.push(`imageConfidence: ${existing.imageConfidence} → ${r.imageConfidence}`);
  }
  if (r.profileConfidence &&
      confRank(PROFILE_CONF_ORDER, r.profileConfidence) > confRank(PROFILE_CONF_ORDER, existing.profileConfidence)) {
    if (APPLY) existing.profileConfidence = r.profileConfidence;
    changes.push(`profileConfidence: ${existing.profileConfidence} → ${r.profileConfidence}`);
  }

  // Upgrade provenanceStatus (only upward)
  if (r.provenanceStatus &&
      confRank(PROV_STATUS_ORDER, r.provenanceStatus) > confRank(PROV_STATUS_ORDER, existing.provenanceStatus)) {
    if (APPLY) existing.provenanceStatus = r.provenanceStatus;
    changes.push(`provenanceStatus: ${existing.provenanceStatus} → ${r.provenanceStatus}`);
  }

  // Merge sourceRefs (append new refs not already present)
  if (r.sourceRefs && Array.isArray(r.sourceRefs)) {
    const existingUrls = new Set((existing.sourceRefs || []).map(sr => sr.url));
    const newRefs = r.sourceRefs.filter(sr => !existingUrls.has(sr.url));
    if (newRefs.length > 0) {
      if (APPLY) existing.sourceRefs = [...(existing.sourceRefs || []), ...newRefs];
      changes.push(`sourceRefs: +${newRefs.length} new ref(s)`);
    }
  }

  // Append notes (pipe-delimited)
  if (r.notes && typeof r.notes === 'string' && r.notes.trim()) {
    const existingNotes = (existing.notes || '').trim();
    const newNote = r.notes.trim();
    // Only append if the new note text isn't already present
    if (!existingNotes.includes(newNote)) {
      const merged_notes = existingNotes ? `${existingNotes} | ${newNote}` : newNote;
      if (APPLY) existing.notes = merged_notes;
      changes.push('notes: appended');
    }
  }

  // Update lastVerifiedBasho if newer
  if (r.lastVerifiedBasho && (!existing.lastVerifiedBasho || r.lastVerifiedBasho > existing.lastVerifiedBasho)) {
    if (APPLY) existing.lastVerifiedBasho = r.lastVerifiedBasho;
    changes.push(`lastVerifiedBasho: ${existing.lastVerifiedBasho || 'null'} → ${r.lastVerifiedBasho}`);
  }

  if (changes.length > 0) {
    merged++;
    const detail = VERBOSE ? ` — ${changes.join('; ')}` : ` — ${changes.length} field(s)`;
    console.log(`  ✅  MERGE (${matchType}): ${label}${detail}`);
    mergeLog.push({ index: idx, shikona: existing.shikona, matchType, changes });
  } else {
    skipped++;
    if (VERBOSE) {
      console.log(`  ⏭️  SKIP: ${label} — no changes`);
    }
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n📊  Merge summary:');
console.log(`  Researched rows:  ${researched.length}`);
console.log(`  Merged:           ${merged}`);
console.log(`  Skipped (no-op):  ${skipped}`);
console.log(`  Conflicts:        ${conflicts}`);
console.log(`  New profiles:     ${newProfiles}`);

if (conflictLog.length > 0) {
  console.log('\n⚠️  Conflict details (these rows were NOT merged):');
  for (const c of conflictLog) {
    console.log(`  [${c.index}] ${c.shikona}:`);
    for (const issue of c.conflicts) {
      console.log(`       • ${issue}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Write (only if --apply)
// ---------------------------------------------------------------------------

if (APPLY && merged > 0) {
  // Create backup
  const backupPath = CANONICAL + BACKUP_SUFFIX;
  copyFileSync(CANONICAL, backupPath);
  console.log(`\n💾  Backup: ${backupPath}`);

  writeFileSync(CANONICAL, JSON.stringify(canonical, null, 2) + '\n');
  console.log(`✅  Written: ${CANONICAL} (${canonical.length} profiles)`);
  console.log('\n👉  Next: run  node scripts/validate-profiles.mjs  to verify\n');
} else if (APPLY && merged === 0) {
  console.log('\n⏭️  No changes to apply.\n');
} else {
  console.log(`\n🔍  Dry run — no files changed. Re-run with --apply to write.\n`);
}
