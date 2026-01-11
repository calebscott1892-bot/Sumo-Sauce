# API Compat Contract (Current)

This document defines the **current owned compatibility layer** that mimics the former Base44 client shape.

The UI currently imports `{ base44 }` and calls:

- `base44.entities.<Entity>.list(sort?, limit?)`
- `base44.entities.<Entity>.create(payload)`
- `base44.entities.<Entity>.update(id, patch)`
- `base44.entities.<Entity>.delete(id)`
- `base44.entities.<Entity>.bulkCreate(items)` (only for a subset)
- `base44.auth.me()`
- `base44.auth.updateMe(data)`

Implementation lives in:
- [src/api/base44Client.js](src/api/base44Client.js)
- [src/api/stubDb.js](src/api/stubDb.js)

## Entities

All entities below exist under `base44.entities` and expose methods:
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

`base44.auth` exposes:

- `me()`
  - Returns a stable demo user.
  - Ensures the `User` table contains that user.

- `updateMe(data)`
  - Merges `data` into the current user (shallow merge).
  - Persists auth user.
  - Also updates the `User` entity record.

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
  - Otherwise assigns a deterministic ID via a per-entity counter in localStorage:
    - Format: `${entity.toLowerCase()}_${n}`

## Persistence

- Tables and counters are persisted in `localStorage` under prefix `sumowatch_db_v1:`.
- In-browser stub logs are written to:
  - `window.__STUB_LOGS__` (in-memory)
  - `localStorage['sumowatch_db_v1:logs']` (last 500 lines)
