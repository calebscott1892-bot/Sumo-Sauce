# Architecture (As-Is)

Last audited: 2026-02-27.

## Runtime components

### Web app (Vite + React)
- Entry and app shell: [src/main.jsx](src/main.jsx), [src/App.jsx](src/App.jsx)
- Dev server/proxy (`/api` → backend): [vite.config.js](vite.config.js)
- API adapter used by UI: [src/api/client.js](src/api/client.js)

### Backend API (Express)
- Server process and all routes: [server/index.mjs](server/index.mjs)
- Starts on `PORT` (default `8787`), JSON body limit `2mb`, CORS allowlist for local dev origins.

### Database (Prisma + SQLite)
- Prisma schema (`provider = "sqlite"`): [server/prisma/schema.prisma](server/prisma/schema.prisma)
- Runtime DB URL from env (`DATABASE_URL`): [server/.env](server/.env)
- Bootstrap seed script: [server/prisma/bootstrap.mjs](server/prisma/bootstrap.mjs)

### Optional Supabase integration (partial)
- Auth/user resolution + `movements` table only, when configured:
  - [server/index.mjs](server/index.mjs#L12-L31)
  - Routes: `/movements` GET/POST.

## API surface summary (routes + payload shapes)

Defined in [server/index.mjs](server/index.mjs).

### Health
- `GET /api/health`
  - Response: `{ ok: true }`

### Generic entity API
- `GET /api/entities/:entity?sort=&limit=`
  - Response: JSON array of entity `data` records.
- `POST /api/entities/:entity`
  - Request body: object payload (optional `id`).
  - Response: created/upserted object with `id`.
- `PATCH /api/entities/:entity/:id`
  - Request body: patch object.
  - Response: shallow-merged object `{ ...current, ...patch, id }`.
- `DELETE /api/entities/:entity/:id`
  - Response: `{ ok: true }`.
- `POST /api/entities/:entity/bulk`
  - Request body: array of objects.
  - Response: `{ created: number, items: object[] }`.

### Auth compatibility API
- `GET /api/auth/me`
  - Response: `User` row for fixed id `user_1` or `404 { error }` if missing.
- `PATCH /api/auth/me`
  - Request body: profile patch object.
  - Response: merged `User` object.

### Admin import API (token-gated via `x-admin-token`)
- `POST /api/admin/import/wrestlers?dry_run=0|1`
  - Request body: wrestler array; requires `rid`, `shikona` per item.
  - Response report:
    - `dry_run`, `received_count`, `created_count`, `skipped_duplicates_count`, `failed_validation_count`, `missing_fk_count`, `failures[]`.
- `POST /api/admin/import/basho-records?dry_run=0|1`
  - Request body: basho record array; requires `record_id`, `rid` per item.
  - Validates foreign key existence of `rid` in `Wrestler`.
  - Response report: same report shape as above.
- `POST /api/admin/patch-wrestler-images`
  - Request body: array of `{ rid, official_image_url?, image?: { url } }`.
  - Response report: counts for `updated`, `skipped_*`, `failures`.
- `POST /api/admin/reset-entity`
  - Request body: `{ entity: "Wrestler" | "BashoRecord" }`.
  - Response: `{ entity, deleted_count }`.

### Movements API (Supabase-backed, optional)
- `GET /movements?mine=1`
  - Optional bearer auth; returns `[]` on missing auth/client/errors.
- `POST /movements`
  - Requires bearer auth.
  - Request body: object, server injects `user_id`.
  - Response: inserted row or `500 { error }`.

## Where data lives today

### Primary persisted runtime data
- SQLite JSON-record store:
  - [server/prisma/schema.prisma](server/prisma/schema.prisma)
  - `EntityRecord(entity, id, data)` is the main table.
- Seed/dev bootstrap records:
  - [server/prisma/bootstrap.mjs](server/prisma/bootstrap.mjs)

### Import/source datasets
- Canonical import JSONs used by scripts:
  - [data/wrestlers_final.json](data/wrestlers_final.json)
  - [data/wrestlers_final_rid_slug.json](data/wrestlers_final_rid_slug.json)
  - [data/basho_records_final.json](data/basho_records_final.json)
- Import orchestrators:
  - [scripts/import-json-chunks.mjs](scripts/import-json-chunks.mjs)
  - [scripts/run-full-import.mjs](scripts/run-full-import.mjs)

### Browser-local data
- Local storage driven helpers/features:
  - Preferences: [src/api/functions/userPreferences.js](src/api/functions/userPreferences.js)
  - Notifications: [src/api/functions/notificationSystem.js](src/api/functions/notificationSystem.js)
  - ID counters/hash helpers: [src/api/functions/_ids.js](src/api/functions/_ids.js)
  - Forum stats: [src/api/functions/achievementSystem.js](src/api/functions/achievementSystem.js)
  - UI imports/game state keys in [src/pages/DataImport.jsx](src/pages/DataImport.jsx), [src/pages/AdminImport.jsx](src/pages/AdminImport.jsx), [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx)

### Static/public assets
- Wrestler images cache output: [public/wrestlers](public/wrestlers)
- Optional enrichment/backfill scripts:
  - [scripts/backfill-wrestler-images.mjs](scripts/backfill-wrestler-images.mjs)
  - [scripts/ingest-wrestlers-enriched.mjs](scripts/ingest-wrestlers-enriched.mjs)

## Current sync/polling behavior

- Notification polling via React Query:
  - `refetchInterval: 30000` in [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L42)
- Sync status UI polling localStorage every 30s:
  - [src/components/sync/SyncStatus.jsx](src/components/sync/SyncStatus.jsx#L30)
- No backend push channel (no websocket/SSE route found in [server/index.mjs](server/index.mjs)).
- Several API function modules are explicit stubs throwing `NOT_IMPLEMENTED` for live sync/fetch:
  - [src/api/functions/syncLiveData.js](src/api/functions/syncLiveData.js)
  - [src/api/functions/fetchRealSumoData.js](src/api/functions/fetchRealSumoData.js)
  - [src/api/functions/fetchRealMatchHistory.js](src/api/functions/fetchRealMatchHistory.js)
  - [src/api/functions/resolveJSAProfiles.js](src/api/functions/resolveJSAProfiles.js)

## Current error handling shape

### Backend
- Global Express error middleware returns `500` with `{ error: <message> }`:
  - [server/index.mjs](server/index.mjs#L723-L726)
- Validation failures return `400 { error }` (admin/import endpoints).
- Auth/admin failures return `401 { error: "Unauthorized" }`.
- `/movements` GET intentionally degrades to `[]` on auth/client/query failures.

### Frontend
- `requestJson()` throws `Error("API <METHOD> <path> failed: ...")` for non-2xx:
  - [src/api/client.js](src/api/client.js#L12-L15)
- Pages commonly catch and convert to displayable strings (`setLoadError`, `setError`) rather than typed error envelopes:
  - [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L258-L272)
  - [src/pages/WrestlerProfile.jsx](src/pages/WrestlerProfile.jsx#L313-L327)
  - [src/pages/AdminImport.jsx](src/pages/AdminImport.jsx#L59-L81)
