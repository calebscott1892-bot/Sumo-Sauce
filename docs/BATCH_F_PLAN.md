# Batch F — Full Juryo Population

**Status:** CLOSE-OUT PREPARATION COMPLETE — awaiting final research batch  
**Basho:** Haru 2026 (202603)  
**Target:** 28 Juryo slots (J1e – J14w)  
**Final gap file:** `data/batch-f-final-juryo-gaps.json`  
**Ingest script:** `scripts/ingest-juryo-final.mjs`

---

## What Has Been Completed

| Phase | Profiles | Details |
|-------|----------|---------|
| Phase 1 (division fixes) | 3 | Chiyosakae, Chiyomaru, Tsurubayashi moved to Juryo |
| Batch F round 1 (research) | 6 new | Kazuma, Hatsuyama, Nishikigi, Tohakuryu, Tamashoho, Wakanosho |
| Enrichment | 1 | Shimazuumi weight updated (155→150) |
| **Current Juryo total** | **14** | |

## What Remains — 19 Cases

### ENRICH existing profiles (2) — need rikishiId + biometrics

| Rank | Shikona | Heya | Missing |
|------|---------|------|---------|
| J3e | Chiyosakae | Kokonoe | rikishiId, birthDate, nationality, height, weight |
| J6w | Chiyomaru | Kise | rikishiId, birthDate, nationality, height, weight |

### ENRICH existing profiles (2) — nationality only

| Rank | Shikona | rikishiId | Heya | Missing |
|------|---------|-----------|------|---------|
| J14e | Akua | 3312 | Tatsunami | nationality |
| J11e | Tsurubayashi | 3177 | Kise | nationality |

### NEW profiles needed (14)

| Rank | Shikona | Notes |
|------|---------|-------|
| J1e | Onosho | |
| J2e | Tsurugisho | |
| J3w | Daiseizan | |
| J4e | Asasuiryu | |
| J4w | Nishinoryu | |
| J5e | Takerufuji | |
| J6e | Hakuyozan | |
| J7w | Kazekeno | |
| J8e | Kotokuzan | |
| J8w | Meisei | |
| J9e | Kyokukaiyu | |
| J10e | Kitanowaka | |
| J10w | Dewanoryu | |
| J12e | Shimanoumi | |

### SPECIAL CASES (2)

| Rank | Shikona | Issue |
|------|---------|-------|
| J13e | Asakoryu | ⚠️ Different wrestler from Asakoryu Takuma (Makuuchi, id 4101) — must verify correct rikishiId |
| J13w | Daitensho | Standard new profile |

### UNIDENTIFIED (1)

| Rank | Issue |
|------|-------|
| J14w | Wrestler at this position is unknown — must identify from official JSA banzuke first |

## What a Research Agent Must Return

A single JSON array saved to `data/resolved-f-final-juryo.json` containing:

1. **For the 2 ENRICH cases** (Chiyosakae, Chiyomaru): objects with `shikona` + the missing fields
2. **For the 2 nationality-only cases** (Akua, Tsurubayashi): objects with `shikona` + `nationality`
3. **For all 14 NEW cases + Asakoryu + Daitensho**: full profile objects with at minimum: `rikishiId`, `shikona`, `heya`, `birthDate`, `nationality`, `heightCm`, `weightKg`
4. **For J14w**: identify the wrestler, then return full profile object

Each profile object must include a `sourceRefs` array with at least one JSA or SumoDB URL.

## How to Ingest

```bash
# Preview changes
node scripts/ingest-juryo-final.mjs --dry-run

# Apply (creates backup automatically)
node scripts/ingest-juryo-final.mjs --apply

# Validate
node scripts/validate-profiles.mjs

# Build
npx vite build
```

## Expected End State

- **28 Juryo profiles** with verified rikishiIds, all banzuke slots J1e–J14w filled
- **~493+ total profiles**
- `batchRef: juryo-roster` on all Juryo profiles
- Zero null rikishiId in Juryo
- Zero null birthDate in Juryo
