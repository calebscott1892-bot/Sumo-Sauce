# Backend Stub Plan (minimal, UI-compatible)

This plan describes the smallest owned backend (REST) that replaces exactly what the UI currently calls via Base44, plus a resolution plan for missing helper modules that are referenced but absent from the repo.

Evidence standard: every UI dependency claim includes file+line links.

## Minimal endpoint list (REST)
The UI currently performs entity operations via `base44.entities.<Entity>.<Method>()` call-sites (full list in [API_CONTRACT.md](API_CONTRACT.md#L395) Appendix A). The minimal owned backend can expose resource endpoints per entity and a small auth surface.

### Auth
- `GET /api/auth/me` (required: UI calls `base44.auth.me()`; example usage: [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L24-L31))
- `PATCH /api/auth/me` (required: UI calls `base44.auth.updateMe(data)`; evidence: [src/pages/Profile.jsx](src/pages/Profile.jsx#L88))

### Entity resources
For each entity below, implement only the operations that exist in the UI call surface. Sorting/limit semantics must support the Base44-style signature used by the UI (e.g., `list("-created_date", 200)` in [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L38)).

#### Achievement
- GET /api/achievement — evidence: [src/pages/Profile.jsx](src/pages/Profile.jsx#L46) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.

#### BannedUser
- POST /api/banneduser — evidence: [src/components/forum/BanUserDialog.jsx](src/components/forum/BanUserDialog.jsx#L31) — Body: JSON payload (keys per [DATA_MODEL.md](DATA_MODEL.md#L1) observed sections).
- DELETE /api/banneduser/:id — evidence: [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L59) — Deletes by id.
- GET /api/banneduser — evidence: [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L25) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.

#### BashoRecord
- POST /api/bashorecord/bulk — evidence: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L237) — Body: `{ items: [...] }` where items are per-entity payload objects.
- DELETE /api/bashorecord/:id — evidence: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L415) — Deletes by id.
- GET /api/bashorecord — evidence: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L201) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.

#### ComparisonReport
- POST /api/comparisonreport — evidence: [src/components/comparison/SaveComparisonDialog.jsx](src/components/comparison/SaveComparisonDialog.jsx#L20) — Body: JSON payload (keys per [DATA_MODEL.md](DATA_MODEL.md#L1) observed sections).
- GET /api/comparisonreport — evidence: [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L18) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.
- PATCH /api/comparisonreport/:id — evidence: [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L41) — Body: JSON partial update; `id` is entity id.

#### DataCorrectionRequest
- POST /api/datacorrectionrequest — evidence: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L831) — Body: JSON payload (keys per [DATA_MODEL.md](DATA_MODEL.md#L1) observed sections).

#### ForumReply
- POST /api/forumreply — evidence: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L87) — Body: JSON payload (keys per [DATA_MODEL.md](DATA_MODEL.md#L1) observed sections).
- DELETE /api/forumreply/:id — evidence: [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L48) — Deletes by id.
- GET /api/forumreply — evidence: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L51) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.
- PATCH /api/forumreply/:id — evidence: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L117) — Body: JSON partial update; `id` is entity id.

#### ForumTopic
- POST /api/forumtopic — evidence: [src/components/forum/CreateTopicDialog.jsx](src/components/forum/CreateTopicDialog.jsx#L24) — Body: JSON payload (keys per [DATA_MODEL.md](DATA_MODEL.md#L1) observed sections).
- DELETE /api/forumtopic/:id — evidence: [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L46) — Deletes by id.
- GET /api/forumtopic — evidence: [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L31) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.
- PATCH /api/forumtopic/:id — evidence: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L80) — Body: JSON partial update; `id` is entity id.

#### LeagueMembership
- POST /api/leaguemembership — evidence: [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L36) — Body: JSON payload (keys per [DATA_MODEL.md](DATA_MODEL.md#L1) observed sections).
- GET /api/leaguemembership — evidence: [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L32) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.

#### Match
- POST /api/match/bulk — evidence: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L509) — Body: `{ items: [...] }` where items are per-entity payload objects.
- DELETE /api/match/:id — evidence: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L491) — Deletes by id.
- GET /api/match — evidence: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L488) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.

#### MatchPrediction
- POST /api/matchprediction — evidence: [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L128) — Body: JSON payload (keys per [DATA_MODEL.md](DATA_MODEL.md#L1) observed sections).
- GET /api/matchprediction — evidence: [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L90) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.

#### Notification
- GET /api/notification — evidence: [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L38) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.

#### PredictionLeague
- POST /api/predictionleague — evidence: [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L27) — Body: JSON payload (keys per [DATA_MODEL.md](DATA_MODEL.md#L1) observed sections).
- GET /api/predictionleague — evidence: [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L21) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.
- PATCH /api/predictionleague/:id — evidence: [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L47) — Body: JSON partial update; `id` is entity id.

#### Report
- POST /api/report — evidence: [src/components/forum/ReportDialog.jsx](src/components/forum/ReportDialog.jsx#L23) — Body: JSON payload (keys per [DATA_MODEL.md](DATA_MODEL.md#L1) observed sections).
- GET /api/report — evidence: [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L19) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.
- PATCH /api/report/:id — evidence: [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L36) — Body: JSON partial update; `id` is entity id.

#### Tournament
- GET /api/tournament — evidence: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L498) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.

#### TournamentPrediction
- POST /api/tournamentprediction — evidence: [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L56) — Body: JSON payload (keys per [DATA_MODEL.md](DATA_MODEL.md#L1) observed sections).
- GET /api/tournamentprediction — evidence: [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L35) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.

#### User
- GET /api/user — evidence: [src/pages/Forum.jsx](src/pages/Forum.jsx#L32) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.

#### Wrestler
- POST /api/wrestler/bulk — evidence: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L328) — Body: `{ items: [...] }` where items are per-entity payload objects.
- POST /api/wrestler — evidence: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L720) — Body: JSON payload (keys per [DATA_MODEL.md](DATA_MODEL.md#L1) observed sections).
- DELETE /api/wrestler/:id — evidence: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L386) — Deletes by id.
- GET /api/wrestler — evidence: [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L19) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.
- PATCH /api/wrestler/:id — evidence: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L569) — Body: JSON partial update; `id` is entity id.

#### WrestlerRating
- POST /api/wrestlerrating — evidence: [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L72) — Body: JSON payload (keys per [DATA_MODEL.md](DATA_MODEL.md#L1) observed sections).
- GET /api/wrestlerrating — evidence: [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L57) — Query params: `sort` (e.g. `-created_date`), `limit` (int) to mirror UI usage.
- PATCH /api/wrestlerrating/:id — evidence: [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L84) — Body: JSON partial update; `id` is entity id.

## Migration order (minimize breakage)
This sequence avoids breaking the app by starting with the highest-traffic reads and leaving writes/scoring until core reads are stable.

1) Read-only leaderboard slice
- Implement `GET /api/wrestler` and `GET /api/bashorecord` equivalents first (UI evidence: [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L90-L99)).
- Support `sort=-rank` and `sort=-created_date` plus `limit` (examples: [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L90), [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L99)).

2) Tournament browse/hub reads
- Implement `GET /api/tournament`, `GET /api/match` (UI evidence: [src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L16-L19), [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L23-L53)).

3) Forum reads then writes
- Reads: topics/replies/users (UI evidence: [src/pages/Forum.jsx](src/pages/Forum.jsx#L20-L32), [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L37-L74)).
- Writes: create/update/delete topic/reply, reports, bans (UI evidence: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L80-L176), [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L19-L59)).

4) Profile + notifications
- Profile update endpoint (`PATCH /api/auth/me`) (evidence: [src/pages/Profile.jsx](src/pages/Profile.jsx#L88)).
- Notification reads; keep 30s polling behavior stable (evidence: [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L34-L45)).

5) Predictions + scoring (last)
- Prediction entities are write-heavy and coupled to missing helper modules (evidence: [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L6-L8), [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L8)).

## Missing helpers resolution plan (.+@/api/functions/*)
The repo imports helper modules that do not exist, which is a build/runtime blocker (PSA-129: [MIGRATION_SPEC.md](MIGRATION_SPEC.md#L233)). Import evidence is exhaustively listed in [API_CONTRACT.md](API_CONTRACT.md#L1) Appendix D and summarized in [MIGRATION_EXECUTION_PLAN.md](MIGRATION_EXECUTION_PLAN.md#L104-L121).

Definitive module-path list (deterministic scan; each entry links to an import-site evidence line):

- `achievementSystem` — [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L14)
- `fetchRealMatchHistory` — [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L14)
- `fetchRealSumoData` — [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L13)
- `fetchWrestlerPhotos` — [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L15)
- `getUserDisplayName` — [src/pages/Forum.jsx](src/pages/Forum.jsx#L12)
- `matchPrediction` — [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L13)
- `notificationSystem` — [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L11)
- `predictionScoring` — [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L8)
- `resolveJSAProfiles` — [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L16)
- `syncLiveData` — [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L24)
- `userPreferences` — [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L25)

Recommended approach for backend replacement: implement server-side equivalents for the behaviors, then later (when frontend edits are allowed) implement thin client helper modules that call these endpoints.

### Server-side equivalents (minimal endpoints)
- `syncLiveData` → `POST /api/live/sync` (admin or authenticated) returning `{ success, cached, message, metadata, snapshot }` to match Leaderboard expectations (UI uses result fields in [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L388-L409)).
- `fetchRealSumoData`, `fetchRealMatchHistory`, `fetchWrestlerPhotos`, `resolveJSAProfiles` → admin-only ingestion endpoints (evidence of imports in [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L13-L16)).
- `notificationSystem` → `POST /api/notification/mark-read`, `POST /api/notification/mark-all-read` (UI calls `markNotificationAsRead`/`markAllAsRead` in [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L47-L58)).
- `achievementSystem` → endpoints to award achievements and/or list user achievements (import evidence in [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L14-L15); Achievement list call evidence in [src/pages/Profile.jsx](src/pages/Profile.jsx#L46)).
- `predictionScoring` → `POST /api/prediction/score-tournament` (admin) (import evidence in [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L6)).
- `matchPrediction` → `POST /api/predict/match` to return `{ ai_prediction, ai_probability, factors? }` (import evidence in [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L13)).
- `getUserDisplayName` → either drop by returning user objects with `username/full_name` from `GET /api/user` list, or add `GET /api/user/display-name?email=...` (imports: [src/pages/Forum.jsx](src/pages/Forum.jsx#L12), [src/pages/Profile.jsx](src/pages/Profile.jsx#L13)).
- `userPreferences` → `GET /api/user/preferences` + `PATCH /api/user/preferences` (import evidence: [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L25)).

### Alternative (not recommended for migration-first)
- Remove/replace imports and inline logic. This requires frontend edits under `src/`, which are out of scope for the current constraints.

## Counts (for implementation sizing)
- Entities with entity-method call-sites: 18 (evidence: [API_CONTRACT.md](API_CONTRACT.md#L1) Appendix A).
- Distinct entity operations (entity+method pairs): 45 (evidence: [API_CONTRACT.md](API_CONTRACT.md#L1) Appendix A).
- Missing helper module paths: 11 (evidence: [API_CONTRACT.md](API_CONTRACT.md#L1) Appendix D).
- Missing helper import sites: 17 (evidence: [COUPLING_SCAN.md](COUPLING_SCAN.md#L6-L19)).
- Polling/timer sites in code (deterministic scan): total 8 = `refetchInterval` 1 + `setInterval` 3 + `setTimeout` 4.
  - Evidence (all 8 sites): [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L42), [src/components/sync/SyncStatus.jsx](src/components/sync/SyncStatus.jsx#L30), [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L377), [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L34), [src/components/achievements/AchievementNotification.jsx](src/components/achievements/AchievementNotification.jsx#L8), [src/components/ui/use-toast.jsx](src/components/ui/use-toast.jsx#L28), [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L23), [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L38).
  - 30s-coded sites (2): [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L42), [src/components/sync/SyncStatus.jsx](src/components/sync/SyncStatus.jsx#L30).

## Verification Appendix (deterministic scan commands + counts)

Command (exact):

```bash
python3 - <<'PY'
from __future__ import annotations

import re
from pathlib import Path

CODE_GLOBS = ('src/**/*.js','src/**/*.jsx','src/**/*.ts','src/**/*.tsx')

rx_missing_helpers = re.compile(r"from\s+['\"](?:\.\@|\.\./\.\@)/api/functions/([A-Za-z0-9_/-]+)['\"]")
rx_refetch = re.compile(r"\brefetchInterval\s*:")
rx_setinterval = re.compile(r"\bsetInterval\s*\(")
rx_settimeout = re.compile(r"\bsetTimeout\s*\(")

missing = {}
refetch = []
interval = []
timeout = []

files = []
for g in CODE_GLOBS:
	files.extend(Path('.').glob(g))

for p in sorted(set(files)):
	if not p.is_file():
		continue
	lines = p.read_text(encoding='utf-8', errors='replace').splitlines()
	for i, line in enumerate(lines, start=1):
		if '.@/api/functions/' in line or '../.@/api/functions/' in line:
			m = rx_missing_helpers.search(line)
			if m:
				missing.setdefault(m.group(1), []).append((p.as_posix(), i))
		if rx_refetch.search(line):
			refetch.append((p.as_posix(), i))
		if rx_setinterval.search(line):
			interval.append((p.as_posix(), i))
		if rx_settimeout.search(line):
			timeout.append((p.as_posix(), i))

print('missing_helper_modules=', len(missing))
print('missing_helper_import_sites=', sum(len(v) for v in missing.values()))
print('refetchInterval_sites=', len(refetch))
print('setInterval_sites=', len(interval))
print('setTimeout_sites=', len(timeout))
print('timer_polling_total=', len(refetch)+len(interval)+len(timeout))
PY
```
