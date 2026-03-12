# BATCH E AUDIT REPORT

**Date:** 2026-03-12
**Auditor scope:** Pre/post data comparison, banzuke cross-reference, provenance analysis
**Constraint:** No new web research — audit & planning pass only

---

## 1 · BATCH E DAMAGE AUDIT

### What Batch E Did

| Action | Count | Details |
|--------|-------|---------|
| rikishiId resolved | 3 | Toshinofuji → 4243, Shimazuumi → 3404, Fujitensei → 4337 |
| Heya corrected | 1 | Shimazuumi: Hamanoshima → Hanaregoma |
| Profiles removed | 22 | All had `batchRef: juryo-roster`, null rikishiId, null birthDate, null nationality |
| BACKFILL_FIELDS updated | 1 | `rikishiId` added to merge-research.mjs |
| Net profile change | −22 | 495 → 473 |
| Net Juryo change | −22 | 27 → 5 |

### Profile-Level Comparison

**Pre-Batch-E (backup `2026-03-11T20-18-17-550Z`):**
- 495 total profiles, 27 Juryo
- All 27 Juryo had `batchRef: juryo-roster`, `profileConfidence: likely`, `provenanceStatus: confirmed`
- 2 had rikishiIds (Mita Taiki = 4289, Akua = 3312)
- 25 had null rikishiId, null birthDate, null nationality, null height/weight

**Post-Batch-E (current canonical):**
- 473 total profiles, 5 Juryo
- All 5 Juryo now have verified rikishiIds
- Division breakdown: Makuuchi 42 | Historical 17 | Juryo 5 | Sandanme 170 | Makushita 111 | Jonidan 86 | Jonokuchi 42

### The 22 Removed Profiles

All 22 shared an identical skeleton: null rikishiId, null birthDate, null nationality, null height/weight, `imageConfidence: missing`, `sourceRef` citing `"JSA Shin Jūryō list"` (URL: `sumo.or.jp/ResultBanzuke/shin_juryo/`).

| # | Shikona | Heya field | Notes snippet |
|---|---------|-----------|---------------|
| 1 | Ageha | Isenoumi | "roster (East)" |
| 2 | Kagamiiwa | Oshima | "roster (East)" |
| 3 | Izushio | Ikazuchi | "roster (East)" |
| 4 | Hiranoumi | Kise | "roster (East)" |
| 5 | Shachihoko | Oitekaze | "roster (East)" |
| 6 | Tokitsunami | Takasago | "roster (East)" |
| 7 | Mizuhiki | Asakayama | "roster (East)" |
| 8 | Hakkaku | Kōbōyama | "roster (East)" |
| 9 | Yatsugamine | Tamagawa | "roster (East)" |
| 10 | Onikatsu | Onoe | "roster (East)" |
| 11 | Yotsuguruma | Oho | "roster (West)" |
| 12 | Takinooto | Tagonoura | "roster (West)" |
| 13 | Kumagatake | Onomatsu | "roster (West)" |
| 14 | Shibatoyama | null | "Retired after Day 1" |
| 15 | Araumi | Dewanoumi | "roster (West)" |
| 16 | Onuma | null | "Stable unconfirmed" |
| 17 | Azumagatake | Takadagawa | "roster (West)" |
| 18 | Sanoyama | Sanoyama | "roster (West)" |
| 19 | Nishikido | Asakayama | "roster (West)" |
| 20 | Musashino | Naruto | "roster (West)" |
| 21 | Asogamori | null | "Debuting sekitori" |
| 22 | Tateiwa | Nishonoseki | "Debuting sekitori" |

**Key diagnostic:** Every one of these names is a **toshiyori (elder/coach) name** from the JSA organizational structure — not an active wrestler's ring name. Hakkaku is the JSA Chairman. Sanoyama, Nishikido, Isenoumi, Oshima, etc. are all recognized toshiyori-myōseki. The `heya` fields confirm this — several have heya values that are themselves stable names (Sanoyama heya → Sanoyama, Isenoumi-beya → Ageha).

**Root cause:** The original `juryo-roster` batch import scraped or transcribed the JSA's Shin Jūryō page and incorrectly included toshiyori names that appear alongside wrestler data on JSA pages (e.g. as shinpan judges, stable masters, or organizational listings). The source URL itself (`/ResultBanzuke/shin_juryo/`) is the "New to Jūryō" page, not the full Jūryō banzuke.

### Damage Verdict

**The 22 removals were factually correct.** Zero of the 22 names appear on the real Haru 2026 Juryo banzuke. They are not wrestlers — they cannot be "fixed," only removed.

**However, the removals were operationally premature.** They reduced Juryo from 27 rows to 5 without simultaneously replacing coverage. The net result is a dataset that claims to cover Juryo but covers only 18% of the real division.

---

## 2 · TRUE JURYO COVERAGE ASSESSMENT

### Real Haru 2026 Juryo Banzuke (28 positions)

Cross-referenced against the current dataset:

| Rank | Shikona | In Dataset? | Current Division | rikishiId | Status |
|------|---------|-------------|-----------------|-----------|--------|
| J1e | Onosho | ❌ MISSING | — | — | Needs creation |
| J1w | Nishikigi | ❌ MISSING | — | — | Needs creation |
| J2e | Tsurugisho | ❌ MISSING | — | — | Needs creation |
| J2w | Tohakuryu | ❌ MISSING | — | — | Needs creation |
| J3e | Chiyosakae | ✅ present | **Jonidan** ⚠️ | null | Needs division fix + rikishiId |
| J3w | Daiseizan | ❌ MISSING | — | — | Needs creation |
| J4e | Asasuiryu | ❌ MISSING | — | — | Needs creation |
| J4w | Nishinoryu | ❌ MISSING | — | — | Needs creation |
| J5e | Takerufuji | ❌ MISSING | — | — | Needs creation |
| J5w | Toshinofuji | ✅ Juryo | Juryo ✔️ | 4243 ✔️ | **Correct** |
| J6e | Hakuyozan | ❌ MISSING | — | — | Needs creation |
| J6w | Chiyomaru | ✅ present | **Sandanme** ⚠️ | null | Needs division fix + rikishiId |
| J7e | Shimazuumi | ✅ Juryo | Juryo ✔️ | 3404 ✔️ | **Correct** |
| J7w | Kazekeno | ❌ MISSING | — | — | Needs creation |
| J8e | Kotokuzan | ❌ MISSING | — | — | Needs creation |
| J8w | Meisei | ❌ MISSING | — | — | Needs creation |
| J9e | Kyokukaiyu | ❌ MISSING | — | — | Needs creation |
| J9w | Fujitensei | ✅ Juryo | Juryo ✔️ | 4337 ✔️ | **Correct** |
| J10e | Kitanowaka | ❌ MISSING | — | — | Needs creation |
| J10w | Dewanoryu | ❌ MISSING | — | — | Needs creation |
| J11e | Tsurubayashi | ✅ present | **Makushita** ⚠️ | 3177 ✔️ | Needs division fix |
| J11w | Tamashoho | ❌ MISSING | — | — | Needs creation |
| J12e | Shimanoumi | ❌ MISSING | — | — | Needs creation |
| J12w | Mita Taiki | ✅ Juryo | Juryo ✔️ | 4289 ✔️ | **Correct** |
| J13e | Asakoryu | ❌ MISSING* | — | — | Needs creation |
| J13w | Daitensho | ❌ MISSING | — | — | Needs creation |
| J14e | Akua | ✅ Juryo | Juryo ✔️ | 3312 ✔️ | **Correct** |
| J14w | *(TBD)* | ❌ MISSING | — | — | Needs research |

> *\*Asakoryu (Juryo J13e) is a different wrestler from Asakoryu Takuma (Makuuchi, rikishiId 4101). The Juryo Asakoryu needs a separate profile.*

### Coverage Summary

| Category | Count | Names |
|----------|-------|-------|
| ✅ Correctly in Juryo | 5 | Toshinofuji, Shimazuumi, Fujitensei, Mita Taiki, Akua |
| ⚠️ In dataset, wrong division | 3 | Chiyosakae (Jonidan), Chiyomaru (Sandanme), Tsurubayashi (Makushita) |
| ❌ Completely missing | 19–20 | Onosho, Nishikigi, Tsurugisho, Tohakuryu, Daiseizan, Asasuiryu, Nishinoryu, Takerufuji, Hakuyozan, Kazekeno, Kotokuzan, Meisei, Kyokukaiyu, Kitanowaka, Dewanoryu, Tamashoho, Shimanoumi, Asakoryu (Juryo), Daitensho, J14w(TBD) |

**True Juryo coverage: 8/28 wrestlers present in dataset (29%), only 5/28 correctly tagged as Juryo (18%).**

**"Juryo = 5" is NOT acceptable.** But "Juryo = 27 with 22 fakes" was also not acceptable. The dataset has never had proper Juryo coverage.

---

## 3 · SAFE CORRECTION PLAN

### Evaluated Options

| Option | Description | Risk | Verdict |
|--------|-------------|------|---------|
| **A: Full revert** | Restore all 22 toshiyori profiles from backup | Restores 22 rows of confirmed non-wrestler data. Zero coverage gain. | ❌ **REJECTED** |
| **B: Keep removals + backfill** | Keep the clean 5. Fix 3 wrong-division profiles. Create 19-20 new real profiles. | Requires research batch but produces real coverage. | ✅ **RECOMMENDED** |
| **C: Partial revert** | Restore a subset of the 22 | No valid subset — none of the 22 are real wrestlers. | ❌ **REJECTED** |

### Recommended Path: Option B — Keep + Fix + Backfill

**Phase 1 — Immediate safe corrections (no research needed):**

Three wrestlers already exist in the dataset but with stale division tags from lower-division batches. These can be corrected NOW based on the known banzuke:

| Shikona | Current Division | Correct Division | Current batchRef | rikishiId |
|---------|-----------------|-----------------|-----------------|-----------|
| Chiyosakae | Jonidan | **Juryo** | jonidan-1-80 | null (needs research) |
| Chiyomaru | Sandanme | **Juryo** | sandanme-1-50 | null (needs research) |
| Tsurubayashi | Makushita | **Juryo** | makushita-41-60 | 3177 ✔️ |

> Division corrections are safe — these are promotions confirmed by the official banzuke. The batchRef should be updated to `juryo-roster` to reflect the current division assignment.

**Phase 2 — Research batch ("Batch F: Juryo Population"):**

A new research batch is needed to create profiles for the 19-20 completely missing Juryo wrestlers. This requires:
- SumoDB/sumo.or.jp lookups for rikishiId, birthDate, nationality, heya, height, weight
- Two of the Phase 1 wrestlers (Chiyosakae, Chiyomaru) also need rikishiId resolution
- The J14w slot needs identification

**Batch F scope:**
- 19-20 new profile creations
- 2 rikishiId lookups for existing profiles (Chiyosakae, Chiyomaru)
- 1 identity confirmation (J14w)
- Source: SumoDB banzuke page + individual rikishi pages

### What NOT to Do

- **Do NOT revert the 22 removals.** They are confirmed non-wrestlers. Restoring them adds zero real coverage and re-contaminates the dataset.
- **Do NOT mark the 22 removals as "lost coverage."** They never represented real coverage — the original batch was 81% contaminated at source.
- **Do NOT treat this as a Batch E failure.** Batch E correctly identified and removed contaminated data. The failure was the original `juryo-roster` import, which sourced from the Shin Jūryō page and mixed toshiyori names with wrestler names.

---

## 4 · FILES CHANGED

### This Audit Pass

| File | Action | Purpose |
|------|--------|---------|
| `data/_quarantine_batch_e_removed.json` | **CREATED** | Archive of the 22 removed profiles with classification labels. Non-destructive preservation for audit trail. |
| `docs/BATCH_E_AUDIT.md` | **CREATED** | This report |
| `scripts/_audit_batch_e.mjs` | TEMP | Pre/post comparison script (can be deleted) |
| `scripts/_audit_coverage.mjs` | TEMP | Banzuke cross-reference script (can be deleted) |
| `scripts/_audit_deep.mjs` | TEMP | Provenance analysis script (can be deleted) |
| `scripts/_audit_removed.mjs` | TEMP | Removed profile extractor (can be deleted) |

### No Data Changes Made

The canonical dataset (`data/makuuchi_verified_profiles.json`) was **NOT modified** during this audit. The Phase 1 division corrections and Phase 2 backfill are deferred pending approval.

---

## 5 · FINAL RECOMMENDATION

### Verdict: DO NOT REVERT. Proceed to coverage recovery.

The Batch E removals were **factually correct** — all 22 profiles were toshiyori/elder names that never represented real wrestlers. Reverting would re-contaminate the dataset with zero coverage benefit.

The real problem is **not Batch E** — it's that the original `juryo-roster` import was 81% contaminated at source, and the dataset has **never** had proper Juryo coverage. Even at "27 Juryo," only 5 were real.

### Immediate Next Steps

1. **Approve Phase 1 division corrections** for Chiyosakae, Chiyomaru, and Tsurubayashi (raises Juryo from 5 → 8 with no research needed)
2. **Plan Batch F** — Full Juryo Population research batch covering 19-20 missing wrestlers + 2 rikishiId lookups (requires web research, deferred per audit constraint)
3. **Clean up temp audit scripts** — Delete `_audit_*.mjs` files from `scripts/`
4. **Update VERIFIED_PROFILES_FORMAT.md** — Correct the Juryo batch count from 25 to reflect actual state

### Target End State

After Batch F completion:
- **28 Juryo profiles**, all with verified rikishiIds, heya, and banzuke positions
- **~479+ total profiles** (473 current + ~6 net new after division moves)
- `batchRef: juryo-roster` exclusively containing real active Juryo wrestlers
- Full coverage J1e through J14w for Haru 2026

---

*Quarantine archive: `data/_quarantine_batch_e_removed.json` (22 profiles)*
*Pre-Batch-E backup preserved: `data/makuuchi_verified_profiles.json.backup-2026-03-11T20-18-17-550Z`*
