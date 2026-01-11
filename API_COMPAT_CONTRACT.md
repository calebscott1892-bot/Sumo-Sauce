# API Contract (Owned)

This document defines the **owned frontend API surface** used by the UI.

The UI imports `{ api }` and calls:

- `api.entities.<Entity>.list(sort?, limit?)`
- `api.entities.<Entity>.create(payload)`
- `api.entities.<Entity>.update(id, patch)`
- `api.entities.<Entity>.delete(id)`
- `api.entities.<Entity>.bulkCreate(items)` (only for a subset)
- `api.auth.me()`
- `api.auth.updateMe(data)`

Implementation lives in:
- [src/api/client.js](src/api/client.js) (fetch adapter)
- [server/index.mjs](server/index.mjs) (owned backend under `/api/*`)

## Entities

All entities below exist under `api.entities` and expose methods:
- `list(sort?, limit?)`
- `create(payload)`
- `update(id, patch)`
- `delete(id)`

Entities:
- `Achievement`
- `BannedUser`
- `BashoRecord` (**bulkCreate supported**)
- `ComparisonReport`
- `DataCorrectionRequest`
- `ForumReply`
- `ForumTopic`
- `LeagueMembership`
- `Match` (**bulkCreate supported**)
- `MatchPrediction`
- `Notification`
- `PredictionLeague`
- `Report`
- `Tournament`
- `TournamentPrediction`
- `User`
- `Wrestler` (**bulkCreate supported**)
- `WrestlerRating`

### bulkCreate

`bulkCreate(items)` is supported only when enabled for the entity:
- `Wrestler`, `BashoRecord`, `Match`

Return value:
- Returns an Array of created objects, and also has a `created` property (e.g. `result.created === result.length`).

## Auth

`api.auth` exposes:

- `me()`
  - Returns a stable demo user (`User` record).

- `updateMe(data)`
  - Shallow-merges `data` into the current user and persists it.

## Sorting and list behavior

Signature: `list(sort, limit)`

- `sort` is a string.
  - `'-field'` means descending by `field`.
  - `'field'` means ascending by `field`.
  - falsy/unknown sort returns insertion order.
- `limit` is a number; if provided, result is sliced to the first `limit` rows.

Comparison semantics:
- Numbers compare numerically.
- Booleans compare as `true=1`, `false=0`.
- Date-like strings are compared by `Date.parse(...)` timestamp if parseable.
- Other values compare lexicographically (lowercased strings).
- `null`/`undefined` sort last.

Common sorts used by the UI include:
- `-created_date`
- `-rank`
- `-start_date`
- `-match_date`
- `-basho`

## Update semantics

`update(id, patch)`:
- `id` is coerced to string.
- If an existing record with `id` exists: returns `{ ...existing, ...patch }`.
- If no record exists: creates a new record `{ id, ...patch }`.

## ID semantics

- `create(payload)`:
  - Uses `payload.id` if provided.
  - Otherwise assigns a deterministic ID via a per-entity counter:
    - Format: `${entity.toLowerCase()}_${n}`
