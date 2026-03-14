# One-Command Full Import (Local Dev)

This workflow is local-only and uses the existing admin token gate.

## Usage

Terminal 1:

ADMIN_TOKEN=dev-token npm --prefix server run dev

Terminal 2 (repo root):

ADMIN_TOKEN=dev-token npm run import:all

## What it does

1. Checks server health (`/api/health`)
2. Resets `BashoRecord` then `Wrestler`
3. Merges wrestlers + missing-rid stubs into `data/wrestlers_final_merged.json`
4. Dry-runs Wrestler import
5. Imports Wrestlers
6. Dry-runs BashoRecord import
7. Imports BashoRecords
8. Prints final JSON summary (counts + samples)

## Success output

- Chunk lines for each phase with `failed_validation=0` and `missing_fk=0`
- Final JSON summary printed with merged count, stub count, totals, and 3-row samples

## Failure output

- Script stops immediately on any HTTP error, non-JSON response, validation failure, or FK failure
- Error output includes chunk context and failures payload for quick diagnosis
