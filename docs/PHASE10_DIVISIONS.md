# Phase 10: Lower-Division Bout Expansion (Locked)

Date locked: 2026-02-27

## Scope

Phase 10 expands authoritative SumoDB `Results_text` ingestion to all six divisions for a basho while preserving Phase 8/9 invariants:

- no synthetic data
- snapshot-first flow (`capture -> staged -> canonical -> DB load`)
- deterministic ordering and serialization
- omit missing keys (no nulls/placeholders)
- classified failures only (no silent partial ingest)
- no frontend changes

## Required fixtures per basho

For `bashoId=YYYYMM`, required files under `pipeline/fixtures/snapshots/phase8/` are:

- `YYYYMM.jsa.banzuke.html` + `.meta.json`
- `YYYYMM.sumodb.rikishi.html` + `.meta.json`
- `YYYYMM.sumodb.bouts.makuuchi.html` + `.meta.json`
- `YYYYMM.sumodb.bouts.juryo.html` + `.meta.json`
- `YYYYMM.sumodb.bouts.makushita.html` + `.meta.json`
- `YYYYMM.sumodb.bouts.sandanme.html` + `.meta.json`
- `YYYYMM.sumodb.bouts.jonidan.html` + `.meta.json`
- `YYYYMM.sumodb.bouts.jonokuchi.html` + `.meta.json`

## Filename scheme

Deterministic fixture filename base:

- `{bashoId}.{source}.{kind}`

Examples:

- `202401.sumodb.bouts.makushita.html`
- `202401.sumodb.bouts.makushita.meta.json`

## Capture

Capture all required fixtures:

- `node --experimental-strip-types scripts/capture-basho.mjs --basho 202401`

The capture command writes fixture body + meta pairs and validates SHA/bytes integrity after write.

## Validate

1. Verify fixture integrity and URL contract:
   - `npm run fixtures:verify -- --basho 202401`
2. Run ingestion safety test:
   - `npm run ingest:test -- --basho 202401`
3. Run pipeline checks:
   - `npm run pipeline:verify`
   - `npm run pipeline:run`

## Ingestion mapping policy

For bout-side rikishi mapping:

1. Prefer SumoDB numeric rikishi ID if present in source row.
2. Fallback to normalized shikona mapping.
3. If shikona maps to multiple canonical rikishi IDs, fail fast.
4. If mapping is missing, fail fast.

No partial silent drops are allowed.

## JSA best-effort behavior

JSA banzuke snapshots are best-effort. In some runs, the captured JSA HTML can be an interstitial/blocked response.

When this is detected by conservative heuristics, ingestion does not treat it as a parser regression. It emits a classified warning:

- `SOURCE_BLOCKED` (with `source=jsa`, snapshot URL, bytes, and SHA)

Ingestion can proceed using authoritative SumoDB sources for rikishi and bouts.

## Expected failure codes

Ingestion classified codes:

- `OFFLINE_FIXTURE_MISSING`
- `FETCH_FAILED`
- `PARSE_FAILED`
- `SOURCE_BLOCKED`
- `SOURCE_CHANGED`
- `VALIDATION_FAILED`
- `SUMODB_ID_MAP_MISS`
- `SHIKONA_MAP_AMBIGUOUS`
- `SHIKONA_MAP_MISS`

Fixture verification classified codes:

- `FIXTURE_ARGS_INVALID`
- `FIXTURE_META_MISSING`
- `FIXTURE_META_INVALID`
- `FIXTURE_URL_MISMATCH`
- `FIXTURE_FETCHED_AT_MISSING`
- `FIXTURE_BODY_MISSING`
- `FIXTURE_SHA_MISMATCH`
- `FIXTURE_BYTES_MISMATCH`
