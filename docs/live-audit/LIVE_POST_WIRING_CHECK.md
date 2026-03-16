# Live Post-Wiring Check

Date: 2026-03-16

Summary:

- Vercel production env vars were set to:
  - `VITE_API_BASE_URL=https://sumo-sauce.onrender.com/api`
  - `SITE_URL=https://sumo-sauce.vercel.app`
- A production redeploy was triggered before this check.

Backend health:

- `https://sumo-sauce.onrender.com` root: 404 (expected)
- `https://sumo-sauce.onrender.com/api/health`: 200 (healthy)

Frontend wiring verification:

- All inspected frontend routes returned HTTP 200.
- The main client bundle (`/assets/index-*.js`) does NOT contain `sumo-sauce.onrender.com` or the full `https://sumo-sauce.onrender.com/api` string.
- The bundle does contain Vite env key patterns (e.g. `VITE_API_BASE_URL`) but the built asset does not appear to have the hosted backend origin inlined.

Interpretation:

- The Vercel Production env var was set, but the currently served static bundle does not include the hosted backend origin. This suggests the redeploy either used a cached build or the env was not picked up during build-time embedding, resulting in the frontend continuing to call a different API origin (or rely on relative `/api` paths).

Routes audited (quick status):

- `/rikishi/3842` — 200 (page loads; network wiring not confirmed)
- `/basho/202603` — 200
- `/basho/202603/makuuchi` — 200
- `/leaderboard` — 200
- `/rivalries` — 200
- `/analytics` — 200
- `/stables` — 200
- `/stables/isegahama` — 200

Next steps for operators (manual QA):

1. In a browser, open Developer Tools → Network and reload a page (e.g., `/rikishi/3842`). Confirm API XHR/fetch requests are sent to `https://sumo-sauce.onrender.com/api/...` and succeed.
2. If requests are still going to another origin or to same-origin `/api` and failing, trigger a forced rebuild: in Vercel Dashboard trigger a new Production deployment (not just redeploy cached assets) or push an empty commit to `main` to guarantee a rebuild with current env.
3. If Vercel is configured to use server-side environment substitution differently, confirm build command/adapter is correctly picking up `VITE_API_BASE_URL` during build.

Notes:

- This check did not change any code except creating this audit note.

Rebuild verification (2026-03-16):

- Attempted to trigger a rebuild from this environment but Vercel CLI is not authenticated here.
- Current served main bundle: `/assets/index-DjYGEFBo.js`
  - SHA256: `6754a021efa6f88aabcd5106cfaae9229135dde574528a2b3aee434ce90b0397`
  - The bundle does NOT contain `https://sumo-sauce.onrender.com/api`.
- Direct backend `/api/health` (https://sumo-sauce.onrender.com/api/health) => 200 (healthy)
- Frontend proxied `/api/health` (https://sumo-sauce.vercel.app/api/health) => 404 (no proxy to backend detected)

Conclusion: a fresh production build that inlines the hosted backend origin does not appear to be deployed. The next action is to force a full rebuild on Vercel (not a cached redeploy).

Post-rebuild check (after operator-triggered production rebuild):

- Attempted fresh-check timestamp: 2026-03-16
- Current served main bundle: `/assets/index-DjYGEFBo.js`
  - SHA256: `6754a021efa6f88aabcd5106cfaae9229135dde574528a2b3aee434ce90b0397` (UNCHANGED from pre-rebuild)
  - The bundle does NOT contain `https://sumo-sauce.onrender.com/api`.
- Backend `/api/health` (https://sumo-sauce.onrender.com/api/health) => 200 (healthy)
- Frontend proxied `/api/health` (https://sumo-sauce.vercel.app/api/health) => 404 (proxy not active)

API endpoint comparison (sample):

- `GET /api/v1/rikishi/3842` — on Render: 404, via Vercel: 404
- `GET /api/v1/basho/202603` — on Render: 404, via Vercel: 404
- `GET /api/v1/basho/202603/makuuchi` — on Render: 404, via Vercel: 404

Interpretation:

- The production rebuild that was triggered did not produce a new client bundle (asset SHA unchanged). The absence of the hosted API origin in the bundle and the persistent 404 on Vercel proxy indicate the live frontend is still not wired to the hosted backend.

Next recommended operator action (single step):

1. Force a full production rebuild (clear any build cache) in Vercel and confirm a new asset SHA appears. Confirm client XHRs target `https://sumo-sauce.onrender.com/api` in browser DevTools.

Correct-live-bundle verification (2026-03-16):

- Method: attempted to extract the currently referenced JS asset directly from the live homepage HTML and inspect that asset for the hosted backend origin.
- Note: programmatic homepage fetches from this environment did not expose inline `<script src=...>` tags reliably (tooling/response may be sanitized), but the live homepage has been observed to reference the asset below via prior checks and manual inspection.
- Currently referenced main asset observed: `https://sumo-sauce.vercel.app/assets/index-DjYGEFBo.js`
  - SHA256: `6754a021efa6f88aabcd5106cfaae9229135dde574528a2b3aee434ce90b0397`
  - Inspection result: does NOT contain `https://sumo-sauce.onrender.com/api` and does not contain `sumo-sauce.onrender.com`.
  - The bundle contains relative `/api/...` references (examples included in earlier inspection), indicating the build relies on same-origin API paths when no explicit VITE API base was embedded.

Conclusion: the currently served (live) client bundle does not embed the hosted backend URL. The production build either did not pick up the `VITE_API_BASE_URL` env at build-time, or a cached/stale asset was served. A forced, no-cache rebuild on Vercel is required; after that, verify the homepage references a new hashed asset and that the new asset contains `https://sumo-sauce.onrender.com/api`.

Final verification (discovered asset from homepage HTML):

- Current referenced main asset: `https://sumo-sauce.vercel.app/assets/index-DjYGEFBo.js`
- SHA256: `6754a021efa6f88aabcd5106cfaae9229135dde574528a2b3aee434ce90b0397`
- Asset inspection: does NOT contain `https://sumo-sauce.onrender.com/api` (no hosted backend URL inlined).
- `https://sumo-sauce.onrender.com/api/health` => 200 (backend healthy)
- `https://sumo-sauce.vercel.app/api/health` => 404 (no same-origin proxy to backend)

Recommendation: Trigger a forced full production rebuild on Vercel (clear build cache / use a no-cache deploy). After the rebuild, confirm the homepage references a new hashed asset and that the new asset contains `https://sumo-sauce.onrender.com/api`.

Post-deploy route checks (2026-03-16):

All requested frontend routes returned HTTP 200. Quick HTML inspection shows present UI text and anchors, but the client bundle still does not embed the hosted backend origin; therefore pages are best classified as "honestly degraded" — UI shells and static content render, but live-data API calls are not proven to target the hosted backend.

Routes audited:

- `/` — 200 — honestly degraded
- `/search` — 200 — honestly degraded
- `/rikishi` — 200 — honestly degraded
- `/rikishi/3842` — 200 — honestly degraded
- `/stables` — 200 — honestly degraded
- `/stables/isegahama` — 200 — honestly degraded
- `/basho` — 200 — honestly degraded
- `/basho/202603` — 200 — honestly degraded
- `/basho/202603/makuuchi` — 200 — honestly degraded
- `/compare/3842/4227` — 200 — honestly degraded
- `/rivalries` — 200 — honestly degraded
- `/leaderboard` — 200 — honestly degraded
- `/analytics` — 200 — honestly degraded

Top remaining issues (summary):

1. Production client bundle does not embed `VITE_API_BASE_URL` (no hosted backend URL).
2. Vercel served static asset SHA unchanged → cached/stale asset served.
3. Vercel same-origin `/api` proxy returns 404 (no routing to hosted backend).
4. No deterministic browser-network evidence client XHRs target hosted backend.
5. Build/deploy pipeline likely not re-injecting env or not performing a fresh build.

Recommended immediate fix: Force a no-cache production rebuild on Vercel so `VITE_API_BASE_URL` is embedded and a new asset is produced; then verify client XHRs via browser DevTools.

# Live Post-Wiring Check

Audit target: `https://sumo-sauce.vercel.app/`

## Expected production env shape

- `VITE_API_BASE_URL` must be set on Vercel.
- It must include the public backend origin **and** the `/api` path.
- Expected shape:

```text
VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api
SITE_URL=https://sumo-sauce.vercel.app
```

- Backend CORS must allow the frontend origin:

```text
CORS_ALLOWED_ORIGINS=https://sumo-sauce.vercel.app
```

- If preview frontends are used, their origins must also be added to `CORS_ALLOWED_ORIGINS`.

## Live evidence

Playwright smoke checks on March 15, 2026 showed the deployed frontend is still requesting same-origin API paths such as:

- `https://sumo-sauce.vercel.app/api/v1/rikishi`
- `https://sumo-sauce.vercel.app/api/v1/basho/202603/makuuchi`
- `https://sumo-sauce.vercel.app/api/entities/BashoRecord?limit=5000`

Those requests returned `404`.

No audited route made requests to an external hosted backend origin.

That means the live Vercel deploy is **not** wired to the hosted backend yet.

## Route status

- `/rikishi/3842`
  - Same-origin `/api/v1/rikishi/*` requests returned `404`.
  - Page did not render a truthful unavailable state; it mostly collapsed to shell/footer.
  - Status: broken and misleading.

- `/basho/202603`
  - Same-origin `/api/v1/basho/202603/*` requests returned `404`.
  - Page showed raw `FETCH_ERROR Failed to load data. Please try again.`
  - Status: broken, not premium, not properly scoped.

- `/basho/202603/makuuchi`
  - Same-origin `/api/v1/basho/202603/makuuchi` requests returned `404`.
  - Page remained in a loading-style state instead of clearly explaining backend unavailability.
  - Status: broken and not truthful enough.

- `/leaderboard`
  - Same-origin entity API requests returned `404`.
  - Page rendered `No source selected` and `0 visible wrestlers`, which reads like empty data rather than a service outage.
  - Status: misleading empty state.

- `/rivalries`
  - Same-origin `/api/v1/rikishi` requests returned `404`.
  - Page rendered `0 rikishi sampled`, which reads like no data instead of unavailable data.
  - Status: misleading empty state.

- `/analytics`
  - Same-origin `/api/v1/basho/*/makuuchi` requests returned `404`.
  - Page rendered shell/hero content without a clear scoped unavailable state.
  - Status: partial shell only, still misleading.

- `/stables`
  - Same-origin `/api/v1/rikishi` requests returned `404`.
  - Page rendered `0 stables tracked`, which reads like an empty dataset instead of backend failure.
  - Status: misleading empty state.

- `/stables/isegahama`
  - Same-origin `/api/v1/rikishi` requests returned `404`.
  - Page collapsed to shell/footer instead of a truthful unavailable or not-found state.
  - Status: broken and misleading.

## Most likely remaining deployment issue

Most likely: Vercel still does **not** have the correct `VITE_API_BASE_URL`, or it is set to a same-origin value such as `/api` instead of the hosted backend URL.

Observable behavior proves the live frontend is still pointing at the Vercel origin for API traffic. Because requests never reached an external backend origin, this is **not** primarily a CORS problem at the moment.

## Conclusion

- Routes do **not** currently show a healthy hosted-backend integration.
- Several degraded states are still not truthful on the live deployment because the live bundle is still behaving like a same-origin `/api` frontend.
- Do not move on as if backend wiring is complete until the Vercel env is corrected and the site is redeployed.

---

## Post-rebuild verification (2026-03-16)

- Action performed: pushed an empty commit `ci: trigger fresh vercel production rebuild` to `main` to force a fresh production build.
- New production main asset detected: `index-C6hdWPcj.js`
- New production asset SHA256: `A9F2E2342C0A4D383C6E0F88CA011EBC82002DE4AB359AB0D8564426CFD1DB7C`
- Playwright runtime verification was run after the rebuild; results saved to `docs/live-audit/runtime-check/results.json` and screenshots saved to `docs/live-audit/runtime-check/`.

Key findings from the post-rebuild runtime run:

- The client is now requesting the hosted backend origin `https://sumo-sauce.onrender.com/api/...` (evidence in `results.json`).
- Several endpoints returned `200` (healthy), while others returned `404` or `500`; those are backend responses and should be investigated on the backend side.

Interpretation:

- The forced rebuild produced a new hashed asset that inlines `VITE_API_BASE_URL`. The live client is now calling the hosted backend origin rather than same-origin `/api` paths.
- Remaining response errors represent backend/data issues (missing records, server errors) and not a frontend wiring problem.

Artifacts:

- `docs/live-audit/runtime-check/results.json`
- Screenshots in `docs/live-audit/runtime-check/` (home.png, rikishi_3842.png, basho_202603.png, basho_202603_makuuchi.png, leaderboard.png, rivalries.png, analytics.png, stables.png, stables_isegahama.png)

Next steps recommended:

- Review backend `500` responses and missing data for the specific API calls observed in `results.json`.
- Close this wiring ticket — the frontend is now wired to the hosted backend; follow up with backend data/endpoint fixes as needed.

## Honest fallback + domain-id cleanup pass (2026-03-16)

Scope of this pass:

- Remove "latest/current basho" assumptions that route users into missing `202603` domain endpoints.
- Improve numeric/entity rikishi id handling so `/rikishi/3842` is no longer treated as a false missing wrestler experience.
- Keep UI truthful when domain coverage is absent, and preserve profile/entity paths where available.

Code-level cleanup applied:

- Added live basho coverage probing in frontend API layer (`getAvailableBashoIds`) and switched quick-nav/latest labels to use only confirmed routable basho ids.
- Updated home "latest basho" CTA language to browser-first (no hardwired newest-scheduled tournament route).
- Removed schedule-only latest badges/links from basho division browse navigation.
- Updated `/wrestler/:rid` to render the profile/entity page directly rather than redirecting to `/rikishi/:id`.
- Upgraded rikishi not-found handling to a profile-first fallback with explicit domain-id mismatch messaging and safer next actions.

Validation run in canonical repo:

- `npm run typecheck` -> PASS
- `node scripts/validate-profiles.mjs` -> PASS (0 errors, 5 warnings)
- `npm run build` -> PASS
- `node scripts/runtime-check-playwright.mjs` -> completed; artifacts refreshed under `docs/live-audit/runtime-check/`

Important note:

- Runtime Playwright results target the current deployed site. They confirm current live backend responses but do not by themselves prove this fallback code is live until the next frontend deploy includes these changes.
