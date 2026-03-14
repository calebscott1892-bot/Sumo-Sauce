# Risks (As-Is)

Last audited: 2026-02-27.

## 1) Determinism risks

- Unstable list order when no `sort` is provided; backend `findMany` has no DB-level `orderBy` and fallback order can vary by engine/storage state:
  - [server/index.mjs](server/index.mjs#L577-L596)
- Sort tie behavior can depend on insertion order because comparator returns `0` for ties:
  - [server/index.mjs](server/index.mjs#L198-L219)
- Time-based fields generated at runtime (`new Date().toISOString()`) in seed/util paths create non-reproducible values across runs:
  - [server/prisma/bootstrap.mjs](server/prisma/bootstrap.mjs#L5-L7)
  - [src/api/functions/_ids.js](src/api/functions/_ids.js#L26-L29)
- ID generation is mixed:
  - Server numeric counters (`entity_1`, `entity_2`, ...): [server/index.mjs](server/index.mjs#L221-L228)
  - Client localStorage counters/hash IDs: [src/api/functions/_ids.js](src/api/functions/_ids.js)
  - This increases collision/shape drift risk if client-generated IDs are persisted server-side.
- `bulk` create is sequential for deterministic ID order, but still depends on request item order from caller:
  - [server/index.mjs](server/index.mjs#L669-L677)

## 2) Missing-data risks (null/placeholders)

- UI already contains fallback/inference logic for missing `basho`, missing wrestler joins, and unknown image fields, indicating incomplete source records:
  - [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx)
  - [src/pages/WrestlerProfile.jsx](src/pages/WrestlerProfile.jsx)
- Import validators only enforce minimal required fields (`rid`/`shikona`, `record_id`/`rid`), so many optional fields can remain sparse/null:
  - [server/index.mjs](server/index.mjs#L316-L554)
- Stub-like generated rows are created during merge/import workflows (e.g., inferred wrestler rows):
  - [scripts/run-full-import.mjs](scripts/run-full-import.mjs)
- Live data function stubs throw `NOT_IMPLEMENTED`, so features depending on live sync can silently degrade if callers do not surface errors:
  - [src/api/functions/syncLiveData.js](src/api/functions/syncLiveData.js)

## 3) Schema drift risks

- DB stores flexible JSON blobs (`data Json`) with no per-entity schema constraints:
  - [server/prisma/schema.prisma](server/prisma/schema.prisma#L10-L16)
- Generic `PATCH` shallow-merge can overwrite nested objects and preserve old unknown fields indefinitely:
  - [server/index.mjs](server/index.mjs#L617-L637)
- Frontend expects many ad-hoc fields (`current_rank_number`, `official_image_url`, nested `image.url`, etc.) without one shared runtime validator:
  - [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx)
  - [src/pages/WrestlerProfile.jsx](src/pages/WrestlerProfile.jsx)
- Contract doc describes broad entity surface, but server does not enforce per-entity payload schema:
  - [API_COMPAT_CONTRACT.md](API_COMPAT_CONTRACT.md)

## 4) Scalability risks (bouts volume, indexing)

- Reads are full entity scans then in-memory sort/slice (`findMany` all rows for entity) on every list call:
  - [server/index.mjs](server/index.mjs#L577-L596)
- Only DB index is `@@index([entity])`; no field-level indexes inside JSON payload for common filters/sorts:
  - [server/prisma/schema.prisma](server/prisma/schema.prisma#L16)
- UI requests large limits (`5000+`) and performs client-side joins/aggregation for leaderboard/profile:
  - [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L7-L8)
  - [src/pages/WrestlerProfile.jsx](src/pages/WrestlerProfile.jsx#L6-L7)
- Admin import/write paths are chunked but still do sequential writes and dedupe checks in app logic; throughput will degrade as volume grows:
  - [server/index.mjs](server/index.mjs#L164-L195)
  - [scripts/import-json-chunks.mjs](scripts/import-json-chunks.mjs)
