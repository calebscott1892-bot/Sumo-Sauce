# Canonical Pipeline Invariants

These invariants are enforced by the local canonical pipeline skeleton.

## Invariant 1: Omit missing keys

When writing canonical outputs, missing/placeholder values are omitted instead of serialized.

- Never write `null`
- Never write empty strings
- Never write placeholder strings like `"N/A"`

This keeps canonical artifacts compact and stable and prevents semantic drift caused by placeholder conventions.

## Invariant 2: Stable ordering

Canonical output ordering is deterministic.

- Records are sorted by stable key order (primary: `rid`, secondary: `shikona`, tertiary: `external_id`)
- Object keys are serialized in stable lexicographic order

This guarantees byte-identical output for identical inputs.

## Invariant 3: buildId derivation

`buildId` is derived from a stable hash of:

- input fixture hashes (path + content hash)
- pipeline/schema version markers

Formula (conceptual):

`buildId = hash(inputs + versions)`

No wall-clock time or randomness participates in `buildId`, so repeated runs with unchanged fixtures produce the same build folder and bytes.
