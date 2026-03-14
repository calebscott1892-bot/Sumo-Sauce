# Import Runbook (Wrestler + BashoRecord)

This runbook uses insert-only admin import endpoints with chunking and dry-run support.

## 1) Start server with admin token

ADMIN_TOKEN=dev-token npm --prefix server run dev

## 2) Required order

1. Wrestler first
2. BashoRecord second

Do not import BashoRecord first, because `rid` foreign-key checks require Wrestlers to exist.

## 3) Dry-run Wrestlers (chunk 300)

node scripts/import-json-chunks.mjs \
  --entity Wrestler \
  --file ./data/wrestlers_final.json \
  --server http://127.0.0.1:8787 \
  --token dev-token \
  --chunk 300 \
  --dry-run 1

## 4) Real Wrestlers import

node scripts/import-json-chunks.mjs \
  --entity Wrestler \
  --file ./data/wrestlers_final.json \
  --server http://127.0.0.1:8787 \
  --token dev-token \
  --chunk 300 \
  --dry-run 0

## 5) Dry-run BashoRecords import

node scripts/import-json-chunks.mjs \
  --entity BashoRecord \
  --file ./data/basho_records_final.json \
  --server http://127.0.0.1:8787 \
  --token dev-token \
  --chunk 300 \
  --dry-run 1

## 6) Real BashoRecords import

node scripts/import-json-chunks.mjs \
  --entity BashoRecord \
  --file ./data/basho_records_final.json \
  --server http://127.0.0.1:8787 \
  --token dev-token \
  --chunk 300 \
  --dry-run 0

## 7) What to do when results indicate issues

- `missing_fk_count > 0`
  - Stop.
  - These BashoRecords reference unknown `rid` values.
  - Fix data by importing missing Wrestlers first, or correcting `rid` values.

- `failed_validation_count > 0`
  - Stop.
  - Inspect the printed `failures` array and fix malformed rows.
  - Re-run dry-run before real import.

- `created_count = 0` and `skipped_duplicates_count > 0`
  - This is OK.
  - Import is idempotent and insert-only; existing rows are skipped, never overwritten.

## 8) Success criteria checklist

- [ ] Wrestlers dry-run passes (`failed_validation_count=0`)
- [ ] Wrestlers import passes
- [ ] Basho dry-run passes (`failed_validation_count=0` and `missing_fk_count=0`)
- [ ] Basho import passes
