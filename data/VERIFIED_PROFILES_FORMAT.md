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
    "notes": "..."                      // Free-text provenance notes
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

**Current batches:**
- Makuuchi active roster (42 wrestlers)
- Historical Yokozuna & Ōzeki, 2000–present (17 wrestlers)
- Jūryō roster, Haru 2026 (25 wrestlers)
- Sandanme 1–50 (East + West), Haru 2026 (100 wrestlers)
- Makushita 1–10 (East + West), Haru 2026 (20 wrestlers)
- Makushita 11–20 (East + West), Haru 2026 (19 wrestlers — 1 skipped as duplicate)
- Makushita 41–60 (East + West), Haru 2026 (21 wrestlers — 2 unverified, flagged for manual review)
- Sandanme 51–80 (selected), Haru 2026 (7 wrestlers — 3 skipped as duplicates from Sandanme 1–50)
- Jonidan 1–80, Haru 2026 (42 wrestlers — 2 verified, 36 likely, 4 unverified/flagged for manual review)

## Matching strategy

The adapter matches profiles to existing rikishi data via **shikona**:
- Full form: `"Hoshoryu Tomokatsu"` → matches `"hoshoryu tomokatsu"`
- Short form: `"Hoshoryu"` → matches `"hoshoryu"` (first token)

This avoids coupling to any internal ID scheme (`rks_XXXX`, `R001`, etc.).
