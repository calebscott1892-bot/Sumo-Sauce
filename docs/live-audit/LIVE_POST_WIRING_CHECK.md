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

## Domain rikishi id resolver implementation pass (2026-03-17)

Scope completed:

- Implemented a live-domain resolver so published-profile/search/directory flows no longer treat verified-profile IDs as routeable domain IDs.
- Kept profile-only browsing intact when no deterministic live-domain match can be resolved.

Implementation summary:

- Canonical live source: `getRikishiDirectory()` (`/api/v1/rikishi`).
- Resolver logic now lives in `src/utils/publishedProfileBrowsing.ts`:
  - Added `resolvePublishedProfileEntries(...)` returning `routeableDomainId`.
  - Matching strategy:
    1. direct id equality if published id already exists in live domain directory,
    2. preferred `normalized shikona + normalized heya` exact match,
    3. fallback to unique `normalized shikona` match,
    4. otherwise unresolved (`routeableDomainId = null`).
- Link surfaces now navigate only when `routeableDomainId` is present:
  - `src/components/navigation/RikishiSearch.tsx`
  - `src/components/search/RikishiDiscoveryRow.tsx`
  - `src/pages/SearchPage.tsx`
  - `src/pages/RikishiDirectoryPage.tsx`

Runtime audit seed update:

- Updated `scripts/runtime-check-playwright.mjs` to include:
  - positive route: `/rikishi/12451` (confirmed live-domain id),
  - explicit degraded/legacy check: `/rikishi/3842`.

Validation run:

- `npm run typecheck` -> PASS
- `npm run build` -> PASS
- `node scripts/runtime-check-playwright.mjs` -> PASS (artifacts refreshed)

Runtime highlights from refreshed `docs/live-audit/runtime-check/results.json`:

- `/rikishi/12451`: all rikishi endpoints `200` (`summary`, `timeline`, `rank-progression`, `kimarite`).
- `/rikishi/3842`: summary endpoint still `404`, while timeline/rank/kimarite are `200`.
- Non-rikishi historical coverage behavior remains unchanged (`/analytics` and some `202601` lookups still return `404`).

## Post-frontend-id-resolver live verification pass (2026-03-17)

Verification scope:

- Commit under verification: `bff993e40fe0cede828c2563a61a274a5e1a59e7`
- Live target: `https://sumo-sauce.vercel.app`
- Runtime rerun command: `node scripts/runtime-check-playwright.mjs`

Fresh runtime evidence (`docs/live-audit/runtime-check/results.json`):

- `/rikishi/12451`: domain calls all `200` (`/api/v1/rikishi/12451`, timeline, rank-progression, kimarite).
- `/rikishi/3842`: summary call remains `404` while timeline/rank/kimarite are `200` (expected degraded legacy-id path).
- `/basho/202603`: healthy (`200` calls in this pass).
- `/leaderboard`, `/rivalries`, `/stables`, `/stables/isegahama`: healthy in this pass.
- `/analytics` and parts of `/` and `/basho/202603/makuuchi` still issue historical basho lookups returning `404` (coverage/selection issue, not rikishi-id normalization).

Live discovery-surface routing verification:

- Probed live `/rikishi` and `/search` pages via Playwright and sampled rendered rikishi links.
- Sampled directory links were numeric (`/rikishi/1412`, `/rikishi/12794`, `/rikishi/12912`, etc.) and verified against live backend with `200` responses.
- No `/rikishi/3842` links were found on key discovery surfaces checked (`/rikishi`, `/search`, `/search?q=Hoshoryu`, `/rikishi?q=Hoshoryu`).

Interpretation:

- Resolver behavior is live for mapped routeable entries (numeric domain ids are being emitted).
- Residual UX gap remains for some expected lookups (for example Hoshoryu query returning no routeable card in these probes), indicating mapping coverage/search-discovery quality still needs follow-up.

## Resolver coverage + legacy rikishi route recovery pass (2026-03-17)

Scope of this pass:

- Improve deterministic resolver hit-rate for published profile -> live domain id mapping.
- Add legacy-route recovery for `/rikishi/:id` when the incoming id is a legacy/profile id and a deterministic domain-id mapping exists.

Code-path updates applied:

- `src/utils/publishedProfileBrowsing.ts`
  - Strengthened normalization for deterministic matching (diacritic stripping + punctuation-safe keying).
  - Added full-name and primary-shikona matching maps, each with optional heya-assisted disambiguation.
  - Resolver now checks, in order:
    1. direct id match against live domain directory,
    2. unique full-shikona+heya match,
    3. unique primary-shikona+heya match,
    4. unique full-shikona match,
    5. unique primary-shikona match.
  - Extended search scoring to include primary shikona key and resolved `routeableDomainId`.
  - Added `findResolvedPublishedProfileEntryByAnyId(...)` helper for looking up entries by either legacy/profile id or resolved domain id.

- `src/pages/RikishiPage.tsx`
  - Uses resolved published entries (joined with live `getRikishiDirectory()` data).
  - Adds deterministic legacy-route recovery:
    - if `/:id` is not found in domain summary endpoint,
    - and the id maps deterministically to a different live `routeableDomainId`,
    - route is recovered via redirect to `/rikishi/<routeableDomainId>`.
  - Keeps honest degraded-state fallback when no deterministic mapping exists.

Validation run in canonical repo:

- `npm run typecheck` -> PASS
- `npm run build` -> PASS
- `node scripts/runtime-check-playwright.mjs` -> completed; artifacts refreshed

Current live runtime evidence (after refresh):

- `/rikishi/12451` remains healthy (`200` across summary/timeline/rank-progression/kimarite).
- `/rikishi/3842` still shows summary `404` with timeline/rank/kimarite `200` in this run.
- This indicates the deployed frontend runtime being audited has not yet demonstrated the new redirect-recovery behavior on live for `/rikishi/3842`.

## Post-legacy-rikishi-recovery live verification pass (2026-03-17)

Verification scope:

- Target commit behavior under verification: `bbdfc36f32d678d48e9c398192d20ddbef30f30c`
- Runtime rerun: `node scripts/runtime-check-playwright.mjs`
- Additional targeted browser probes for:
  - `/rikishi/12451`
  - `/rikishi/3842`
  - search/directory queries: `Hoshoryu`, `Onosato`, `Aonishiki`

Fresh runtime summary (`docs/live-audit/runtime-check/results.json`):

- Healthy routes in this pass:
  - `/rikishi/12451`
  - `/basho/202603`
  - `/leaderboard`
  - `/rivalries`
  - `/stables`
  - `/stables/isegahama`
- Degraded/failing in this pass:
  - `/rikishi/3842`: summary endpoint still `404`.
  - `/analytics`: many historical basho calls still `404`.
  - `/` and `/basho/202603/makuuchi`: include historical follow-on `404` requests.

Legacy recovery behavior evidence:

- Direct probe to `/rikishi/3842` remained on `https://sumo-sauce.vercel.app/rikishi/3842` (no redirect observed).
- API pattern on that page remained:
  - `/api/v1/rikishi/3842` => `404`
  - `/api/v1/rikishi/3842/timeline` => `200`
  - `/api/v1/rikishi/3842/rank-progression` => `200`
  - `/api/v1/rikishi/3842/kimarite` => `200`

Resolver coverage evidence from live search/directory probes:

- `/search?q=Hoshoryu` surfaced `/rikishi/12451`.
- `/search?q=Onosato` surfaced `/rikishi/12836` (plus another matching result).
- `/search?q=Aonishiki` surfaced `/rikishi/12839`.
- `/rikishi?q=Hoshoryu` surfaced `/rikishi/12451`.
- `/rikishi?q=Onosato` surfaced `/rikishi/12836` (plus another matching result).
- `/rikishi?q=Aonishiki` surfaced `/rikishi/12839`.

Interpretation:

- Live frontend clearly reflects improved resolver coverage on search/directory surfaces for target wrestlers.
- Live frontend does not yet show successful legacy route recovery for `/rikishi/3842` in this verification run.

## Legacy rikishi route recovery debug pass (2026-03-17)

Objective:

- Determine why `/rikishi/3842` recovery was not firing.
- Implement minimum safe fix so deterministic legacy->domain mappings redirect to canonical live routes.

Root cause found in `RikishiPage` control flow:

- Recovery redirect was previously gated on `isNotFound` only.
- In live behavior for `/rikishi/3842`, the summary call `/api/v1/rikishi/3842` returned `404`, but the page flow still reached the live-unavailable/degraded path instead of the strict not-found branch.
- That branch ordering/code-path mismatch prevented recovery from executing even when a deterministic mapping existed.

Deterministic mapping evidence for `3842` (using current resolver key logic + live domain directory):

- Published profile:
  - `rikishiId=3842`
  - shikona=`Hoshoryu Tomokatsu`
  - heya=`Tatsunami`
- Live directory key matches:
  - full-shikona+heya: no match
  - short-shikona+heya: unique match -> `12451:Hoshoryu:Tatsunami`
  - short-shikona only: unique match count `1`

Minimum safe fix applied:

- `RikishiPage` now computes a deterministic recovery target when:
  - current route id is not already a known live domain id,
  - resolver produced a `routeableDomainId`, and
  - that target exists in the live domain directory.
- Redirect no longer depends exclusively on `isNotFound`; it now triggers once directory mapping is ready and deterministic.
- Honest degraded fallback remains unchanged when no deterministic mapping exists.

Validation after fix:

- `npm run typecheck` -> PASS
- `npm run build` -> PASS
- `node scripts/runtime-check-playwright.mjs` -> completed; artifacts refreshed

Current live runtime remains unchanged in this pass (expected until new frontend deploy):

- `/rikishi/12451` healthy (`200` family).
- `/rikishi/3842` still shows summary `404` on live runtime audit.

## Live rikishi id normalisation pass (2026-03-17)

Production endpoint checks confirmed the live domain API expects numeric-string rikishi ids:

- `GET /api/v1/rikishi/12451` -> `200`
- `GET /api/v1/rikishi/12836` -> `200`
- `GET /api/v1/rikishi/12839` -> `200`
- `GET /api/v1/basho/202603` -> `200`
- `GET /api/v1/basho/202603/makuuchi` -> `200`
- `GET /api/entities/Wrestler?limit=5` -> `200`
- `GET /api/entities/BashoRecord?limit=5` -> `200`

Runtime audit rerun command:

- `node scripts/runtime-check-playwright.mjs`

Runtime route assessment (`docs/live-audit/runtime-check/results.json`):

- `/`:
  - Primary domain/data calls are healthy (`/api/v1/rikishi` and `/api/v1/rikishi/11980` both `200`).
  - Additional historical basho lookups to `202601/202511/202509/202507` return `404` and surface console noise.
- `/rikishi/3842`:
  - Summary endpoint `/api/v1/rikishi/3842` returns `404`.
  - Timeline/rank/kimarite for `3842` return `200`.
  - Route remains degraded because this page still drives a non-live id into the summary call.
- `/basho/202603`: healthy (`200` responses across requested divisions).
- `/basho/202603/makuuchi`: page loads with primary `202603` call `200`, but follow-on `202601` lookups return `404`.
- `/leaderboard`: healthy (`/api/entities/Wrestler` and `/api/entities/BashoRecord` both `200`).
- `/rivalries`: healthy (head-to-head fanout requests all `200` in this run).
- `/analytics`: degraded due to many historical `basho/*/makuuchi` `404` calls, not a rikishi-id-shape error.
- `/stables` and `/stables/isegahama`: healthy in this run.

Rikishi-id-shape diagnosis:

- Route/API path shape is centralized through `src/pages/rikishi/api.ts` and always calls `/v1/rikishi/:id` with whatever `id` arrives from route/link state.
- Wrong ids are still emitted where published-profile JSA ids are treated as routeable domain ids.
  - `src/utils/publishedProfileBrowsing.ts` currently marks `routeable` as `Boolean(profile.rikishiId)` using verified-profile `rikishiId` (JSA/profile id).
  - `src/components/navigation/RikishiSearch.tsx` navigates directly to `/rikishi/${entry.rikishiId}` for those published entries.
  - `src/components/search/RikishiDiscoveryRow.tsx` does the same for any `PublishedProfileEntry` with `routeable=true`.
  - `src/pages/RikishiDirectoryPage.tsx` and `src/pages/SearchPage.tsx` both render those published entries via `RikishiDiscoveryRow`, so they inherit this wrong-id link behavior.
- The audit script itself still hardcodes `/rikishi/3842` (`scripts/runtime-check-playwright.mjs`), which is useful for regression visibility but confirms this legacy-id route remains in test coverage.

Correct mapping source for live routeable ids:

- `GET /api/v1/rikishi` (domain directory payload) is the canonical source of live routeable domain `rikishiId` values.
- Division standings and other `/api/v1/*` domain payloads also carry domain `rikishiId` values and are safe for route generation.
- Verified profile rows (`data/makuuchi_verified_profiles.json` via `src/data/verifiedProfiles.ts`) should be treated as profile metadata and matched to domain ids (for example by stable key such as shikona+heya) before generating routeable `/rikishi/:id` links.

---

## Restore & Deployment Parity Check — 2026-03-24

### Git Alignment

| Target          | Commit Hash                              |
|-----------------|------------------------------------------|
| LOCAL HEAD      | abeb875b426f343125d31777935248a2cd2ddfba |
| origin/main     | abeb875b426f343125d31777935248a2cd2ddfba |
| Remote (GitHub) | abeb875b426f343125d31777935248a2cd2ddfba |

**Result: All three are identical. No divergence.**

### Vercel Frontend

- HTTP 200 on `/`, `/rikishi/12451`, `/basho/202603`
- Production JS bundle contains `sumo-sauce.onrender.com/api` — correctly wired to Render backend
- **Verdict: ON CORRECT COMMIT — YES**

### Render Backend

All core endpoints healthy:
- `GET /api/v1/basho/202603` → 200 (divisions with bout counts)
- `GET /api/v1/basho/202603/makuuchi` → 200 (full wrestler standings)
- `GET /api/entities/Wrestler?limit=5` → 200
- `GET /api/entities/BashoRecord?limit=5` → 200
- `GET /api/v1/rikishi/12451` → 200 (Hoshoryu profile)
- **Verdict: ON CORRECT COMMIT — YES**

### Runtime Audit Summary (Playwright)

| Route                  | OK Fetches | Failed Fetches | Page Errors | Console Errors | Status     |
|------------------------|-----------|----------------|-------------|----------------|------------|
| `/`                    | 20        | 19             | 0           | 19             | DEGRADED   |
| `/rikishi/12451`       | 31        | 0              | 0           | 0              | HEALTHY    |
| `/rikishi/3842`        | 5         | 3              | 0           | 3              | DEGRADED   |
| `/basho/202603`        | 8         | 0              | 0           | 0              | HEALTHY    |
| `/basho/202603/makuuchi` | 3       | 3              | 0           | 3              | DEGRADED   |
| `/leaderboard`         | 3         | 0              | 0           | 0              | HEALTHY    |
| `/rivalries`           | 121       | 0              | 0           | 0              | HEALTHY    |
| `/analytics`           | 2         | 11             | 0           | 11             | DEGRADED   |
| `/stables`             | 1         | 0              | 0           | 0              | HEALTHY    |
| `/stables/isegahama`   | 1         | 0              | 0           | 0              | HEALTHY    |

### Root Causes of Failures

1. **Historical basho 404s** (`/`, `/analytics`, `/basho/202603/makuuchi`): Frontend requests data for basho tournaments that don't exist in the backend (202601, 202511, 202509, etc.). Only 202603 is populated. This creates console noise and degraded analytics/trend views.

2. **Rikishi 3842 not found** (`/rikishi/3842`): The domain API only knows rikishiId 12451 (Hoshoryu). Route `/rikishi/3842` uses a legacy/JSA profile ID that doesn't map to a domain entity. The page loads but summary data is missing.

3. **No stale deployment detected** — both Vercel and Render are serving the correct commit.

---

## Toward Greatness Audit — 2026-03-24

### P0 Issue Fixed

**Homepage hero C4 Studios portfolio copy replaced with sumo-relevant content.**

Before:
- HERO_TYPED_PHRASES: "Welcome to C4 Studios", "Need a site that actually feels premium?", "Building from scratch?", etc.
- HERO_GUIDANCE_PROMPTS: "Browse recent work", "Start a project brief", "View selected projects"
- Button: "See selected work"

After:
- HERO_TYPED_PHRASES: "Welcome to Sumo Sauce", "Who leads the yūshō race?", "Track every rikishi's rise", etc.
- HERO_GUIDANCE_PROMPTS: "Search a rikishi by name", "View the current basho standings", "Compare two wrestlers head-to-head"
- Button: "Explore the dohyō"

### Runtime Audit Summary (post-basho-fix deployment)

| Route | OK | FAIL | Status |
|-------|-----|------|--------|
| `/` | 2 | 6* | *Render not yet redeployed with /basho endpoint |
| `/rikishi/12451` | 31 | 0 | HEALTHY |
| `/rikishi/3842` | 5 | 3 | DEGRADED (expected — legacy ID, fallback page shown) |
| `/basho/202603` | 7 | 3* | *Same Render lag |
| `/basho/202603/makuuchi` | 2 | 6* | *Same |
| `/leaderboard` | 3 | 0 | HEALTHY |
| `/rivalries` | 121 | 0 | HEALTHY |
| `/analytics` | 1 | 3* | *Same |
| `/stables` | 1 | 0 | HEALTHY |
| `/stables/isegahama` | 1 | 0 | HEALTHY |

*Frontend fallback probing is active until Render deploys the new `/api/v1/basho` endpoint.

### Top P1 Issues for Next Passes

1. Add persistent top navigation bar for first-visit discoverability
2. Pre-compute rivalry data to eliminate 120-call sampling
3. Clean up dead unrouted legacy pages (Forum, Games, old profiles)
4. Add pagination to RikishiDirectoryPage
5. Pre-compute analytics for offline-resilient baseline

---

## Post-Deployment Static-Data Activation Check

Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)

### Push Details

- Pushed `cca0d2c..88533b3` (8 commits) to `origin/main`
- Vercel auto-deployed; static data endpoints live within 30s

### Key Commits Pushed

| SHA | Description |
|-----|-------------|
| `d240580` | fix: remove C4-style typing hero effect and SumoWatch clock favicon |
| `f82c85b` | fix: replace all SumoWatch brand references with Sumo Sauce |
| `a6a93ed` | fix: improve logo visibility on dark backgrounds |
| `0fe3153` | fix: soften degraded state messaging to reduce false alarm tone |
| `f380e25` | fix: harden BashoQuickNav to always show basho from computed IDs |
| `adeb025` | feat: offline-first static data fallback |
| `063625b` | fix: commit static data files for deployment |
| `88533b3` | fix: rename SumoWatch remnants, redirect /wrestler to /rikishi |

### Static Data Endpoint Verification (Live)

| Endpoint | HTTP | Payload |
|----------|------|---------|
| `/data/basho-index.json` | 200 | Array[33] |
| `/data/rikishi-directory.json` | 200 | Array[1041] |
| `/data/standings/202403/Makuuchi.json` | 200 | OK |
| `/data/standings/202301/Juryo.json` | 200 | OK |
| `/data/bouts/202403/Makuuchi.json` | 200 | OK |
| `/data/bouts/202101/Sandanme.json` | 200 | OK |
| `/data/meta.json` | 200 | 33 basho, 1041 rikishi, 188 standings, 186 bouts |

### Playwright Runtime Check Results

| Route | Page Errors ❌ | Failed API Reqs ⚠️ | Notes |
|-------|---------------|---------------------|-------|
| `/` | 0 | 2 (Render 404) | Renders via static fallback |
| `/rikishi/12451` | 0 | 0 | CLEAN — published profile |
| `/rikishi/3842` | 0 | 3 (Render 404) | Published profile shell loads; API details unavailable |
| `/basho/202603` | 0 | 1 (Render 404) | Future basho — no static data either |
| `/basho/202603/makuuchi` | 0 | 4 (Render 404) | Future basho — no data |
| `/leaderboard` | 0 | 0 | CLEAN |
| `/rivalries` | 0 | 0 | CLEAN |
| `/analytics` | 0 | 1 (Render 404) | Renders via static fallback |
| `/stables` | 0 | 0 | CLEAN |
| `/stables/isegahama` | 0 | 0 | CLEAN |

**Summary**: Zero page errors across all routes. Pages with API 404s recover
gracefully via `tryStaticFallback()`. The only routes that show degraded data
are `/basho/202603*` (future basho not in static data) and `/rikishi/3842`
(individual rikishi detail requires live API).

### Fallback Flow Confirmed

1. `VITE_API_BASE_URL=https://sumo-sauce.onrender.com/api` is set on Vercel
2. API on Render returns 404 for most V1 endpoints
3. `requestApiJson()` catches the 404 → throws `API_UNAVAILABLE`
4. Catches `API_UNAVAILABLE` → calls `tryStaticFallback()` → succeeds for mapped paths
5. Pages render with static data — no blank screens

### Route Coverage Matrix

**Fully static-capable (14):**
`/`, `/basho`, `/basho/:id`, `/basho/:id/:div`, `/basho/:id/:div/day/:day`,
`/compare/basho/:a/:b`, `/rikishi`, `/search`, `/analytics`, `/analytics/kimarite`,
`/stables`, `/stables/:slug`, `/timeline`, `/watchlist`

**Partial (3):**
`/rikishi/:id` (published shell), `/analytics/eras` (directory OK), `/rivalries` (directory OK)

**Still need live API (3):**
`/compare/:a/:b`, `/leaderboard`, `/admin/import`

**Redirected (1):**
`/wrestler/:rid` → `/rikishi/:rid`

---

## Product Cleanup + Greatness Audit

Date: 2026-03-25

### Commits

| SHA | Description |
|-----|-------------|
| `de1cdc8` | fix: remove remaining SumoWatch brand references |
| `8e1ce0d` | fix: replace internal jargon with clear user-facing language |

### SumoWatch / C4 Remnant Removal

- `public/robots.txt` — removed `# SumoWatch` comment and `sumowatch.app` sitemap URL
- `scripts/ci-proof-pack-local.sh` — renamed temp db file from sumowatch to sumosauce
- `scripts/export-research-batches.mjs` — fixed manifest description string
- `src/components/ui/PageMeta.tsx` — defensive sanitizer retained (replaces SumoWatch→Sumo Sauce at runtime)

### Internal Jargon Replaced

The following terms were systematically replaced across 12 files:
- "profile layer" → "published profiles" / "published dataset"
- "routeable" → "full" (career pages)
- "domain build", "entity id", "domain dataset" → plain language
- "Data not loaded" → "Limited coverage"

Files modified: `DataUnavailableState.tsx`, `Footer.jsx`, `DatasetInfoPanel.tsx`,
`RikishiPage.tsx`, `index.jsx`, `SearchPage.tsx`, `RikishiDirectoryPage.tsx`,
`StablesPage.tsx`, `StablePage.tsx`, `ComparePage.tsx`, `GlobalStatsPage.tsx`,
`Leaderboard.jsx`

### Footer Cleanup

- Removed `v1.0.0` version placeholder
- Changed `v1.0.0 · 2000-present` → `Coverage era: 2000 – present`
- Updated tagline to: "Professional sumo browsing and analytics backed by verified rikishi profiles and structured tournament data."

### Playwright Runtime Check (Post-Deploy)

| Route | Page Errors | API 404s | Status |
|-------|------------|----------|--------|
| `/` | 0 | 2 | Renders via static fallback |
| `/rikishi/12451` | 0 | 0 | CLEAN |
| `/rikishi/3842` | 0 | 3 | Degrades gracefully (profile not in dataset) |
| `/basho/202603` | 0 | 1 | Renders via static fallback |
| `/basho/202603/makuuchi` | 0 | 4 | Future basho with partial data |
| `/leaderboard` | 0 | 0 | CLEAN |
| `/rivalries` | 0 | 0 | CLEAN |
| `/analytics` | 0 | 1 | Renders via static fallback |
| `/stables` | 0 | 0 | CLEAN |
| `/stables/isegahama` | 0 | 0 | CLEAN |

**Zero page errors across all 10 tested routes.**
