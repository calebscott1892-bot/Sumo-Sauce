# Canonical IDs

This document defines the canonical identity strategy for platform entities.

## Rikishi ID

- `rikishiId` is stable and internal.
- `rikishiId` is not derived from display names (for example, not from `shikona`).
- `shikona` can change over time and can collide historically.

Alias support:
- `rikishi_aliases` are represented by canonical `RikishiAlias` records.
- Alias rows map historical or alternate labels to the same canonical `rikishiId`.

Collision strategy (same `shikona`, different people/times):
- Keep distinct canonical `rikishiId` values per person.
- Store same `alias` value on multiple `RikishiAlias` rows with disambiguation windows (`fromBashoId`, `toBashoId`) when known.
- Resolution is done by context (era/basho/division), never by assuming global uniqueness of `shikona`.

## Basho ID

- `bashoId` format is `YYYYMM` (example: `202501`).
- Validation:
  - `YYYY` in a supported year range.
  - `MM` in `01..12`.

## Bout ID

A bout must be stably and uniquely identified across rebuilds.

Canonical bout key fields (required):
- `bashoId`
- `day`
- `division`
- `boutNo`
- `eastRikishiId`
- `westRikishiId`

`boutId` generation:
- Build deterministic hash from the canonical key object with stable key order.
- Current implementation uses SHA-256 hex digest.

Division is required:
- Lower-division bouts are first-class and supported in canonical identity.

## Kimarite ID

- `kimariteId` is the canonical kimarite string key (for example `yorikiri`, `oshidashi`).
- Canonical set is validated against fixture/reference list in this phase.
- If external naming variance appears later, use deterministic slug normalization while preserving mapping tables.
