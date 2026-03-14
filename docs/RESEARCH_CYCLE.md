# Research Cycle Workflow

How to resolve remaining unresolved/quarantined profiles in the canonical dataset.

## Overview

```
Export  →  Research  →  Merge  →  Validate
```

| Step | Command | What it does |
|------|---------|--------------|
| 1 | `node scripts/export-unresolved.mjs` | Exports all unresolved + quarantined profiles |
| 2 | *(external / manual)* | Research missing fields for exported profiles |
| 3 | `node scripts/merge-research.mjs --file <returned.json>` | Dry-run merge preview |
| 4 | `node scripts/merge-research.mjs --file <returned.json> --apply` | Apply merge |
| 5 | `node scripts/validate-profiles.mjs` | Validate canonical dataset |
| 6 | `npx vite build` | Confirm build passes |

---

## Step 1 — Export unresolved cases

```bash
node scripts/export-unresolved.mjs
```

Output: `data/unresolved_profiles.json`

Options:
- `--out <path>` — custom output path
- `--unresolved` — unresolved only (skip quarantined)
- `--quarantined` — quarantined only

The export includes a `_meta` envelope with instructions for the researcher,
plus the full profile array with all existing fields preserved.

---

## Step 2 — Research

Hand off `data/unresolved_profiles.json` to the research workflow.

**What the researcher should do for each profile:**
1. Look up the wrestler by `rikishiId` on JSA / SumoDB / similar
2. Fill in `division` (e.g. "Makushita", "Sandanme", "Jonidan")
3. Fill in any other missing fields (heya, nationality, image, etc.)
4. Set `provenanceStatus` to `"confirmed"` when verified
5. Add a `sourceRef` entry for the source used
6. Append a research note to `notes` (pipe-delimited)

**What the researcher must NOT do:**
- Change `rikishiId` (it's the primary match key)
- Downgrade `profileConfidence` or `imageConfidence`
- Remove existing `sourceRefs`

Return the researched profiles in the same schema:
either the same `{ _meta, profiles }` envelope, or a plain JSON array.

---

## Step 3 — Dry-run merge

```bash
node scripts/merge-research.mjs --file data/researched_profiles.json
```

This previews what will happen without writing anything.  Review the output:
- `✅ MERGE` — safe updates that will be applied
- `⚠️ CONFLICT` — rows that need manual resolution (not auto-merged)
- `➕ NEW` — profiles not in the canonical set (won't be auto-added)
- `⏭️ SKIP` — no changes needed

Add `--verbose` to see per-field details for every row.

---

## Step 4 — Apply merge

```bash
node scripts/merge-research.mjs --file data/researched_profiles.json --apply
```

This will:
1. Create a timestamped backup of the canonical file
2. Apply all safe updates (backfills, confidence upgrades, provenance upgrades)
3. Skip all conflicts (logged but not written)
4. Print next-step instructions

---

## Step 5 — Validate

```bash
node scripts/validate-profiles.mjs
```

Expected: 0 errors.  Warnings should decrease as unresolved rows get resolved.

The summary now includes a provenance status breakdown:
```
  Provenance status:
    confirmed      349 + newly confirmed
    inferred        47
    unresolved      99 - newly resolved
    quarantined      1
```

---

## Step 6 — Build

```bash
npx vite build
```

Confirm the build passes clean.

---

## Safety guarantees

The merge script enforces these invariants:

| Rule | Enforcement |
|------|-------------|
| Identity match by `rikishiId` first, `shikona` fallback | Prevents mismatches |
| No confidence downgrades | `imageConfidence`, `profileConfidence` can only go up |
| No provenance downgrades | `provenanceStatus` can only go from weaker → stronger |
| Conflict surfacing | Conflicting non-null values are logged, row is skipped |
| Null backfill only | Non-null existing fields are never overwritten |
| sourceRefs append-only | Existing refs preserved, new refs deduplicated by URL |
| Notes append-only | Existing notes preserved, new text appended with ` | ` delimiter |
| Backup before write | Timestamped backup created before any write |
| Dry-run default | Must pass `--apply` to write |

---

## Targeting subsets

To research a smaller batch first (recommended):

```bash
# Export only quarantined (1 profile — quick win)
node scripts/export-unresolved.mjs --quarantined --out data/quarantined_batch.json

# Export only unresolved
node scripts/export-unresolved.mjs --unresolved --out data/unresolved_batch.json
```

You can also manually filter the export JSON by division hint, confidence level,
or sourceRef pattern before sending it for research.

---

## File inventory

| File | Purpose |
|------|---------|
| `scripts/export-unresolved.mjs` | Export unresolved/quarantined profiles |
| `scripts/merge-research.mjs` | Safe merge of researched results |
| `scripts/validate-profiles.mjs` | Canonical dataset validator |
| `data/makuuchi_verified_profiles.json` | Canonical dataset (496 profiles) |
| `data/unresolved_profiles.json` | Latest unresolved export |
| `data/VERIFIED_PROFILES_FORMAT.md` | Schema documentation |
