## Workspace Recovery Note

- Canonical repo path: `C:\Users\belac\OneDrive\Documents\GitHub\Sumo-Sauce`
- Stale repo path: `C:\Users\belac\Sumo-Sauce`

What was wrong:
- Two local Sumo-Sauce folders were being treated interchangeably.
- The stale folder is not the source of truth and still contains committed merge conflict markers in snapshot data and several app files.

What was recovered:
- The canonical OneDrive repo was verified as the working source of truth.
- No product files needed to be ported from the stale folder because the canonical repo already had the intended current feature work and the stale folder had no unique product files missing from the canonical repo.

Use going forward:
- Do all future work only in `C:\Users\belac\OneDrive\Documents\GitHub\Sumo-Sauce`.
- Do not use `C:\Users\belac\Sumo-Sauce` as an active workspace.

Current status:
- The canonical repo has no unresolved merge conflict markers.
- `src/pages/rikishi/api.ts` is clean.
- `npm run typecheck`, `node scripts/validate-profiles.mjs`, and `npm run build` passed.
- `npm run dev` reached a clean Vite startup state.
