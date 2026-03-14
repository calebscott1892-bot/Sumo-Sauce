# Batch F — Full Juryo Population

**Status:** HISTORICAL WORKFLOW ARTIFACT — retired as roster authority on 2026-03-13  
**Basho:** Haru 2026 (202603)  
**Final gap file:** `data/batch-f-final-juryo-gaps.json`  
**Ingest script:** `scripts/ingest-juryo-final.mjs`

This document reflects the original Batch F workflow and must not be used as the authoritative March 2026 Juryo roster definition. Later official evidence confirmed additional valid Juryo-context wrestlers that were not present in the old target list.

---

## Applied in This Round

- Enriched existing Juryo profiles:
	- Chiyosakae (`rikishiId`, birthdate, nationality, height, weight)
	- Chiyomaru (`rikishiId`, birthdate, nationality, height, weight)
	- Akua (nationality)
	- Tsurubayashi (nationality)
- Added new Juryo profiles:
	- Onosho
	- Tsurugisho
	- Daiseizan
	- Asasuiryu
	- Nishinoryu
	- Takerufuji
	- Kazekeno
	- Kotokuzan
	- Meisei
	- Kitanowaka
	- Dewanoryu
	- Daitensho
- Corrected existing `rikishiId` collisions as canonical updates:
	- `3334`: Shiratakeyama → Hakuyozan (set to Juryo)
	- `3415`: Shimano Umi → Shimanoumi (set to Juryo)

## Final Manual Review Cases (Resolved)

1. **Asakoryu identity conflict**
	 - Resolved as same identity as Asakoryu Takuma (`rikishiId` 4101).
	 - Applied as canonical update; no duplicate profile created.

2. **J14w unidentified slot**
	 - Resolved to Kotokuzan (`rikishiId` 3218).
	 - Existing profile confirmed and retained; no duplicate profile created.

## Validation Snapshot

- `node scripts/validate-profiles.mjs`: **PASS** (warnings only; no errors)
- `npx vite build`: **PASS**
