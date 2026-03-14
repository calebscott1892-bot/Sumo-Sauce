# Safe Workflow: Capture -> Verify -> Offline Ingest

Date: 2026-02-27

## Recommended default workflow

For reproducible and deterministic ingestion, use this sequence:

1. Capture authoritative snapshots (live):
   - `npm run capture:range -- --from YYYYMM --to YYYYMM`
2. Verify fixture integrity (offline artifacts):
   - `npm run fixtures:verify-range -- --from YYYYMM --to YYYYMM`
3. Ingest using offline fixtures only:
   - `npm run ingest:offline-range -- --from YYYYMM --to YYYYMM --force`
4. Build/load pipeline:
   - `npm run pipeline:run`

This is the default safe path for all range ingestion work.

## Why offline ingestion is required

Offline ingestion guarantees reproducibility because canonical outputs are derived from fixed captured fixtures.

- No live endpoint drift during ingest
- Deterministic ordering and serialization
- Idempotent replay from identical fixture bytes

## SOURCE_BLOCKED meaning

`SOURCE_BLOCKED` indicates the JSA snapshot appears blocked/interstitial (best-effort source).

- It is not treated as a parser regression.
- Ingestion can proceed using authoritative SumoDB snapshots.
- Warning details include snapshot URL, bytes, and SHA.

## One-command range verifier

Use:

- `npm run verify:safe-range -- --from YYYYMM --to YYYYMM`

This runs:

1. `capture:range`
2. `fixtures:verify-range`
3. `ingest:offline-range`
4. `pipeline:run` twice, with second run required to report `load.noop=true`
