# Phase 9 Locked: Authoritative Basho Capture + Offline Replay

Date locked: 2026-02-27

## Scope

Phase 9 locks the first real authoritative per-basho fixture capture and deterministic offline replay flow.

No frontend files are modified by this phase.

## Required fixtures per basho

For basho `YYYYMM`, required files under `pipeline/fixtures/snapshots/phase8/` are:

- `YYYYMM.jsa.banzuke.meta.json`
- `YYYYMM.jsa.banzuke.html`
- `YYYYMM.sumodb.rikishi.meta.json`
- `YYYYMM.sumodb.rikishi.html`
- `YYYYMM.sumodb.bouts.makuuchi.meta.json`
- `YYYYMM.sumodb.bouts.makuuchi.html`
- `YYYYMM.sumodb.bouts.juryo.meta.json`
- `YYYYMM.sumodb.bouts.juryo.html`

Source URLs are defined in `pipeline/ingest/sources.ts` and must remain authoritative:

- JSA banzuke: `https://www.sumo.or.jp/EnHonbashoBanzuke/{bashoId}`
- SumoDB rikishi: `https://sumodb.sumogames.de/Banzuke.aspx?b={bashoId}`
- SumoDB bouts makuuchi: `https://sumodb.sumogames.de/Results_text.aspx?b={bashoId}&d=Makuuchi`
- SumoDB bouts juryo: `https://sumodb.sumogames.de/Results_text.aspx?b={bashoId}&d=Juryo`

## How capture works

Command:

- `node --experimental-strip-types scripts/capture-basho.mjs --basho 202401`

Flow:

1. Resolves required sources for the basho.
2. Fetches each source in `live` mode via ingestion fetcher.
3. Persists snapshots through snapshot store.
4. Writes fixture body + fixture `.meta.json` under phase8 fixture dir.
5. Re-reads fixture files and validates:
   - `meta.bytes === body byte length`
   - `meta.contentSha256 === sha256(body)`
   - `meta.url === required URL`

## How offline replay works

Command:

- `npm run ingest -- --basho 202401 --mode offline --force`

Flow:

1. Reads required fixture files from phase8 fixture dir.
2. Validates body/meta integrity before ingestion.
3. Parses authoritative snapshots:
   - SumoDB banzuke HTML -> staged rikishi
   - SumoDB Results_text HTML -> parsed bouts
   - JSA banzuke HTML (if parseable) -> staged banzuke candidates
4. Canonicalizes deterministic outputs and writes JSONL files:
   - `rikishi.jsonl`
   - `basho.jsonl`
   - `banzuke_entries.jsonl`
   - `bouts.jsonl`
   - `kimarite.jsonl`

## Determinism + invariants

- No synthetic data generation.
- Missing/placeholder values are omitted, not serialized.
- Canonical record order is deterministic.
- JSONL lines use stable key serialization (`stableStringify`).
- Bout IDs are deterministic SHA-256 over canonical key fields:
  - `bashoId`, `day`, `division`, `boutNo`, `eastRikishiId`, `westRikishiId`
- If `winnerRikishiId` exists, it must equal east or west rikishi.

## Failure codes and classified failures

Ingestion-level classified errors (`pipeline/ingest/ingestErrors.ts`):

- `OFFLINE_FIXTURE_MISSING`
- `FETCH_FAILED`
- `PARSE_FAILED`
- `SOURCE_CHANGED`
- `VALIDATION_FAILED`
- `SHIKONA_MAP_MISS`

Fixture verification classified errors (`scripts/fixtures-verify.mjs`):

- `FIXTURE_ARGS_INVALID`
- `FIXTURE_META_MISSING`
- `FIXTURE_META_INVALID`
- `FIXTURE_URL_MISMATCH`
- `FIXTURE_FETCHED_AT_MISSING`
- `FIXTURE_BODY_MISSING`
- `FIXTURE_SHA_MISMATCH`
- `FIXTURE_BYTES_MISMATCH`

## Adding a new basho fixture safely

1. Capture fixtures:
   - `node --experimental-strip-types scripts/capture-basho.mjs --basho YYYYMM`
2. Verify fixtures:
   - `npm run fixtures:verify -- --basho YYYYMM`
3. Replay offline ingest:
   - `npm run ingest -- --basho YYYYMM --mode offline --force`
4. Confirm non-empty bouts output:
   - `wc -l data/ingestion/YYYYMM/canonical/bouts.jsonl`
5. Run pipeline checks:
   - `npm run pipeline:verify`
   - `npm run pipeline:run`

If any step fails, do not hand-edit fixture content. Re-capture from authoritative sources.
