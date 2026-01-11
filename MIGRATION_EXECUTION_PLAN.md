# Migration Execution Plan (Base44 → Owned Backend)

## Ground rules (current phase)

- Base44 is treated as frozen; this plan is **inventory + sequencing only**.
- No changes under `src/` are assumed in this document; code references are for grounding scope and risk.
- Evidence standard: any claim about the current implementation is backed by file+line links.

## Repo reality check (what exists today)

### Runtime architecture (frontend-only)

- Vite/React entrypoint mounts `<App />` in [src/main.jsx](src/main.jsx#L1-L8).
- App renders routes + toaster in [src/App.jsx](src/App.jsx#L1-L14).
- Routing is React Router DOM; default route `/` → `Leaderboard` in [src/pages/index.jsx](src/pages/index.jsx#L1-L92).
- Shared shell uses `Layout` + `FloatingNav` in [src/pages/Layout.jsx](src/pages/Layout.jsx#L1-L12).
- Data fetching is primarily `@tanstack/react-query` (example: [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L1-L8)).

### Backend / server code

- No owned backend is present in this repo.
- All data operations are executed directly from the browser via the Base44 SDK client configured in [src/api/base44Client.js](src/api/base44Client.js#L1-L8).

## Inventory (Base44 coupling + other runtime dependencies)

### Per-match coupling scan (line-level, code-only)

To meet the “every match has file+line evidence” requirement, a line-level coupling scan was generated from code/config files only (explicitly excludes `*.md`, `node_modules/`, `dist/`, `build/`).

- Full per-match output: [COUPLING_SCAN.md](COUPLING_SCAN.md)

Counts (from [COUPLING_SCAN.md](COUPLING_SCAN.md#L6-L19)):

| Category | Match count | Notes |
|---|---:|---|
| Base44 SDK config (removed) | 4 | Historical: dependency declaration + client creation (now removed). |
| Base44 entity calls (`base44.entities.*`) | 116 | All list/create/update/delete/bulkCreate usages + entity surface exports. |
| Base44 auth (`base44.auth.*`) | 11 | `auth.me()` and `auth.updateMe(...)`. |
| Base44 integrations (`base44.integrations.*`) | 8 | Export-only in [src/api/integrations.js](src/api/integrations.js). |
| Missing helpers (`.@/api/functions/*`) | 17 | Imports reference non-existent modules (see [COUPLING_SCAN.md](COUPLING_SCAN.md#missing_helpers_dotat-17)). |
| Env vars (`import.meta.env` / `process.env`) | 0 | No env-driven config exists today. |
| Networking (`fetch` / `axios` / WebSocket/SSE/XHR) | 0 | No direct usage in this repo (Base44 SDK is the network layer). |
| Local persistence (`localStorage` / `sessionStorage`) | 12 | Preferences + toggles + game score + sync status. |
| Timers (`setInterval` / `setTimeout`) | 7 | Auto-sync, polling intervals, UI timers. |
| CORS/preview/wix (`CORS`, `preview mode`, `wix.com`) | 2 | Generic preview-mode CORS notice (no explicit `frog.wix.com` string in code). |
| React Query polling (`refetchInterval`) | 1 | Notifications polling interval. |

### Base44 SDK configuration

- Base44 client historically used an SDK `createClient(...)` call in [src/api/base44Client.js](src/api/base44Client.js#L1-L8), but the SDK dependency is now removed and the client is stubbed locally.

### Base44 entity surface area (central export)

The app defines its Base44 entity surface area in [src/api/entities.js](src/api/entities.js#L1-L22):

- `Wrestler`, `ForumTopic`, `ForumReply`, `WrestlerRating`, `ComparisonReport`, `Tournament`, `Report`, `BannedUser`, `Achievement`, `PredictionLeague`, `LeagueMembership`, `TournamentPrediction`, `MatchPrediction`, `Notification`, `DataCorrectionRequest`, `Match`, `BashoRecord`, plus `User` via `base44.auth`.

### Base44 integrations surface area

Integrations are exported in [src/api/integrations.js](src/api/integrations.js#L1-L21) but are not used elsewhere in `src/` (no call sites found).

### Direct Base44 usage map (exhaustive per-file list)

The following files **directly import** the Base44 client and/or call `base44.entities.*` / `base44.auth.*`.

| File | Evidence (import + ops) | Coupling type | What it does | Depends on |
|---|---|---|---|---|
| [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx) | Import: [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L3). Reads: [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L90), [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L99). Preview/CORS notice: [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L318-L320). Missing helper imports: [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L24-L25). | Base44 reads + missing helper modules | Loads wrestlers + basho records; shows a preview-mode limitation notice; calls missing “api/functions” helpers for live sync + preferences. | Base44 client + React Query + non-existent `src/api/functions/*` modules |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx) | Import: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L7). Auth: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L150). Lists: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L200-L201). Writes: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L221-L237), [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L320-L334), [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L832-L833). Missing helper imports: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L13-L16). Preview-mode handling: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L841). | Base44 reads/writes + missing helper modules | Admin import/cleanup/backfill of Wrestler/BashoRecord/Match; creates DataCorrectionRequest. Relies on missing “api/functions” fetchers for real-world ingestion. | Base44 client + React Query + non-existent `src/api/functions/*` modules |
| [src/pages/Forum.jsx](src/pages/Forum.jsx) | Import: [src/pages/Forum.jsx](src/pages/Forum.jsx#L3). Reads: [src/pages/Forum.jsx](src/pages/Forum.jsx#L20), [src/pages/Forum.jsx](src/pages/Forum.jsx#L32). Auth: [src/pages/Forum.jsx](src/pages/Forum.jsx#L25). Missing helper import: [src/pages/Forum.jsx](src/pages/Forum.jsx#L12). | Base44 reads + missing helper module | Lists forum topics; fetches user directory; uses current user. | Base44 client + non-existent `src/api/functions/getUserDisplayName` |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx) | Import: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L3). Reads: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L37-L74). Writes: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L80-L90), [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L111-L123), [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L130-L138), [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L146-L158), [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L173-L176). Missing helper imports: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L14-L15). | Base44 reads/writes + missing helper modules | Topic view: loads topic + replies + users; increments view_count; reply create/update/delete; pin/lock; uses missing achievement/notification helpers. | Base44 client + non-existent `src/api/functions/*` modules |
| [src/pages/Profile.jsx](src/pages/Profile.jsx) | Import: [src/pages/Profile.jsx](src/pages/Profile.jsx#L3). Auth: [src/pages/Profile.jsx](src/pages/Profile.jsx#L24), [src/pages/Profile.jsx](src/pages/Profile.jsx#L88). Reads: [src/pages/Profile.jsx](src/pages/Profile.jsx#L32), [src/pages/Profile.jsx](src/pages/Profile.jsx#L60), [src/pages/Profile.jsx](src/pages/Profile.jsx#L74). Missing helper import: [src/pages/Profile.jsx](src/pages/Profile.jsx#L13). | Base44 reads/writes + missing helper module | Profile: reads user directory + authored content + achievements; updates current user profile via Base44 auth update. | Base44 client + non-existent `src/api/functions/getUserDisplayName` |
| [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx) | Import: [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L3). Auth: [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L18-L21). Reads: [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L24-L63). | Base44 reads | League membership + league list + tournaments + user predictions. | Base44 client |
| [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx) | Import: [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L3). Reads: [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L12-L84). Missing helper import: [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L10). | Base44 reads + missing helper module | League detail: league, memberships, tournament predictions, users, tournaments. | Base44 client + non-existent `src/api/functions/getUserDisplayName` |
| [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx) | Import: [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L3). Auth: [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L24-L31). Reads: [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L47-L75), [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L83-L106). Write: [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L126-L139), [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L280-L288). Missing helper import: [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L13). | Base44 reads/writes + missing helper module | Match predictor reads wrestlers + basho records + match predictions; creates a MatchPrediction record; logs Base44 payloads/errors (may include user data). | Base44 client + non-existent `src/api/functions/matchPrediction` |
| [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx) | Import: [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L3). Reads: [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L14-L31). Writes: [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L41-L58). | Base44 reads/writes | Public comparison report view; increments views; toggles likes/liked_by. | Base44 client |
| [src/pages/Tournaments.jsx](src/pages/Tournaments.jsx) | Import: [src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L4). Reads: [src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L16-L19), [src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L179). | Base44 reads | Lists tournaments; in detail view loads wrestlers for winner/profile resolution. | Base44 client |
| [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx) | Import: [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L4). Reads: [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L23-L53). | Base44 reads | Hub loads tournaments/matches/wrestlers/forum topics. | Base44 client |
| [src/components/navigation/FloatingNav.jsx](src/components/navigation/FloatingNav.jsx) | Import: [src/components/navigation/FloatingNav.jsx](src/components/navigation/FloatingNav.jsx#L8). Auth: [src/components/navigation/FloatingNav.jsx](src/components/navigation/FloatingNav.jsx#L29). | Base44 auth | Shows nav actions based on current user. | Base44 client |
| [src/components/forum/CreateTopicDialog.jsx](src/components/forum/CreateTopicDialog.jsx) | Import: [src/components/forum/CreateTopicDialog.jsx](src/components/forum/CreateTopicDialog.jsx#L7). Write: [src/components/forum/CreateTopicDialog.jsx](src/components/forum/CreateTopicDialog.jsx#L24). | Base44 write | Creates forum topics. | Base44 client |
| [src/components/forum/ReportDialog.jsx](src/components/forum/ReportDialog.jsx) | Import: [src/components/forum/ReportDialog.jsx](src/components/forum/ReportDialog.jsx#L6). Write: [src/components/forum/ReportDialog.jsx](src/components/forum/ReportDialog.jsx#L23). | Base44 write | Creates moderation reports. | Base44 client |
| [src/components/forum/BanUserDialog.jsx](src/components/forum/BanUserDialog.jsx) | Import: [src/components/forum/BanUserDialog.jsx](src/components/forum/BanUserDialog.jsx#L6). Write: [src/components/forum/BanUserDialog.jsx](src/components/forum/BanUserDialog.jsx#L31). | Base44 write | Creates banned-user entries. | Base44 client |
| [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx) | Import: [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L3). Reads/writes: [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L19-L59). | Base44 reads/writes | Lists reports/banned users/topics; updates report status; deletes topics/replies. | Base44 client |
| [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx) | Import: [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L3). Auth: [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L51). Reads: [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L57-L80). Writes: [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L72), [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L84), payload fields: [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L110-L113). | Base44 reads/writes | Lists/creates/updates wrestler ratings; computes aggregates. | Base44 client |
| [src/components/comparison/SaveComparisonDialog.jsx](src/components/comparison/SaveComparisonDialog.jsx) | Import: [src/components/comparison/SaveComparisonDialog.jsx](src/components/comparison/SaveComparisonDialog.jsx#L8). Write: [src/components/comparison/SaveComparisonDialog.jsx](src/components/comparison/SaveComparisonDialog.jsx#L20), payload fields: [src/components/comparison/SaveComparisonDialog.jsx](src/components/comparison/SaveComparisonDialog.jsx#L36-L40). | Base44 write | Creates comparison reports for sharing. | Base44 client |
| [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx) | Import: [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L6). Writes: [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L27-L39). Missing helper import: [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L9). | Base44 write + missing helper module | Creates leagues + membership; depends on missing join-code generator. | Base44 client + non-existent `src/api/functions/predictionScoring` |
| [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx) | Import: [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L5). Reads/writes: [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L21-L49). | Base44 reads/writes | Lists leagues/memberships client-side and joins by join_code; increments member_count. | Base44 client |
| [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx) | Import: [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L5). Reads/writes: [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L14-L63). Missing helper import: [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L8). | Base44 reads/writes + missing helper module | Lists wrestlers; creates tournament predictions; depends on missing notification helper. | Base44 client + non-existent `src/api/functions/notificationSystem` |
| [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx) | Import: [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L7). Reads: [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L35). Missing helper imports: [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L6), [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L8). | Base44 reads + missing helper modules | Lists scored predictions and triggers missing scoring/notification helpers. | Base44 client + non-existent `src/api/functions/*` modules |
| [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx) | Import: [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L3). Read/filter: [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L38-L40). Missing helper import: [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L11). | Base44 reads + missing helper module | Lists notifications and depends on missing mark-read helper functions. | Base44 client + non-existent `src/api/functions/notificationSystem` |

Profile update evidence (auth write): [src/pages/Profile.jsx](src/pages/Profile.jsx#L88) — `mutationFn: (data) => base44.auth.updateMe(data),`.

### Non-existent helper modules (blocking)

Multiple files import `'.@/api/functions/*'` or `'../.@/api/functions/*'`, but there is no `src/api/functions/` directory in this repo (the only `src/api` files are [src/api/base44Client.js](src/api/base44Client.js), [src/api/entities.js](src/api/entities.js), [src/api/integrations.js](src/api/integrations.js)).

Evidence (imports):

- [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L24-L25)
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L13-L16)
- [src/pages/Forum.jsx](src/pages/Forum.jsx#L12)
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L14-L15)
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L13)
- [src/pages/Profile.jsx](src/pages/Profile.jsx#L13)
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L10)
- [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L9)
- [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L8)
- [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L6-L8)
- [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L11)

## Environment & secrets inventory

- No `import.meta.env.*` or `process.env.*` usage exists in the repo today.
- Base44 `appId` is hard-coded in [src/api/base44Client.js](src/api/base44Client.js#L5-L8).

See ENVIRONMENT.md for the grounded inventory and future variable suggestions: [ENVIRONMENT.md](ENVIRONMENT.md).

## Data model inventory

The code-grounded entity/field inventory is maintained in [DATA_MODEL.md](DATA_MODEL.md) under **“Observed entities & fields (current code)”**.

## Migration options (backend replacement approaches)

These are options for the owned backend; selection affects auth, data access patterns, and how much of the frontend must change.

1) **Compatibility shim (minimize frontend churn)**
- Replace the implementation behind `base44` by exporting a compatible client shape from [src/api/base44Client.js](src/api/base44Client.js#L5-L8) — `export const base44 = createClient({`.
- Pros: smallest call-site diff; easiest incremental rollout.
- Cons: forces you to emulate Base44 semantics (sorting strings like `'-created_date'`, etc.) or build a translation layer.

2) **Typed owned API + explicit data layer (cleaner long-term)**
- Introduce an owned API surface (REST/OpenAPI or tRPC/GraphQL) and refactor call sites to use explicit domain functions (e.g. `getWrestlers`, `createForumTopic`).
- Pros: best maintainability; avoids carrying Base44 quirks.
- Cons: larger frontend refactor; longer time to first “fully migrated” page.

## Phased execution plan (sequenced, testable)

### Phase 0 — Unblock runtime determinism (module integrity)

Goal: ensure the app builds/runs deterministically before backend work.

- Implement or remove the missing `src/api/functions/*` modules referenced above.
- Ensure any replacement functions are pure client-side helpers or call owned services (once available).

Definition of Done (DoD)

- No “module not found” errors for any route in [src/pages/index.jsx](src/pages/index.jsx#L47-L83).
- All routes render without a blank/white screen.

### Phase 1 — Define owned backend contracts

Goal: lock the API surface needed to replace the exact Base44 operations used by the UI.

DoD

- A contract exists for each entity operation used in the coupling inventory table (list/create/update/delete/bulkCreate).
- Contract explicitly defines:
  - Sorting and pagination semantics (maps from `'-created_date'` style to owned API)
  - Auth requirements (`requiresAuth: true` equivalent)
  - Error taxonomy (app/query vs environment) for UI messaging.

### Phase 2 — Implement owned persistence + auth + minimal endpoints

Goal: implement the smallest slice that can back one end-to-end user journey.

Suggested first slice

- Read-only leaderboard: `Wrestler.list` + `BashoRecord.list` (used in [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L90-L99)).

DoD

- Owned backend supports the slice with stable performance and predictable errors.
- Frontend can be pointed at owned backend via a shim or refactor (option-dependent).

### Phase 3 — Expand to writes + moderation + predictions

Order suggested by coupling density and risk:

1. Forum writes (topic/reply/report/ban) used in [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L80-L176) and dialogs.
2. Ratings + comparisons (smaller, well-contained writes).
3. Predictions (involves scoring + notifications; currently blocked by missing helper modules).

DoD

- All write operations enforce server-side authorization (do not rely on client `user.role`).
- Observability exists for failed operations without leaking user emails.

## Risk register (grounded)

- **Build/runtime blocker:** missing `'.@/api/functions/*'` imports will prevent bundling and/or cause a white-screen at runtime (see import list above).
- **Configuration risk:** Base44 `appId` is hard-coded in the shipped client bundle ([src/api/base44Client.js](src/api/base44Client.js#L5-L8)); migration requires introducing env/config.
- **Preview/CORS limitation:** the UI explicitly calls out Base44 preview-mode CORS issues ([src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L318-L320)); owned backend must have a clear environment/transport error story.
- **No global error boundary:** no `ErrorBoundary` component is present (search found none); errors can still cascade to a blank page.
- **PII in logs:** Match predictor logs full user state ([src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L126-L137)), which likely includes email; PSA-138 requires redaction.
- **Data normalization drift:** Match import mapping uses wrestler names as IDs in some paths ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L503-L506)).

## PSA broken items mapping (PSA-123..PSA-139)

Source definitions are in [MIGRATION_SPEC.md](MIGRATION_SPEC.md#L227-L243). Mapping below ties each PSA to current code paths and what the owned replacement must guarantee.

| PSA | Spec requirement | Current code evidence | Gap / migration guarantee |
|---|---|---|---|
| PSA-123 | Ensure list queries include required pagination/limit | All observed list calls include a limit arg (example: [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L90) — `queryFn: () => base44.entities.Wrestler.list('-rank', 500),`). A scan for 0/1-arg list calls found none. | Owned backend should still enforce safe defaults (server-side max limit + client-side limit required) to prevent regressions.
| PSA-124 | Guard array ops against undefined/null | Preferences/widgets are guarded with schema-like defaults in [src/components/personalized/DashboardSettings.jsx](src/components/personalized/DashboardSettings.jsx#L7-L12). | Ensure owned preferences loader always returns defaults; add schema-defaulting + diagnostics (also PSA-139).
| PSA-125 | Avoid server-side filter ops that conflict with security rules | Pattern is “list then client filter”, e.g. replies: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L44-L58); join by join_code: [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L21-L28). | Owned backend should provide proper query filters with RLS/ACLs so the client doesn’t need to overfetch.
| PSA-126 | Live tournament fetch returns safe defaults on failure | Local caller uses try/catch and sets safe defaults in [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L71-L88), but `syncLiveData` import is missing ([src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L24)). | Implement live sync behind a stable API; always return `{ success, data|null, error? }` and keep UI non-fatal.
| PSA-127 | Pages fail gracefully instead of white-screening | Several queryFns catch and return safe fallbacks (example: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L33-L58)), but there is no global error boundary. | Add an error boundary + consistent “fatal vs non-fatal” error screens.
| PSA-128 | Handle missing `prediction.factors` | Explicit guard exists in [src/components/predictor/PredictionFactors.jsx](src/components/predictor/PredictionFactors.jsx#L5). | Ensure predictor output schema always includes `factors` or UI remains guarded.
| PSA-129 | No crash/white-screen due to missing modules | Missing helper imports are present across pages/components (see list in this doc), e.g. [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L13-L16). | Phase 0 must eliminate missing imports; add runtime “feature unavailable” fallbacks where helpers depend on backend.
| PSA-130 | No HTTP 500 for core reads under normal use | Core reads are concentrated in Leaderboard/Tournaments/Hub via `list(...)` (examples: [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L90-L99), [src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L16-L19)). | Owned backend must provide reliable read endpoints with caching and bounded queries; UI should treat failures as non-fatal.
| PSA-135 | Detect preview-mode CORS to `frog.wix.com` and classify as environment failure | Leaderboard shows explicit messaging about Base44 preview CORS limitation ([src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L318-L320)). | In owned stack, replace this with environment/transport classification (CORS/offline/DNS) and user guidance.
| PSA-136 | Gate writes when SDK/environment failures are detected | No consistent write-gating is visible; many writes are always enabled (example: forum topic create [src/components/forum/CreateTopicDialog.jsx](src/components/forum/CreateTopicDialog.jsx#L24)). | Add a global “transport unhealthy” gate and disable write mutations with clear guidance.
| PSA-137 | Distinguish app/query 500s vs SDK/environment 500s | Some messaging exists for preview mode; no general classification layer exists. | Standardize error taxonomy in data layer; map to user-facing messages.
| PSA-138 | Emit instrumentation for 500/AxiosError without leaking emails | Current logs include user state ([src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L126-L137)). | Implement structured logging/telemetry with redaction (no emails), include operation/entity/params/classification.
| PSA-139 | Apply schema-defaulting on preference load and emit diagnostic event if missing sub-objects | `DashboardSettings` applies defaults locally ([src/components/personalized/DashboardSettings.jsx](src/components/personalized/DashboardSettings.jsx#L7-L12)), but preference load helpers are missing ([src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L24-L25)). | Implement preference schema-defaulting at load time + explicit diagnostic event when missing.

## PSA live items mapping (PSA-140..PSA-142)

Source definitions are in [MIGRATION_SPEC.md](MIGRATION_SPEC.md#L243-L245). Mapping below is **code-grounded only** (no transcript assumptions).

| PSA | Spec requirement | Current code evidence | Gap / migration guarantee |
|---|---|---|---|
| PSA-140 | Poll live match state at ~30s during active basho | There is a 30s poll interval for notifications via React Query ([src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L42)) and for sync-status UI ([src/components/sync/SyncStatus.jsx](src/components/sync/SyncStatus.jsx#L30)). Leaderboard auto-sync is hourly ([src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L373-L383)). | No evidence of a 30s live-match poll loop in this repo today; any “live match system” appears to be delegated to missing helper modules (`syncLiveData` import at [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L24)). Owned implementation must define an explicit live polling loop and cap cadence/backoff.
| PSA-141 | Poll updates live bout list/outcomes without refresh | Leaderboard contains client-side logic referencing `tournamentData.live_status.current_bout` and emits toasts ([src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L340-L372)), but the provenance of `tournamentData` depends on `syncLiveData` ([src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L24), [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L388-L409)). | The UI has placeholders for “current bout” handling but no provable end-to-end polling source in-repo due to missing helpers. Owned backend must return a stable live snapshot object; client should update UI from it on each poll.
| PSA-142 | Fallback to last known snapshot + stale/unavailable indicator | There is a generic preview-mode CORS notice on Leaderboard ([src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L318-L320)). No explicit “stale snapshot” indicator is found for live match data. | Implement a first-class “stale snapshot” state in the owned data layer: show last successful snapshot timestamp and a clear indicator when live fetch fails.

## NEXT ACTIONS (agent-executable)

- Verify the missing-helper surface area:
  - `rg -n "\\.@/api/functions/" src`
  - `ls -la src/api`
- Validate Base44 coupling breadth:
  - `rg -n "@/api/base44Client" src`
  - `rg -n "base44\\.(entities|auth|integrations)" src`
- If proceeding to implementation (later phase): choose **Option 1** (shim) or **Option 2** (explicit data layer), then define the owned API contract for the Leaderboard read slice first.
