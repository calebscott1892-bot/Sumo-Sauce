# Wrestler Image Backfill (Local Dev)

This step is **local-dev only** and deterministic. It fills missing wrestler profile images using only existing data already stored in DB records.

## Safe inference rules

For each `Wrestler` entity:

1. If `official_image_url` already exists (usable HTTP URL), keep it.
2. Else if `image.url` already exists (usable HTTP URL), keep it.
3. Else if `media.official_image_url` exists (usable HTTP URL), copy it to `official_image_url`.
4. Else do nothing.

No external scraping is performed.

## One-command usage

From repo root:

ADMIN_TOKEN=dev-token node scripts/backfill-wrestler-images.mjs

(Equivalent npm script)

ADMIN_TOKEN=dev-token npm run backfill:images

## Backend endpoints used

- `GET /api/entities/Wrestler?limit=5000`
- `POST /api/admin/import/wrestlers?dry_run=0` (changed subset only; insert-only-safe)
- `POST /api/admin/patch-wrestler-images` (updates image fields on existing Wrestler records)

## Expected output

The script prints a JSON summary with:

- `scanned_count`
- `changed_count`
- `import_result`
- `patch_result`
- sample changed `rid` values
