# Tech Debt: Temporary Shims

This file tracks small, intentionally-temporary shims added during the Base44 removal/migration.

## Shims

- `src/pages/components/navigation/FloatingNav.jsx`
  - Why: `src/pages/Layout.jsx` imports `./components/navigation/FloatingNav`, but the real component lives at `src/components/navigation/FloatingNav.jsx`. This shim re-exports the real component without changing UI call sites.
  - Replace later: Update `src/pages/Layout.jsx` to import from the canonical location (likely `@/components/navigation/FloatingNav`) and delete this shim.

- `vite.config.js` alias rules for `.@/` and `../.@/`
  - Why: Several files import helper modules using nonstandard specifiers like `.@/api/functions/...` and `../.@/api/functions/...`. Vite does not resolve these by default.
  - Replace later: Normalize those imports to `@/api/functions/...` (or relative imports) and remove the extra alias rules.

- `scripts/verify-runtime.mjs` + dev dependency `playwright`
  - Why: Deterministic runtime verification of `/` without manual DevTools access; captures `[stub] ...` logs and page errors.
  - Replace later: Once there’s a proper test harness (e.g., CI e2e or component tests), remove this script and optionally remove Playwright.

## Milestones

- Removed unused `src/api/entities.js` and `src/api/integrations.js`; `base44.*` is now 0 occurrences in `src/`.
