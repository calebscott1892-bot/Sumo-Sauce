# Base44 → Full Ownership Migration Spec (Sumo Sauce)

Status: planning-only. Base44 is treated as frozen; we will remove coupling over time.

## Repo Inventory (root files only)

### Framework & build tooling

- Build tool: Vite (see `package.json` scripts + `vite.config.js`)
- UI framework: React 18 (`react`, `react-dom`)
- Routing: React Router DOM 7 (`react-router-dom`)
- Styling: Tailwind CSS + `tailwindcss-animate` (`tailwind.config.js`, `postcss.config.js`)
- UI primitives: Radix UI (multiple `@radix-ui/*` deps)
- shadcn/ui: present (`components.json`) with New York style
- Icon library: Lucide (`lucide-react`, `components.json`)
- Animations: `framer-motion`
- Forms/validation: `react-hook-form`, `zod`, `@hookform/resolvers`
- Charts: `recharts`

### Aliases / path mapping

- Vite alias: `@` → `./src` (`vite.config.js`)
- jsconfig paths: `@/*` → `./src/*` (`jsconfig.json`)
- shadcn aliases (`components.json`):
  - `components`: `@/components`
  - `ui`: `@/components/ui`
  - `utils`: `@/lib/utils`
  - `lib`: `@/lib`
  - `hooks`: `@/hooks`

### Base44 coupling points (root files only)

- Direct dependency (removed): Base44 SDK in `package.json`
- Branding in `index.html`:
  - favicon points to `https://base44.com/logo_v2.svg`
  - title is `Base44 APP`
- README asserts Base44 provenance and Base44 API coupling (`README.md`)

### Expected src entrypoints (inferred; not inspected)

- HTML entry module: `/src/main.jsx` (from `index.html`)
- React root mounting: expected in `/src/main.jsx` (typical Vite+React)
- App component: likely `/src/App.jsx` (common pattern; repo has `src/App.jsx` per workspace tree)

## Requirements → Files → Status → Verification

| Requirement | Files (planned/impacted) | Status | Verification |
|---|---|---|---|
| Create MIGRATION_SPEC.md with mapping table and checklist | `MIGRATION_SPEC.md` | ✅ Done | File exists and includes inventory + checklist |
| Create ENVIRONMENT.md listing env vars and consumers | `ENVIRONMENT.md` | ⏳ Planned | File exists; env vars are grounded in repo usage |
| Create DATA_MODEL.md describing entities/tables/relationships | `DATA_MODEL.md` | ⏳ Planned | File exists; has sections ready to fill |
| Identify framework/build tooling (Vite, Router, Tailwind, shadcn) using root files only | `package.json`, `vite.config.js`, `tailwind.config.js`, `components.json`, `jsconfig.json` | ✅ Done | Inventory section matches these files |
| Identify Base44 coupling points using root files only | `package.json`, `index.html`, `README.md` | ✅ Done | Coupling list cites these root files |
| List expected src entrypoints inferred from `index.html` and alias configs | `index.html`, `vite.config.js`, `jsconfig.json` | ✅ Done | Entry module listed as `/src/main.jsx` |
| Prepare Base44 removal checklist section | `MIGRATION_SPEC.md` | ✅ Done | Checklist section present |
| Do not implement replacements yet | (N/A) | ✅ Done | No `src/` changes performed |

## Base44 Removal Checklist (plan-only)

### Phase 0 — Inventory and guardrails

- [ ] Freeze Base44 inputs: avoid modifying Base44-generated integration behavior until we have replacements
- [ ] Add a “no Base44 coupling” policy for new code (no new Base44 SDK usages)

### Phase 1 — Remove Base44 branding

- [ ] Replace favicon URL in `index.html` (currently points to Base44-hosted logo)
- [ ] Update `<title>` in `index.html` from `Base44 APP` to the product name
- [ ] Update `README.md` to remove Base44 support contact and provenance language (keep factual migration note)

### Phase 2 — Track and replace SDK usage (once `src/` is in scope)

- [ ] Locate all Base44 SDK imports and usage sites (e.g., `base44.*` patterns)
- [ ] Identify Base44 API surface used (auth, CRUD, integrations, realtime, etc.)
- [ ] Define replacement strategy per surface area (owned API, direct REST, DB, etc.)
- [ ] Add minimal compatibility layer if needed to avoid big-bang rewrites

### Phase 3 — Remove dependency

- [ ] After replacements exist and are wired, remove the Base44 SDK from `package.json`
- [ ] Confirm build succeeds and runtime paths no longer call Base44

### Phase 4 — Clean-up

- [ ] Remove any Base44-specific documentation references
- [ ] Remove dead code and unused config introduced only for Base44

## Next Best Step

When you’re ready to allow `src/` inspection, the next step is to:

1) inventory actual Base44 SDK usage and env vars (`VITE_*`) referenced by the code, and
2) convert that into a concrete replacement plan per feature surface (auth/data/integrations).

## Prompt Set A — Base44 Transcript

Source: BASE44_TRANSCRIPT.md (verbatim).

This table re-expresses transcript intent as atomic, testable requirements. Tooling logs/timestamps/speaker labels were excluded.

Status enum: `Working in Base44` / `Broken in Base44` / `Never fully worked` / `Unknown`.

| ID | Feature Area | Requirement | Status | Files | Verification |
|---|---|---|---|---|---|
| PSA-001 | Leaderboard | Default ranking order shall use current tournament standings (wins-losses) when available rather than static banzuke rank. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-002 | Leaderboard | Division filter labels shall include Japanese kanji. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-003 | Leaderboard | Leaderboard entries shall be displayed as rank cards with color-coding by rank/division. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-004 | Leaderboard | Leaderboard shall allow filtering by active status. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-005 | Leaderboard | Leaderboard shall allow filtering by country of origin. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-006 | Leaderboard | Leaderboard shall allow filtering by tournament performance metrics. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-007 | Leaderboard | Leaderboard shall allow filtering by win rate. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-008 | Leaderboard | Leaderboard shall support sorting by career wins. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-009 | Leaderboard | Leaderboard shall support sorting by name. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-010 | Leaderboard | Leaderboard shall support sorting by tournament titles. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-011 | Leaderboard | Leaderboard shall support sorting by win rate. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-012 | Leaderboard | Leaderboard shall support sorting by wins. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-013 | Leaderboard | The app shall display a leaderboard of Japanese professional sumo rankings. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-014 | Leaderboard | The leaderboard shall provide search by wrestler name (shikona). | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-015 | Leaderboard | The leaderboard shall provide search by wrestler stable (heya). | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-016 | Leaderboard | The leaderboard shall show current tournament performance via a visual win/loss indicator (e.g., progress bars). | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-017 | Leaderboard | The leaderboard shall support filtering by rank divisions (e.g., Yokozuna, Ozeki, Sekiwake, Komusubi, Maegashira, Juryo). | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-018 | Leaderboard | The UI shall explain how leaderboard sorting is determined when using tournament standings. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-019 | Leaderboard | The UI shall provide a wrestler detail view/modal that shows stats, achievements, and career record. | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-020 | Leaderboard | Top ranks shall use distinctive icons (at minimum: crown for Yokozuna and star for Ozeki). | Working in Base44 |  | Open Leaderboard with sample data; verify filter/search/sort and details behavior. |
| PSA-021 | Data | The app shall display profile photos for wrestlers and use official JSA photos when available. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-022 | Data | The app shall provide a Data Import page that can auto-collect and import a dataset of up to 200 wrestlers from live sources. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-023 | Data | The data pipeline output shall be deterministic and reproducible given identical source content. | Unknown |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-024 | Data | The data pipeline shall programmatically gather, normalize, validate, and export live sumo wrestler data from authoritative public sources. | Unknown |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-025 | Data | The import process shall support phased, chunked JSON imports rather than requiring a single large paste. | Unknown |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-026 | Data | The import system shall enforce strict validation for required fields when importing. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-027 | Data | The import system shall enforce uniqueness/duplicate detection for imported records. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-028 | Data | The import system shall provide a validate-only (dry-run) mode that checks required fields, duplicate IDs, and broken foreign keys without importing. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-029 | Data | The import system shall validate foreign-key relationships between imported entities. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-030 | Data | The import UI shall remember the last selected entity type across reloads. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-031 | Data | The ingestion system shall collect wrestler profiles from SumoDB, JSA, and Wikipedia. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-032 | Data | The pipeline output dataset shall contain the top 200 active professional sumo wrestlers ordered strictly by current official rank. | Unknown |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-033 | Data | The pipeline output shall be schema-clean and shall not contain nulls, placeholders, or fabricated values. | Unknown |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-034 | Data | The pipeline shall fetch wrestler images via Wikipedia/Wikimedia using the MediaWiki API and stable image URLs. | Unknown |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-035 | Data | The pipeline shall prioritize SumoDB/Sumo Reference as the primary source for banzuke and wrestler profiles. | Unknown |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-036 | Data | The pipeline shall validate rankings against the Japan Sumo Association (JSA) website. | Unknown |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-037 | Data | The system shall automatically sync wrestler data from external sources on an hourly schedule. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-038 | Data | The system shall store wrestler records with fields for rank, side, wins, losses, stable, physical stats, and career achievements. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-039 | Data | The system shall support importing wrestler data from a JSON array matching the Wrestler schema. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-040 | Data | The system shall support importing wrestler data from CSV by parsing into schema-conformant JSON objects. | Unknown |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-041 | Data | The UI shall provide a manual refresh action to run sync on demand. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-042 | Data | The UI shall provide an auto-sync toggle to enable or disable periodic sync. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-043 | Data | The UI shall show real-time sync status for the latest sync run. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-044 | Data | When a data point is missing, ingestion shall omit the key rather than storing null/"N/A"/empty strings for numeric or boolean fields. | Working in Base44 |  | Run ingestion/import; validate schema, ordering, reproducibility, and sources used. |
| PSA-045 | Live | The live tournament feed shall display current standings. | Working in Base44 |  | During an active basho, verify live feed refresh interval and displayed matches/results/standings. |
| PSA-046 | Live | The live tournament feed shall display ongoing matches. | Working in Base44 |  | During an active basho, verify live feed refresh interval and displayed matches/results/standings. |
| PSA-047 | Live | The live tournament feed shall display today's results. | Working in Base44 |  | During an active basho, verify live feed refresh interval and displayed matches/results/standings. |
| PSA-048 | Live | The live tournament feed shall display upcoming bouts. | Working in Base44 |  | During an active basho, verify live feed refresh interval and displayed matches/results/standings. |
| PSA-049 | Live | The live tournament feed shall refresh automatically using polling at a 2-minute interval. | Working in Base44 |  | During an active basho, verify live feed refresh interval and displayed matches/results/standings. |
| PSA-050 | Live | When a basho is active, the app shall display a live tournament feed. | Working in Base44 |  | During an active basho, verify live feed refresh interval and displayed matches/results/standings. |
| PSA-051 | Compare | For each stat category, the best value among compared wrestlers shall be highlighted. | Working in Base44 |  | Compare 2–3 wrestlers; confirm side-by-side stats and best-value highlighting. |
| PSA-052 | Compare | Public comparison reports shall be accessible via a shareable link. | Working in Base44 |  | Compare 2–3 wrestlers; confirm side-by-side stats and best-value highlighting. |
| PSA-053 | Compare | Public comparison reports shall include the transcript-described 'social features' (details not specified in transcript). | Unknown |  | Compare 2–3 wrestlers; confirm side-by-side stats and best-value highlighting. |
| PSA-054 | Compare | Saved comparison reports shall support public/private visibility controls. | Working in Base44 |  | Compare 2–3 wrestlers; confirm side-by-side stats and best-value highlighting. |
| PSA-055 | Compare | The comparison view shall render selected wrestlers side-by-side with aligned stat rows. | Working in Base44 |  | Compare 2–3 wrestlers; confirm side-by-side stats and best-value highlighting. |
| PSA-056 | Compare | The UI shall allow users to select 2–3 wrestlers for head-to-head comparison. | Working in Base44 |  | Compare 2–3 wrestlers; confirm side-by-side stats and best-value highlighting. |
| PSA-057 | Compare | Users shall be able to save a selected comparison of 2–3 wrestlers as a comparison report. | Working in Base44 |  | Compare 2–3 wrestlers; confirm side-by-side stats and best-value highlighting. |
| PSA-058 | Personalization | Dashboard settings shall include widget toggles for at least: live feed, standings, and results. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-059 | Personalization | Notifications shall auto-refresh every 30 seconds. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-060 | Personalization | Notifications shall be generated for achievements. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-061 | Personalization | Notifications shall be generated for forum replies. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-062 | Personalization | Notifications shall be generated for league invitations. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-063 | Personalization | Notifications shall be generated for match results. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-064 | Personalization | Notifications shall be generated for tournament updates. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-065 | Personalization | Notifications shall be generated when predictions are closing. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-066 | Personalization | The app shall provide a notification center accessible via a bell icon. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-067 | Personalization | The app shall provide a personalized feed showing matches for followed wrestlers. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-068 | Personalization | The app shall send real-time notifications when a followed wrestler enters an active bout. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-069 | Personalization | The notification center shall show an unread badge/count. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-070 | Personalization | Users shall be able to customize their dashboard by enabling/disabling widgets. | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-071 | Personalization | Users shall be able to follow and unfollow wrestlers from the UI (e.g., a star icon). | Working in Base44 |  | Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist. |
| PSA-072 | History | Each wrestler shall display career performance stats. | Working in Base44 |  | Verify history pages/charts show correct computed stats from stored matches/basho records. |
| PSA-073 | History | Each wrestler shall display kimarite usage frequency. | Working in Base44 |  | Verify history pages/charts show correct computed stats from stored matches/basho records. |
| PSA-074 | History | Each wrestler shall display past tournament victories. | Working in Base44 |  | Verify history pages/charts show correct computed stats from stored matches/basho records. |
| PSA-075 | History | Match history shall be filterable by basho and outcome. | Working in Base44 |  | Verify history pages/charts show correct computed stats from stored matches/basho records. |
| PSA-076 | History | The app shall display wrestler rivalries including head-to-head records and key matches. | Working in Base44 |  | Verify history pages/charts show correct computed stats from stored matches/basho records. |
| PSA-077 | History | The app shall provide a Match History tab showing past matches with opponent, outcome, basho, and winning technique. | Working in Base44 |  | Verify history pages/charts show correct computed stats from stored matches/basho records. |
| PSA-078 | History | The app shall provide a Sumo History page and a dedicated navigation entry. | Working in Base44 |  | Verify history pages/charts show correct computed stats from stored matches/basho records. |
| PSA-079 | History | The app shall provide a Sumo Legends feature comparing historical wrestlers by championships, dominance, and career stats. | Working in Base44 |  | Verify history pages/charts show correct computed stats from stored matches/basho records. |
| PSA-080 | History | The app shall provide interactive performance trend charts across multiple basho (e.g., win rate and W/L record). | Working in Base44 |  | Verify history pages/charts show correct computed stats from stored matches/basho records. |
| PSA-081 | History | The app shall provide rank progression charts over time for wrestlers. | Working in Base44 |  | Verify history pages/charts show correct computed stats from stored matches/basho records. |
| PSA-082 | History | Wrestler cards shall include tabs/sections for historical data. | Working in Base44 |  | Verify history pages/charts show correct computed stats from stored matches/basho records. |
| PSA-083 | Tournament | The app shall provide a Tournaments section listing past and upcoming basho. | Working in Base44 |  | Verify tournaments listing/details/charts match a known basho dataset and link to forum discussions. |
| PSA-084 | Tournament | The Tournament Hub shall aggregate schedules, results, and standout performances. | Working in Base44 |  | Verify tournaments listing/details/charts match a known basho dataset and link to forum discussions. |
| PSA-085 | Tournament | Tournament details shall display winners, upsets, and special prizes. | Working in Base44 |  | Verify tournaments listing/details/charts match a known basho dataset and link to forum discussions. |
| PSA-086 | Tournament | Tournament details shall include interactive charts tracking win progression throughout the basho. | Working in Base44 |  | Verify tournaments listing/details/charts match a known basho dataset and link to forum discussions. |
| PSA-087 | Tournament | Tournament Hub and Tournaments pages shall include a match outcome heatmap. | Working in Base44 |  | Verify tournaments listing/details/charts match a known basho dataset and link to forum discussions. |
| PSA-088 | Tournament | Tournament Hub and Tournaments pages shall include a win/loss distribution chart. | Working in Base44 |  | Verify tournaments listing/details/charts match a known basho dataset and link to forum discussions. |
| PSA-089 | Tournament | Tournament Hub and Tournaments pages shall include daily results breakdown. | Working in Base44 |  | Verify tournaments listing/details/charts match a known basho dataset and link to forum discussions. |
| PSA-090 | Tournament | Tournament pages shall include trend visualizations including championship leaders, attendance, and win rate distribution. | Working in Base44 |  | Verify tournaments listing/details/charts match a known basho dataset and link to forum discussions. |
| PSA-091 | Tournament | Wrestler names in tournament views shall be clickable and navigate to wrestler profiles. | Working in Base44 |  | Verify tournaments listing/details/charts match a known basho dataset and link to forum discussions. |
| PSA-092 | Community | Achievements shall be displayed with rarity tiers. | Working in Base44 |  | Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior. |
| PSA-093 | Community | Achievements shall include badges for forum participation and community contributions. | Working in Base44 |  | Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior. |
| PSA-094 | Community | The app shall display an aggregate rating summary for each wrestler. | Working in Base44 |  | Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior. |
| PSA-095 | Community | The app shall provide a forum section with a list of discussion topics. | Working in Base44 |  | Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior. |
| PSA-096 | Community | The app shall show real-time achievement notifications. | Working in Base44 |  | Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior. |
| PSA-097 | Community | Tournament pages shall link to relevant forum discussions. | Working in Base44 |  | Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior. |
| PSA-098 | Community | User profiles shall include a section listing earned achievements. | Working in Base44 |  | Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior. |
| PSA-099 | Community | Users shall be able to create forum topics with a title and body. | Working in Base44 |  | Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior. |
| PSA-100 | Community | Users shall be able to post replies to forum topics. | Working in Base44 |  | Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior. |
| PSA-101 | Community | Users shall be able to rate wrestlers on a 5-star scale. | Working in Base44 |  | Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior. |
| PSA-102 | Community | Users shall be able to view a forum topic detail page that renders the topic and its replies. | Working in Base44 |  | Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior. |
| PSA-103 | Community | Wrestler ratings shall support detailed category ratings. | Working in Base44 |  | Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior. |
| PSA-104 | Moderation | Administrators shall be able to ban users. | Working in Base44 |  | As moderator/admin, lock/pin/delete/ban/report; verify permissions and outcomes. |
| PSA-105 | Moderation | Administrators shall be able to delete individual forum posts/replies. | Working in Base44 |  | As moderator/admin, delete a reply/post; verify permissions, visibility, and audit outcome. |
| PSA-106 | Moderation | Administrators shall be able to pin topics. | Working in Base44 |  | As moderator/admin, pin a topic; verify pinned state is visible and persists. |
| PSA-107 | Moderation | Users shall be able to report content for moderator review. | Working in Base44 |  | As moderator/admin, lock/pin/delete/ban/report; verify permissions and outcomes. |
| PSA-108 | Games | Match prediction shall be probability-based and derived from historical data, current rankings, and recent performance. | Working in Base44 |  | Create/join league, submit predictions, run scoring; verify leaderboards, points, and dedupe rules. |
| PSA-109 | Games | Prediction scoring operations shall be atomic. | Working in Base44 |  | Create/join league, submit predictions, run scoring; verify leaderboards, points, and dedupe rules. |
| PSA-110 | Games | Predictions shall be scoped per league when leagues are used. | Working in Base44 |  | Create/join league, submit predictions, run scoring; verify leaderboards, points, and dedupe rules. |
| PSA-111 | Games | The app shall provide a match predictor for a selected matchup. | Working in Base44 |  | Create/join league, submit predictions, run scoring; verify leaderboards, points, and dedupe rules. |
| PSA-112 | Games | The app shall track user predictions and display accuracy over time. | Working in Base44 |  | Create/join league, submit predictions, run scoring; verify leaderboards, points, and dedupe rules. |
| PSA-113 | Games | The system shall prevent duplicate predictions where disallowed by league rules. | Working in Base44 |  | Create/join league, submit predictions, run scoring; verify leaderboards, points, and dedupe rules. |
| PSA-114 | Games | The system shall provide admin scoring controls. | Working in Base44 |  | Create/join league, submit predictions, run scoring; verify leaderboards, points, and dedupe rules. |
| PSA-115 | Navigation | The app shall provide a floating navigation bubble that expands to show all pages when clicked. | Working in Base44 |  | Use floating nav across pages; confirm usability and correct routing. |
| PSA-116 | Privacy | Forum posts shall display usernames rather than emails. | Working in Base44 |  | Verify usernames replace emails publicly; validate email visibility controls and fallbacks. |
| PSA-117 | Privacy | Leaderboards shall display usernames rather than emails. | Working in Base44 |  | Verify usernames replace emails publicly; validate email visibility controls and fallbacks. |
| PSA-118 | Privacy | Users shall be able to control whether their email is publicly visible. | Working in Base44 |  | Verify usernames replace emails publicly; validate email visibility controls and fallbacks. |
| PSA-119 | Privacy | Users shall be able to set a custom public username. | Working in Base44 |  | Verify usernames replace emails publicly; validate email visibility controls and fallbacks. |
| PSA-120 | Privacy | Users shall be able to write a public bio. | Working in Base44 |  | Verify usernames replace emails publicly; validate email visibility controls and fallbacks. |
| PSA-121 | Performance | The sync system shall implement caching to reduce repeated external fetches. | Working in Base44 |  | Inspect network/write volume; verify caching, polling intervals, and diffing reduce calls and writes. |
| PSA-122 | Performance | The sync system shall implement diffing so that only changed wrestler records are updated. | Working in Base44 |  | Inspect network/write volume; verify caching, polling intervals, and diffing reduce calls and writes. |
| PSA-123 | Bugfix | All entity list queries shall include any required pagination/limit parameters so they do not fail at runtime. | Broken in Base44 |  | Reproduce the prior failure (missing limit) and verify requests succeed or degrade gracefully without 500/crash. |
| PSA-124 | Bugfix | Array operations in UI logic shall be guarded against undefined/null inputs. | Broken in Base44 |  | Reproduce the prior failure (undefined preferences/widgets); verify no crash and safe defaults are used. |
| PSA-125 | Bugfix | Entity queries shall not rely on server-side filter operations that conflict with platform security rules; non-admin users shall not crash when querying their own data. | Broken in Base44 |  | Reproduce the prior failure (.filter security rule); verify no 500/crash and equivalent results via list+client filtering. |
| PSA-126 | Bugfix | Live tournament fetches shall return safe defaults on API failures instead of throwing. | Broken in Base44 |  | Force an API failure; verify UI renders with safe defaults and shows non-blocking error state. |
| PSA-127 | Bugfix | Pages shall fail gracefully with an error screen/early return instead of breaking the entire page on API errors. | Broken in Base44 |  | Force an API failure; verify page stays usable, shows a clear error state, and does not white-screen. |
| PSA-128 | Bugfix | Prediction display logic shall handle missing prediction factors (e.g., `prediction.factors` undefined) without crashing. | Broken in Base44 |  | Reproduce “prediction.factors is undefined” by forcing prediction object missing `factors`; verify UI still renders and uses safe fallbacks (no crash/500). |
| PSA-129 | Bugfix | The app shall not crash or white-screen due to missing helper/utility modules. | Broken in Base44 |  | Simulate missing module/import; verify build/runtime fails loudly with actionable error and UI does not white-screen. |
| PSA-130 | Bugfix | The app shall not return HTTP 500 for core read operations under normal usage. | Broken in Base44 |  | Navigate core read surfaces under normal usage; verify no 500 responses and errors are handled as non-fatal where possible. |
| PSA-131 | Bugfix | User preference updates shall deep-merge defaults to prevent missing widget/notification structures. | Broken in Base44 |  | Reproduce prior preferences regression; verify defaults are applied and widgets structure is never undefined. |
| PSA-132 | UI | Select/dropdown controls shall be readable on dark backgrounds (e.g., white text on dark). | Working in Base44 |  | Verify UI behavior matches requirement. |
| PSA-133 | UI | The UI shall be presentable and interactive for the leaderboard experience. | Working in Base44 |  | Verify UI behavior matches requirement. |
| PSA-134 | UI | The UI shall be responsive and usable on mobile and desktop. | Working in Base44 |  | Verify UI behavior matches requirement. |
| PSA-135 | Bugfix | The app shall detect Base44 preview-mode SDK/environment failures that present as CORS-blocked requests to `frog.wix.com` and classify them as environment-originated (not app/query) failures. | Broken in Base44 |  | In preview mode, reproduce blocked `frog.wix.com` request; verify app classifies error as SDK/environment and surfaces a non-fatal notice. |
| PSA-136 | Bugfix | When SDK/environment failures are detected (e.g., `frog.wix.com` CORS), the app shall mitigate by disabling or gating write actions that would fail (e.g., entity create/update) and presenting a clear remediation message (e.g., try deployed mode). | Broken in Base44 |  | In preview mode with blocked `frog.wix.com`, attempt an entity write; verify action is gated with clear guidance and UI remains stable. |
| PSA-137 | Bugfix | The app shall distinguish “app/query 500s” (entity/query/validation issues) from “SDK/environment 500s” (preview/CORS/third-party) and handle them with different user messaging and remediation. | Broken in Base44 |  | Trigger one app/query failure and one SDK/environment failure; verify distinct classification and distinct UI guidance. |
| PSA-138 | Bugfix | For any HTTP 500 or AxiosError, the app shall emit instrumentation including: operation name, entity, query parameters (e.g., limit), and error classification (app/query vs SDK/environment), without exposing user emails. | Broken in Base44 |  | Trigger a 500; verify logs/telemetry contain required fields and redact sensitive data. |
| PSA-139 | Bugfix | To prevent recurrence of preference-structure regressions, the app shall apply a schema-defaulting step on preference load and emit an explicit diagnostic event if required sub-objects (e.g., `widgets`) are missing. | Broken in Base44 |  | Clear preferences and load app; verify defaults are applied and missing-structure diagnostics are emitted without crashing. |
| PSA-140 | Live | The real-time live match system shall poll live match state at a 30-second interval during an active basho. | Unknown |  | During an active basho, confirm polling interval is ~30 seconds and requests do not degrade the app. |
| PSA-141 | Live | Each real-time poll shall update live bout tracking data, including current bout list and resolved outcomes when available, without requiring a page refresh. | Unknown |  | During an active basho, observe live bout list/outcomes update on polling without manual refresh. |
| PSA-142 | Live | When real-time match data is unavailable (no access, blocked requests, or no active feed), the app shall fall back to the last known snapshot and display a “stale/unavailable” indicator instead of erroring. | Unknown |  | Simulate no real-time access; verify snapshot renders, stale indicator appears, and no crash occurs. |
| PSA-143 | Moderation | Administrators shall be able to unban previously banned users. | Unknown |  | Ban then unban a user; verify restored access and moderation state persists. |
| PSA-144 | Moderation | Administrators shall be able to unpin topics. | Unknown |  | Pin then unpin a topic; verify pinned state updates immediately and persists. |
| PSA-145 | Moderation | Administrators shall be able to lock topics to prevent new replies. | Unknown |  | Lock a topic; verify reply UI is disabled for non-admins and server rejects reply creation. |
| PSA-146 | Moderation | Administrators shall be able to unlock topics to allow replies again. | Unknown |  | Lock then unlock a topic; verify reply UI re-enables and replies can be created. |
| PSA-147 | Moderation | Administrators shall be able to delete topics (including all associated replies) without leaving orphaned content. | Unknown |  | Delete a topic; verify topic disappears and replies are not accessible via direct URL. |
| PSA-148 | Moderation | Reports shall enter a moderator review queue that lists reported items with reason, reporter, timestamp, and current status. | Unknown |  | Submit multiple reports; verify they appear in a review queue with required metadata. |
| PSA-149 | Moderation | Moderators shall be able to resolve or dismiss reports, recording an outcome and optional moderator note. | Unknown |  | Resolve/dismiss a report; verify status updates and note persists for admin review. |
| PSA-150 | Moderation | Role enforcement shall restrict moderation actions (ban/unban/pin/unpin/lock/unlock/delete/resolve) to authorized roles only. | Unknown |  | Attempt each moderation action as a normal user; verify UI is gated and server rejects the action. |
| PSA-151 | Moderation | Moderation actions shall be auditable: each action shall record actor, timestamp, action type, and target (user/topic/post). | Unknown |  | Perform moderation actions; verify audit entries exist with required fields and can be reviewed by admins. |
| PSA-152 | Moderation | Admins shall be able to view moderation audit entries in a dedicated moderation/audit view with basic filtering by action type and timeframe. | Unknown |  | Open audit view; verify audit entries render and filters change the displayed set correctly. |
| PSA-153 | Navigation | The floating navigation bubble shall be accessible from all pages and shall not disappear during navigation. | Unknown |  | Navigate across all pages; verify nav bubble is consistently present and functional. |
| PSA-154 | Navigation | The floating navigation bubble shall be keyboard-accessible (tab-focusable), toggle via Enter/Space, and close via Escape. | Unknown |  | Use keyboard only; verify focus, toggle, and close behaviors work without trapping focus. |
| PSA-155 | Navigation | The floating navigation bubble shall support mouse and touch interactions, including closing when clicking/tapping outside the menu. | Unknown |  | Use mouse/touch; verify open/close behavior is reliable and does not require double taps. |
| PSA-156 | Navigation | On mobile viewports, the floating navigation bubble shall be placed so it does not obscure primary actions or important content. | Unknown |  | Test on small screens; verify bubble does not block primary CTAs and remains reachable. |
| PSA-157 | Navigation | The floating navigation bubble and its expanded menu shall remain readable in dark mode with sufficient contrast. | Unknown |  | Enable dark mode; verify nav text/icons are readable and contrast is acceptable. |
| PSA-158 | Navigation | All navigation links in the floating menu shall route to valid pages and reflect the correct active state where applicable. | Unknown |  | Click each nav item; verify route exists, renders expected page, and active state updates correctly. |

