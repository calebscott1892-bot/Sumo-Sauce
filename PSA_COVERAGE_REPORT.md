# PSA Coverage Report — Prompt Set A vs Base44 Transcript

Scope: Audit `## Prompt Set A — Base44 Transcript` (PSA-001..PSA-158) in [MIGRATION_SPEC.md](MIGRATION_SPEC.md) against concrete anchors in [BASE44_TRANSCRIPT.md](BASE44_TRANSCRIPT.md). Base44 is treated as frozen; this report is requirements-centric (coverage, gaps, contradictions), not a runtime test.

## Executive Summary
- Total PSA rows: **158** (PSA-001..PSA-158)
- Status counts: **115 Working**, **29 Unknown**, **14 Broken**, **0 Never fully worked**
- Largest feature areas by row-count: **Data (24)** and **Leaderboard (20)**
- Most common failure signals: repeated **AxiosError 500**, security-rule query failures, missing list limits, preference schema regressions, preview-mode CORS
- Coverage includes explicit preview-mode `frog.wix.com` CORS classification + mitigation (PSA-135..PSA-136)
- Coverage includes explicit 30-second real-time live match polling semantics + fallback (PSA-140..PSA-142)
- Moderation is atomized to **14** rows; Navigation is atomized to **7** rows
- Status reconciliation: PSA-128 is **Broken** due to “prediction.factors is undefined” crash class
- PSA ID audit: no duplicate IDs detected (PSA-156 appears once)
- Contradiction pattern is frequent: “fixed / fully resolved” statements followed by later identical errors
- Top risk #1: SDK/environment preview-mode issues can block write workflows in dev/test
- Top risk #2: pagination/limit requirements (and accidental N+1 reads) can trigger server errors
- Top risk #3: authorization/security-rule mismatches (notably `.filter()` patterns) can break user-scoped data
- Top risk #4: preference schema regressions (missing `widgets`) can crash core pages
- Top risk #5: missing modules/import errors can produce white-screens without a controlled error boundary

## 1) Exact Counts (from Prompt Set A table)

### Totals
- Total PSA rows: **158**

### By Status
| Status | Count |
|---|---:|
| Working in Base44 | 115 |
| Unknown | 29 |
| Broken in Base44 | 14 |
| Never fully worked | 0 |

### By Feature Area
| Feature Area | Count |
|---|---:|
| Data | 24 |
| Leaderboard | 20 |
| Bugfix | 14 |
| Moderation | 14 |
| Personalization | 14 |
| Community | 12 |
| History | 11 |
| Live | 9 |
| Tournament | 9 |
| Compare | 7 |
| Games | 7 |
| Navigation | 7 |
| Privacy | 5 |
| UI | 3 |
| Performance | 2 |

## 2) Breakage Anchor Index (transcript → PSA impact)

This section is restricted to concrete breakage anchors (per migration tasks): AxiosError/500, security-rule violations, missing limit parameters, preferences/widgets undefined + deep merge, and preview-mode CORS to `frog.wix.com`.

### Anchor A — AxiosError / HTTP 500 loops
- Transcript line(s): 553, 693, 882, 902, 941, 983, 1000, 1015, 1063, 1153, 1185, 1222, 1240, 1269, 1287, 1303, 1323, 1342, 1358, 1375, 1390, 1404, 1419, 1435
- Impacted PSA IDs (non-exhaustive): PSA-123, PSA-125, PSA-126, PSA-127, PSA-128, PSA-130, PSA-135..PSA-138
- Coverage status: **Complete** (no new PSA rows needed)

### Anchor B — Security rules violations / `.filter()` on entities
- Transcript line(s): 1229, 1299, 1319, 1354, 1371, 1386, 1427, 1431
- Impacted PSA IDs: PSA-125, PSA-130
- Coverage status: **Complete** (no new PSA rows needed)

### Anchor C — Missing list limits / required pagination parameters
- Transcript line(s): 1438
- Impacted PSA IDs: PSA-123, PSA-138
- Coverage status: **Complete** (no new PSA rows needed)

### Anchor D — Preferences/widgets undefined + deep-merge/defaulting
- Transcript line(s): 552, 571, 692, 881, 897, 901
- Impacted PSA IDs: PSA-124, PSA-131, PSA-139
- Coverage status: **Complete** (no new PSA rows needed)

### Anchor E — Preview-mode CORS to `frog.wix.com` surfacing as 500
- Transcript line(s): 1438
- Impacted PSA IDs: PSA-135, PSA-136, PSA-137
- Coverage status: **Complete** (no new PSA rows needed)

### Anchor F — Missing helper modules / white-screen crashes
- Transcript line(s): 979, 1438
- Impacted PSA IDs: PSA-127, PSA-129
- Coverage status: **Complete** (no new PSA rows needed)

## 3) Non-breakage Transcript Anchors Required by Scope

### Anchor G — Real-time live match system (30-second polling)
- Transcript line(s): 865
- Impacted PSA IDs: PSA-140, PSA-141, PSA-142
- Coverage status: **Complete** (no new PSA rows needed)

## 4) Contradictions

These are explicit places where the transcript claims resolution but later shows recurrence of the same class of failures.

- “Fixed both errors… deep merging… safe defaults…” (571) vs later `userPreferences.widgets is undefined` (692, 881, 901) and repeated AxiosError 500s (693, 882+).
- “All .filter() calls… replaced… 500 errors should be resolved!” (1431) vs subsequent “AxiosError… 500” reports (1435) and further remediation work captured in the dense line around 1438.

## 5) Notes / Method

- PSA rows and counts are computed from the markdown table in `## Prompt Set A — Base44 Transcript` in [MIGRATION_SPEC.md](MIGRATION_SPEC.md).
- Transcript anchors are taken from [BASE44_TRANSCRIPT.md](BASE44_TRANSCRIPT.md) by searching for the concrete error strings listed in the migration tasks; line numbers are reported as 1-based file lines.

