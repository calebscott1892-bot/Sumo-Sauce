# Verified Makuuchi Profiles — File Format

## Location

```
data/makuuchi_verified_profiles.json
```

## Purpose

Authoritative, JSA-sourced profile data for current Makuuchi roster wrestlers
and historical legends (Yokozuna/Ōzeki from 2000–present).
Used by the frontend adapter at `src/data/verifiedProfiles.ts` to enrich
wrestler profile pages with verified images and biographical data.

## Schema

The file is a JSON array of profile objects:

```jsonc
[
  {
    "rikishiId": "3842",                // JSA numeric rikishi ID (string)
    "shikona": "Hoshoryu Tomokatsu",    // Full ring name (shikona + given name)
    "heya": "Tatsunami",                // Stable name
    "birthDate": "1999-05-22",          // ISO 8601 date
    "nationality": "Mongolia",          // Country or Japanese prefecture
    "heightCm": 188,                    // Height in centimetres
    "weightKg": 148,                    // Weight in kilograms
    "status": "active",                 // "active" | "retired"
    "officialImageUrl": "https://...",  // JSA profile image URL
    "imageSource": "Japan Sumo Association official rikishi profile image",
    "imageConfidence": "verified",      // "verified" | "likely"
    "profileConfidence": "verified",    // "verified" | "likely"
    "sourceRefs": [                     // Provenance chain
      { "label": "JSA Find Rikishi (makuuchi roster)", "url": "https://..." },
      { "label": "JSA rikishi profile", "url": "https://..." },
      { "label": "JSA profile image", "url": "https://..." }
    ],
    "notes": "..."                      // Free-text provenance notes
  }
]
```

## Field semantics

| Field | Required | Description |
|-------|----------|-------------|
| `rikishiId` | ✅ | JSA numeric identifier, unique per rikishi |
| `shikona` | ✅ | Full ring name as listed on JSA English site |
| `heya` | ✅ | Stable (training stable) name |
| `birthDate` | ✅ | ISO 8601 date string |
| `nationality` | ✅ | Country name for non-Japanese; Japanese prefecture for Japanese-born |
| `heightCm` | ✅ | Integer, centimetres |
| `weightKg` | ✅ | Integer, kilograms |
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

## Matching strategy

The adapter matches profiles to existing rikishi data via **shikona**:
- Full form: `"Hoshoryu Tomokatsu"` → matches `"hoshoryu tomokatsu"`
- Short form: `"Hoshoryu"` → matches `"hoshoryu"` (first token)

This avoids coupling to any internal ID scheme (`rks_XXXX`, `R001`, etc.).
