# Verified Rikishi Profiles — File Format

## Location

```
data/makuuchi_verified_profiles.json
```

## Purpose

Authoritative, JSA-sourced profile data for current Makuuchi roster wrestlers,
historical legends (Yokozuna/Ōzeki from 2000–present), and Jūryō division.
Used by the frontend adapter at `src/data/verifiedProfiles.ts` to enrich
wrestler profile pages with verified images and biographical data.

## Schema

The file is a JSON array of profile objects:

```jsonc
[
  {
    "rikishiId": "3842",                // JSA numeric rikishi ID (string or null)
    "shikona": "Hoshoryu Tomokatsu",    // Full ring name (shikona + given name)
    "heya": "Tatsunami",                // Stable name (or null if unknown)
    "birthDate": "1999-05-22",          // ISO 8601 date (or null)
    "nationality": "Mongolia",          // Country or prefecture (or null)
    "heightCm": 188,                    // Height in centimetres (or null)
    "weightKg": 148,                    // Weight in kilograms (or null)
    "status": "active",                 // "active" | "retired"
    "officialImageUrl": "https://...",  // JSA profile image URL (or null)
    "imageSource": "Japan Sumo Association official rikishi profile image",
    "imageConfidence": "verified",      // "verified" | "likely" | "missing"
    "profileConfidence": "verified",    // "verified" | "likely"
    "sourceRefs": [                     // Provenance chain
      { "label": "JSA Find Rikishi (makuuchi roster)", "url": "https://..." }
    ],
    "notes": "...",                     // Free-text provenance notes
    "division": "Makuuchi",             // Machine-readable division (or null)
    "batchRef": "makuuchi-roster",      // Canonical batch identifier (or null)
    "lastVerifiedBasho": "202603",      // Basho this profile was verified against
    "provenanceStatus": "confirmed"     // "confirmed" | "inferred" | "unresolved" | "quarantined"
  }
]
```

## Field semantics

| Field | Required | Description |
|-------|----------|-------------|
| `rikishiId` | ✅ | JSA numeric identifier (string), or `null` if unknown |
| `shikona` | ✅ | Ring name as listed on JSA English site |
| `heya` | ✅ | Stable (training stable) name, or `null` if unknown |
| `birthDate` | ✅ | ISO 8601 date string, or `null` if unknown |
| `nationality` | ✅ | Country name or Japanese prefecture, or `null` if unknown |
| `heightCm` | ✅ | Integer centimetres, or `null` if unknown |
| `weightKg` | ✅ | Integer kilograms, or `null` if unknown |
| `status` | ✅ | `"active"` or `"retired"` |
| `officialImageUrl` | ✅ | HTTPS URL to JSA profile image (270×474px), or `null` if unavailable |
| `imageSource` | ✅ | Human-readable image provenance, or `null` if no image |
| `imageConfidence` | ✅ | `"verified"` = confirmed via fetch; `"likely"` = URL derived but fetch failed; `"missing"` = no image URL available |
| `profileConfidence` | ✅ | `"verified"` = confirmed on JSA roster |
| `sourceRefs` | ✅ | Array of `{ label, url }` provenance links |
| `notes` | ✅ | Free-text notes (may be empty string) |
| `division` | ✅ | Machine-readable division: `"Makuuchi"`, `"Juryo"`, `"Makushita"`, `"Sandanme"`, `"Jonidan"`, `"Jonokuchi"`, `"Historical"`, or `null` if unknown |
| `batchRef` | ✅ | Canonical batch identifier string (see table below), or `null` if unknown |
| `lastVerifiedBasho` | ✅ | Basho code this profile was verified against (e.g. `"202603"` for Haru 2026) |
| `provenanceStatus` | ✅ | `"confirmed"` = direct evidence; `"inferred"` = structural/legacy evidence; `"unresolved"` = cannot safely assign; `"quarantined"` = serious data quality issue |

## Image confidence policy

The frontend only displays images when **all** conditions are true:
1. `officialImageUrl` is a non-empty HTTPS URL (not `null`)
2. `imageConfidence === "verified"`

When `imageConfidence === "likely"`, the URL is stored but **not rendered** —
the UI shows a placeholder avatar instead.

When `imageConfidence === "missing"`, `officialImageUrl` is `null` — no image
was extractable from JSA. The UI shows a placeholder avatar.

## Extending the dataset

Add entries to the same JSON array. The adapter builds indexes at module
load time and handles any number of entries. No code changes needed to
support additional divisions or historical batches — just add rows.

New entries **must** include the three provenance fields:
- `division` — one of the valid division strings, or `null`
- `batchRef` — a canonical batch identifier string matching an entry in the
  batch table, or `null`
- `lastVerifiedBasho` — the basho code (YYYYMM) this profile was verified against

## Provenance metadata

The `division`, `batchRef`, and `lastVerifiedBasho` fields provide machine-readable
provenance for each profile. They were added in March 2026 by content-based
inference from each profile's `sourceRefs` labels and `notes` text.

**Inference rules (priority order for `division`):**
1. sourceRef label contains "makuuchi roster" → `"Makuuchi"`
2. Notes or sourceRef mention "Jūryō" / "Juryo" → `"Juryo"`
3. `status === "retired"` with no active-division signals → `"Historical"`
4. Notes mention "Jonokuchi" → `"Jonokuchi"`
5. Notes mention "Jonidan" → `"Jonidan"`
6. Notes or sourceRef mention "Sandanme" → `"Sandanme"`
7. Notes or sourceRef mention "Makushita" → `"Makushita"`
8. Otherwise → `null` (147 profiles; mostly batches 12–14 with generic notes)

**Valid `batchRef` values:**

| batchRef | Division | Rank Range |
|----------|----------|------------|
| `makuuchi-roster` | Makuuchi | Full roster |
| `historical-legends` | Historical | Yokozuna/Ōzeki 2000–present |
| `juryo-roster` | Jūryō | Full roster |
| `sandanme-1-50` | Sandanme | E+W 1–50 |
| `sandanme-51-80` | Sandanme | Selected 51–80 |
| `sandanme` | Sandanme | Range unknown |
| `makushita-1-20` | Makushita | E+W 1–20 |
| `makushita-21-40` | Makushita | E+W 21–40 |
| `makushita-41-60` | Makushita | E+W 41–60 |
| `makushita` | Makushita | Range unknown |
| `jonidan-1-80` | Jonidan | 1–80 |
| `jonidan-81-100` | Jonidan | E+W 81–100 |
| `jonidan-81-160` | Jonidan | Selected 81–160 |
| `jonidan` | Jonidan | Range unknown |
| `jonokuchi` | Jonokuchi | Full division |

**Current batches (consolidated March 2026):**

| Batch | Division / Range | Profiles | Notes |
|-------|-----------------|----------|-------|
| Makuuchi | Active roster | 42 | JSA-verified with images |
| Historical | Yokozuna & Ōzeki 2000–present | 17 | Retired legends |
| Jūryō | Full roster, Haru 2026 | 25 | JSA-verified |
| Makushita 1–20 | E+W, Haru 2026 | 39 | 1 skipped as duplicate |
| Makushita 21–40 | E+W, Haru 2026 | 40 | Batch 12 |
| Makushita 41–60 | E+W, Haru 2026 | 22 | 2 unverified, flagged |
| Sandanme 1–50 | E+W, Haru 2026 | 100 | Full coverage |
| Sandanme 51–80 | Selected, Haru 2026 | 7 | 3 skipped as Sd1–50 dupes |
| Sandanme / lower-Makushita | Mixed, Haru 2026 | 56 | Batch 14 |
| Jonidan 1–80 | Haru 2026 | 42 | 4 unverified/flagged |
| Jonidan 81–100 | E+W, Haru 2026 | 40 | Batch 15 |
| Jonokuchi | Full division, Haru 2026 | 42 | All JSA-verified |
| Jonidan 81–160 (early) | Selected, Haru 2026 | 15 | 1 duplicate skipped |
| **Total (after dedup)** | | **496** | 12 cross-batch dupes resolved |

**Consolidation notes (March 2026):**
- 12 duplicate-shikona pairs were resolved by merging the best data from each entry
- Merge preserved the stronger profileConfidence value and backfilled null fields
- All sourceRefs were merged and deduplicated by URL
- 9 profiles remain with empty sourceRefs (all unverified/sparse — flagged for review)
- 172 profiles have null rikishiId (mostly Jonokuchi and sparse lower-division entries)

## Matching strategy

The adapter matches profiles to existing rikishi data via **shikona**:
- Full form: `"Hoshoryu Tomokatsu"` → matches `"hoshoryu tomokatsu"`
- Short form: `"Hoshoryu"` → matches `"hoshoryu"` (first token)

This avoids coupling to any internal ID scheme (`rks_XXXX`, `R001`, etc.).
