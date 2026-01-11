# API Contract (UI-driven)

This document defines the minimum backend contract required to replace the Base44 SDK usage currently present in the UI, without adding new UX or capabilities.

Evidence standard: every behavioral claim includes file+line links to the current repo. Entity field/payload evidence is sourced from the grounded “Observed entities & fields (current code)” section in [DATA_MODEL.md](DATA_MODEL.md#L1).

## Current coupling counts (code-only scan)
Counts are from the generated line-level coupling scan in [COUPLING_SCAN.md](COUPLING_SCAN.md#L1):

| Category | Match count |
|---|---:|
| base44_sdk_createClient | 4 |
| base44_entities | 116 |
| base44_auth | 11 |
| base44_integrations | 8 |
| missing_helpers_dotat | 17 |
| env_import_meta_or_process | 0 |
| network_fetch | 0 |
| network_axios | 0 |
| network_websocket | 0 |
| storage_local | 12 |
| timers | 7 |
| cors_preview_wix | 2 |
| react_query_refetchInterval | 1 |

## Auth/session assumptions
- Base44 client is configured with `requiresAuth: true` and a hard-coded `appId` in [src/api/base44Client.js](src/api/base44Client.js#L5-L8).
- UI expects a current-user fetch to be available (multiple `base44.auth.me()` call-sites; see Appendix A).
- UI consumes user identity/role fields `email`, `role`, `username`, `full_name` per [DATA_MODEL.md](DATA_MODEL.md#L24-L33) (example display-name logic: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L17-L21)).
- Profile update writes via `base44.auth.updateMe(data)` in [src/pages/Profile.jsx](src/pages/Profile.jsx#L88) — `mutationFn: (data) => base44.auth.updateMe(data),`.
- Profile edit payload defaults include `privacy_settings` keys `show_email`, `show_profile` in [src/pages/Profile.jsx](src/pages/Profile.jsx#L101-L105) — `privacy_settings: profileUser?.privacy_settings || { show_email: false, show_profile: true }`.

Minimum owned-backend replacement endpoints implied by the above:
- `GET /api/auth/me` → returns current user (must include at least `email`, `role`, `username`, `full_name`).
- `PATCH /api/auth/me` → accepts `{ username, bio, privacy_settings: { show_email, show_profile } }` (union of observed keys).

## Entity contracts (operations the UI actually uses)
- Entities with method call-sites: 18 (derived from Appendix A).
- Distinct (entity, method) pairs: 45 (derived from Appendix A).

### Operation semantics (apply to every entity below)

- `list(sort, limit)`
	- Input: `sort` is a string like `'-created_date'` and `limit` is an integer (example: [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L38)).
	- Output: array of entity objects. UI immediately filters client-side in multiple places (example: `recipient_email` filter in [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L38-L40)), so the owned backend must return enough fields for the UI’s filter/render logic (see each entity’s “Observed payload keys and/or fields consumed by UI”).

- `create(payload)`
	- Input: JSON object; required keys are the union of keys the UI sends today (see each entity’s “Observed payload keys…” block in [DATA_MODEL.md](DATA_MODEL.md#L1)).
	- Output: created entity, including `id` (UI uses ids for subsequent updates/deletes; example: `notification.id` in [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L68-L71)).

- `update(id, patch)`
	- Input: `id` (string/uuid) plus a JSON partial update object (example entity update in [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L80-L90) — `base44.entities.ForumTopic.update(topic.id, {` and profile update in [src/pages/Profile.jsx](src/pages/Profile.jsx#L88) — `mutationFn: (data) => base44.auth.updateMe(data),`).
	- Output: updated entity (or at minimum `{ id }`), because some flows update local state from mutation results.

- `delete(id)`
	- Input: `id` (string/uuid) (example: [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L415)).
	- Output: success indicator (boolean) or 204; UI primarily relies on React Query invalidation.

- `bulkCreate(items)`
	- Input: array of payload objects (example variable `toCreate` used in [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L237)).
	- Output: created count or created items; the import page expects the operation to complete without partial failures.

### Achievement
Operations used by UI: list

- Evidence for `Achievement.list` call-sites:
- [src/pages/Profile.jsx](src/pages/Profile.jsx#L46) — const allAchievements = await base44.entities.Achievement.list('-created_date', 200);

Observed payload/field evidence: not explicitly enumerated in [DATA_MODEL.md](DATA_MODEL.md#L1); use call-sites above to derive shapes.

### BannedUser
Operations used by UI: create, delete, list

- Evidence for `BannedUser.create` call-sites:
- [src/components/forum/BanUserDialog.jsx](src/components/forum/BanUserDialog.jsx#L31) — await base44.entities.BannedUser.create({
- Evidence for `BannedUser.delete` call-sites:
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L59) — mutationFn: (id) => base44.entities.BannedUser.delete(id),
- Evidence for `BannedUser.list` call-sites:
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L25) — queryFn: () => base44.entities.BannedUser.list('-created_date', 100),

Observed payload keys and/or fields consumed by UI (grounded):
- Create payload fields: `user_email`, `banned_by`, `reason`, `is_permanent`, `ban_until` ([src/components/forum/BanUserDialog.jsx](src/components/forum/BanUserDialog.jsx#L31)).

### BashoRecord
Operations used by UI: bulkCreate, delete, list

- Evidence for `BashoRecord.bulkCreate` call-sites:
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L237) — await base44.entities.BashoRecord.bulkCreate(toCreate);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L798) — await base44.entities.BashoRecord.bulkCreate(toCreate);
- Evidence for `BashoRecord.delete` call-sites:
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L415) — await base44.entities.BashoRecord.delete(sorted[i].id);
- Evidence for `BashoRecord.list` call-sites:
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L201) — const allRecords = await base44.entities.BashoRecord.list('-created_date', 10000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L393) — const allBashoRecords = await base44.entities.BashoRecord.list('-created_date', 10000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L595) — data = await base44.entities.BashoRecord.list('-created_date', 10000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L766) — const existingRecords = await base44.entities.BashoRecord.list('-created_date', 10000);
- [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L99) — return await base44.entities.BashoRecord.list('-created_date', 5000);
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L61) — queryFn: () => base44.entities.BashoRecord.list('-basho', 5000),
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L68) — const allRecords = await base44.entities.BashoRecord.list('-basho', 5000);

Observed import/ingestion fields (shared evidence block):
The app constructs/imports these entities in the admin import page; observed fields include:

- `BashoRecord` stub shape: `record_id`, `rid`, `shikona`, `basho`, `wins`, `losses`, `absences`, `win_pct`, `is_stub` ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L221-L230)).
- `Wrestler` stub shape: `rid`, `shikona`, `current_rank`, `status_is_active`, `status_is_retired` ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L314-L324)).
- `Match` import mapping adds: `tournament_id`, `wrestler1_id`, `wrestler2_id`, `winner_id` (note: values are derived from wrestler names in this mapping) ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L503-L506)).
- `Tournament` fields consumed broadly: `name`, `status`, `basho`, `location`, `start_date`, `end_date`, `winner`, `winner_record`, `runner_up`, `special_prizes` ([src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L19-L140)).

### ComparisonReport
Operations used by UI: create, list, update

- Evidence for `ComparisonReport.create` call-sites:
- [src/components/comparison/SaveComparisonDialog.jsx](src/components/comparison/SaveComparisonDialog.jsx#L20) — mutationFn: (data) => base44.entities.ComparisonReport.create(data),
- Evidence for `ComparisonReport.list` call-sites:
- [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L18) — const allReports = await base44.entities.ComparisonReport.list('-created_date', 200);
- Evidence for `ComparisonReport.update` call-sites:
- [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L41) — base44.entities.ComparisonReport.update(reportId, {
- [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L52) — return base44.entities.ComparisonReport.update(reportId, {

Observed payload keys and/or fields consumed by UI (grounded):
- Create payload fields: `title`, `wrestler_ids` (array), `notes`, `is_public`, `views`, `likes` ([src/components/comparison/SaveComparisonDialog.jsx](src/components/comparison/SaveComparisonDialog.jsx#L36-L40)).
- Update payload fields: `views`, `likes`, `liked_by` ([src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L41-L58)).

### DataCorrectionRequest
Operations used by UI: create

- Evidence for `DataCorrectionRequest.create` call-sites:
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L831) — await base44.entities.DataCorrectionRequest.create({

Observed payload keys and/or fields consumed by UI (grounded):
- Create payload fields: `issue_description`, `suggested_correction` ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L832-L833)).

### ForumReply
Operations used by UI: create, delete, list, update

- Evidence for `ForumReply.create` call-sites:
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L87) — mutationFn: (data) => base44.entities.ForumReply.create(data),
- Evidence for `ForumReply.delete` call-sites:
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L48) — await base44.entities.ForumReply.delete(id);
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L138) — mutationFn: (replyId) => base44.entities.ForumReply.delete(replyId),
- Evidence for `ForumReply.list` call-sites:
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L51) — const allReplies = await base44.entities.ForumReply.list('-created_date', 200);
- [src/pages/Profile.jsx](src/pages/Profile.jsx#L74) — const allReplies = await base44.entities.ForumReply.list('-created_date', 200);
- Evidence for `ForumReply.update` call-sites:
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L117) — return base44.entities.ForumReply.update(reply.id, {

Observed payload keys and/or fields consumed by UI (grounded):
- Create payload fields: `topic_id`, `content` ([src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L173-L176)).
- Update payload fields: `likes`, `liked_by` ([src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L111-L123)).

### ForumTopic
Operations used by UI: create, delete, list, update

- Evidence for `ForumTopic.create` call-sites:
- [src/components/forum/CreateTopicDialog.jsx](src/components/forum/CreateTopicDialog.jsx#L24) — await base44.entities.ForumTopic.create({
- Evidence for `ForumTopic.delete` call-sites:
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L46) — await base44.entities.ForumTopic.delete(id);
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L130) — mutationFn: () => base44.entities.ForumTopic.delete(topicId),
- Evidence for `ForumTopic.list` call-sites:
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L31) — queryFn: () => base44.entities.ForumTopic.list('-created_date', 100),
- [src/pages/Forum.jsx](src/pages/Forum.jsx#L20) — queryFn: () => base44.entities.ForumTopic.list('-created_date', 50),
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L37) — const topics = await base44.entities.ForumTopic.list('-created_date', 100);
- [src/pages/Profile.jsx](src/pages/Profile.jsx#L60) — const allTopics = await base44.entities.ForumTopic.list('-created_date', 100);
- [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L40) — const allTopics = await base44.entities.ForumTopic.list('-created_date', 100);
- Evidence for `ForumTopic.update` call-sites:
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L80) — base44.entities.ForumTopic.update(topic.id, {
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L90) — await base44.entities.ForumTopic.update(topicId, {
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L146) — mutationFn: () => base44.entities.ForumTopic.update(topicId, {
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L156) — mutationFn: () => base44.entities.ForumTopic.update(topicId, {

Observed payload keys and/or fields consumed by UI (grounded):
- Create payload fields: `title`, `content`, `category`, `view_count`, `reply_count` ([src/components/forum/CreateTopicDialog.jsx](src/components/forum/CreateTopicDialog.jsx#L24)).
- Update payload fields: `view_count`, `reply_count`, `is_pinned`, `is_locked` ([src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L80-L90), [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L146-L158)).
- Observed foreign/user linkage: the UI reads `topic.created_by` to notify the topic creator ([src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L112-L114)).

### LeagueMembership
Operations used by UI: create, list

- Evidence for `LeagueMembership.create` call-sites:
- [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L36) — await base44.entities.LeagueMembership.create({
- [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L42) — await base44.entities.LeagueMembership.create({
- Evidence for `LeagueMembership.list` call-sites:
- [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L32) — const allMemberships = await base44.entities.LeagueMembership.list('-created_date', 500);
- [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L27) — const allMemberships = await base44.entities.LeagueMembership.list('-created_date', 500);
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L34) — const allMemberships = await base44.entities.LeagueMembership.list('-total_points', 500);

Observed payload keys and/or fields consumed by UI (grounded):
- Create payload fields: `league_id`, `user_email` ([src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L36-L39), [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L42-L45)).
- Observed scoring fields: `total_points`, `correct_predictions` are rendered in league views ([src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L141-L175)).

### Match
Operations used by UI: bulkCreate, delete, list

- Evidence for `Match.bulkCreate` call-sites:
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L509) — await base44.entities.Match.bulkCreate(matchesWithIds);
- Evidence for `Match.delete` call-sites:
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L491) — await base44.entities.Match.delete(match.id);
- Evidence for `Match.list` call-sites:
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L488) — const existing = await base44.entities.Match.list('-created_date', 500);
- [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L53) — return await base44.entities.Match.list('-match_date', 500);

Observed import/ingestion fields (shared evidence block):
The app constructs/imports these entities in the admin import page; observed fields include:

- `BashoRecord` stub shape: `record_id`, `rid`, `shikona`, `basho`, `wins`, `losses`, `absences`, `win_pct`, `is_stub` ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L221-L230)).
- `Wrestler` stub shape: `rid`, `shikona`, `current_rank`, `status_is_active`, `status_is_retired` ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L314-L324)).
- `Match` import mapping adds: `tournament_id`, `wrestler1_id`, `wrestler2_id`, `winner_id` (note: values are derived from wrestler names in this mapping) ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L503-L506)).
- `Tournament` fields consumed broadly: `name`, `status`, `basho`, `location`, `start_date`, `end_date`, `winner`, `winner_record`, `runner_up`, `special_prizes` ([src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L19-L140)).

### MatchPrediction
Operations used by UI: create, list

- Evidence for `MatchPrediction.create` call-sites:
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L128) — return base44.entities.MatchPrediction.create(data);
- Evidence for `MatchPrediction.list` call-sites:
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L90) — const allPredictions = await base44.entities.MatchPrediction.list('-created_date', 500);
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L114) — const allPredictions = await base44.entities.MatchPrediction.list('-created_date', 50);

Observed payload keys and/or fields consumed by UI (grounded):
- Create payload fields: `wrestler1_id`, `wrestler1_name`, `wrestler2_id`, `wrestler2_name`, `user_prediction`, `ai_prediction`, `ai_probability`, `match_date`, `is_resolved` ([src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L280-L288)).
- Observed resolution fields: `is_resolved`, `is_correct` are used to compute stats ([src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L83-L92)).

### Notification
Operations used by UI: list

- Evidence for `Notification.list` call-sites:
- [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L38) — const all = await base44.entities.Notification.list('-created_date', 50);

Observed payload keys and/or fields consumed by UI (grounded):
- List/filter fields: `recipient_email` ([src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L38-L40)).
- Read-state fields: `is_read` ([src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L59-L63)).
- Display fields: `type`, `title`, `message`, `link`, `created_date` ([src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L106-L140)).

### PredictionLeague
Operations used by UI: create, list, update

- Evidence for `PredictionLeague.create` call-sites:
- [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L27) — const league = await base44.entities.PredictionLeague.create({
- Evidence for `PredictionLeague.list` call-sites:
- [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L21) — const allLeagues = await base44.entities.PredictionLeague.list('-created_date', 200);
- [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L39) — queryFn: () => base44.entities.PredictionLeague.list('-created_date', 200),
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L20) — const leagues = await base44.entities.PredictionLeague.list('-created_date', 200);
- Evidence for `PredictionLeague.update` call-sites:
- [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L47) — await base44.entities.PredictionLeague.update(league.id, {

Observed payload keys and/or fields consumed by UI (grounded):
- Create payload fields: `name`, `description`, `join_code`, `is_public`, `admin_email`, `member_count` ([src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L27-L34)).
- Update payload fields: `member_count` ([src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L47-L49)).

### Report
Operations used by UI: create, list, update

- Evidence for `Report.create` call-sites:
- [src/components/forum/ReportDialog.jsx](src/components/forum/ReportDialog.jsx#L23) — await base44.entities.Report.create({
- Evidence for `Report.list` call-sites:
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L19) — queryFn: () => base44.entities.Report.list('-created_date', 200),
- Evidence for `Report.update` call-sites:
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L36) — mutationFn: ({ id, data }) => base44.entities.Report.update(id, data),

Observed payload keys and/or fields consumed by UI (grounded):
- Create payload fields: `content_type`, `content_id`, `reason`, `details`, `status` ([src/components/forum/ReportDialog.jsx](src/components/forum/ReportDialog.jsx#L23)).

### Tournament
Operations used by UI: list

- Evidence for `Tournament.list` call-sites:
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L498) — const tournaments = await base44.entities.Tournament.list('-start_date', 100);
- [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L48) — queryFn: () => base44.entities.Tournament.list('-start_date', 100),
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L65) — queryFn: () => base44.entities.Tournament.list('-start_date', 100),
- [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L23) — return await base44.entities.Tournament.list('-start_date', 100);
- [src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L19) — queryFn: () => base44.entities.Tournament.list('-start_date', 100),

Observed import/ingestion fields (shared evidence block):
The app constructs/imports these entities in the admin import page; observed fields include:

- `BashoRecord` stub shape: `record_id`, `rid`, `shikona`, `basho`, `wins`, `losses`, `absences`, `win_pct`, `is_stub` ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L221-L230)).
- `Wrestler` stub shape: `rid`, `shikona`, `current_rank`, `status_is_active`, `status_is_retired` ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L314-L324)).
- `Match` import mapping adds: `tournament_id`, `wrestler1_id`, `wrestler2_id`, `winner_id` (note: values are derived from wrestler names in this mapping) ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L503-L506)).
- `Tournament` fields consumed broadly: `name`, `status`, `basho`, `location`, `start_date`, `end_date`, `winner`, `winner_record`, `runner_up`, `special_prizes` ([src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L19-L140)).

### TournamentPrediction
Operations used by UI: create, list

- Evidence for `TournamentPrediction.create` call-sites:
- [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L56) — await base44.entities.TournamentPrediction.create({
- Evidence for `TournamentPrediction.list` call-sites:
- [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L35) — const predictions = await base44.entities.TournamentPrediction.list('-created_date', 500);
- [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L43) — const allPredictions = await base44.entities.TournamentPrediction.list('-created_date', 500);
- [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L57) — const allPredictions = await base44.entities.TournamentPrediction.list('-created_date', 500);
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L48) — const allPredictions = await base44.entities.TournamentPrediction.list('-created_date', 500);

Observed payload keys and/or fields consumed by UI (grounded):
- Create payload fields: `tournament_id`, `league_id`, `user_email`, `predicted_winner`, `predicted_runner_up`, `predicted_outstanding_performance` ([src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L56-L63)).
- Observed scoring fields: `is_scored` is checked before notifying users ([src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L35)).

### User
Operations used by UI: list

- Evidence for `User.list` call-sites:
- [src/pages/Forum.jsx](src/pages/Forum.jsx#L32) — return await base44.entities.User.list('-created_date', 500);
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L70) — return await base44.entities.User.list('-created_date', 500);
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L72) — return await base44.entities.User.list('-created_date', 500);
- [src/pages/Profile.jsx](src/pages/Profile.jsx#L32) — const users = await base44.entities.User.list('-created_date', 500);

Observed payload/field evidence: not explicitly enumerated in [DATA_MODEL.md](DATA_MODEL.md#L1); use call-sites above to derive shapes.

### Wrestler
Operations used by UI: bulkCreate, create, delete, list, update

- Evidence for `Wrestler.bulkCreate` call-sites:
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L328) — await base44.entities.Wrestler.bulkCreate(stubWrestlers);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L460) — await base44.entities.Wrestler.bulkCreate(data.wrestlers);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L690) — await base44.entities.Wrestler.bulkCreate(toCreate);
- Evidence for `Wrestler.create` call-sites:
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L720) — await base44.entities.Wrestler.create(record);
- Evidence for `Wrestler.delete` call-sites:
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L386) — await base44.entities.Wrestler.delete(sorted[i].id);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L455) — await base44.entities.Wrestler.delete(wrestler.id);
- Evidence for `Wrestler.list` call-sites:
- [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L19) — queryFn: () => base44.entities.Wrestler.list('-rank', 500),
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L200) — const allWrestlers = await base44.entities.Wrestler.list('-created_date', 5000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L282) — const existingWrestlers = await base44.entities.Wrestler.list('-created_date', 5000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L363) — const allWrestlers = await base44.entities.Wrestler.list('-created_date', 5000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L452) — const existing = await base44.entities.Wrestler.list('-created_date', 500);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L560) — const wrestlers = await base44.entities.Wrestler.list('-created_date', 500);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L593) — data = await base44.entities.Wrestler.list('-created_date', 5000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L666) — const existingWrestlers = await base44.entities.Wrestler.list('-created_date', 5000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L769) — const existingWrestlers = await base44.entities.Wrestler.list('-created_date', 5000);
- [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L90) — queryFn: () => base44.entities.Wrestler.list('-rank', 500),
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L47) — const allWrestlers = await base44.entities.Wrestler.list('-created_date', 1000);
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L67) — const allWrestlers = await base44.entities.Wrestler.list('-created_date', 1000);
- [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L27) — const all = await base44.entities.Wrestler.list('-rank', 500);
- [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L33) — queryFn: () => base44.entities.Wrestler.list('-rank', 500),
- [src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L179) — queryFn: () => base44.entities.Wrestler.list('-rank', 500),
- Evidence for `Wrestler.update` call-sites:
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L569) — await base44.entities.Wrestler.update(matchingWrestler.id, {
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L716) — await base44.entities.Wrestler.update(existing.id, record);

Observed import/ingestion fields (shared evidence block):
The app constructs/imports these entities in the admin import page; observed fields include:

- `BashoRecord` stub shape: `record_id`, `rid`, `shikona`, `basho`, `wins`, `losses`, `absences`, `win_pct`, `is_stub` ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L221-L230)).
- `Wrestler` stub shape: `rid`, `shikona`, `current_rank`, `status_is_active`, `status_is_retired` ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L314-L324)).
- `Match` import mapping adds: `tournament_id`, `wrestler1_id`, `wrestler2_id`, `winner_id` (note: values are derived from wrestler names in this mapping) ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L503-L506)).
- `Tournament` fields consumed broadly: `name`, `status`, `basho`, `location`, `start_date`, `end_date`, `winner`, `winner_record`, `runner_up`, `special_prizes` ([src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L19-L140)).

### WrestlerRating
Operations used by UI: create, list, update

- Evidence for `WrestlerRating.create` call-sites:
- [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L72) — mutationFn: (data) => base44.entities.WrestlerRating.create(data),
- Evidence for `WrestlerRating.list` call-sites:
- [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L57) — const all = await base44.entities.WrestlerRating.list('-created_date', 500);
- [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L65) — const all = await base44.entities.WrestlerRating.list('-created_date', 500);
- Evidence for `WrestlerRating.update` call-sites:
- [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L84) — mutationFn: ({ id, data }) => base44.entities.WrestlerRating.update(id, data),

Observed payload keys and/or fields consumed by UI (grounded):
- Create/update payload fields: `wrestler_id`, `rating`, `comment`, `categories` (JSON-ish object) ([src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L110-L113)).
- Observed filtering fields: `created_by` is used to find the current user’s rating ([src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L77-L80)).

## Polling + realtime expectations (PSA-140..PSA-142)
PSA definitions: [MIGRATION_SPEC.md](MIGRATION_SPEC.md#L243-L245).

### Observed polling/timer behavior in repo
- Deterministic scan results (see **Verification Appendix**): `refetchInterval` sites = 1, `setInterval` sites = 3, `setTimeout` sites = 4 (total timer/polling sites = 8).

**refetchInterval (1)**

- [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L42) — `refetchInterval: 30000 // Refetch every 30 seconds`

**setInterval (3)**

- [src/components/sync/SyncStatus.jsx](src/components/sync/SyncStatus.jsx#L30) — `const interval = setInterval(updateStatus, 30000); // Update every 30s`
- [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L377) — `const interval = setInterval(() => {`
- [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L34) — `gameLoopRef.current = setInterval(() => {`

**setTimeout (4)**

- [src/components/achievements/AchievementNotification.jsx](src/components/achievements/AchievementNotification.jsx#L8) — `const timer = setTimeout(() => {`
- [src/components/ui/use-toast.jsx](src/components/ui/use-toast.jsx#L28) — `const timeout = setTimeout(() => {`
- [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L23) — `setTimeout(() => setPlayer1Pushing(false), 200)`
- [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L38) — `setTimeout(() => setPlayer2Pushing(false), 200)`

Notes:

- The Leaderboard “live sync” path is delegated to a missing helper module `syncLiveData` (called in [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L388-L409); import evidence in Appendix D).
- `setTimeout` sites above are UI timers (notifications/toasts/gameplay) rather than backend polling; they are included here because they match the deterministic “timer/polling” scan patterns.

### Required backend behavior for PSA-140..PSA-142 (UI-compatible)
- PSA-140: UI has 30s cadence patterns (notifications + sync status) but no provable 30s live-match polling loop; implement a stable live snapshot read endpoint that can be polled at ~30s during active basho without degrading the app (cadence requirement: [MIGRATION_SPEC.md](MIGRATION_SPEC.md#L243)). Evidence of existing 30s intervals: [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L42), [src/components/sync/SyncStatus.jsx](src/components/sync/SyncStatus.jsx#L30).
- PSA-141: UI contains logic for `tournamentData.live_status.current_bout` and notification/toast behavior in [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L340-L372); backend live snapshot must include `live_status.current_bout` and resolved outcomes in a single poll response (requirement: [MIGRATION_SPEC.md](MIGRATION_SPEC.md#L244)).
- PSA-142: UI currently shows a generic preview-mode/CORS notice rather than a “stale snapshot” indicator (notice in [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L318-L320)); backend should return `{ snapshot, snapshot_ts, is_stale }` (or equivalent) so UI can display “stale/unavailable” rather than erroring (requirement: [MIGRATION_SPEC.md](MIGRATION_SPEC.md#L245)).

## Appendix A — Full list of base44.entities.<Entity>.<Method>() calls
### Achievement.list (1 call-site(s))
- [src/pages/Profile.jsx](src/pages/Profile.jsx#L46) — const allAchievements = await base44.entities.Achievement.list('-created_date', 200);

### BannedUser.create (1 call-site(s))
- [src/components/forum/BanUserDialog.jsx](src/components/forum/BanUserDialog.jsx#L31) — await base44.entities.BannedUser.create({

### BannedUser.delete (1 call-site(s))
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L59) — mutationFn: (id) => base44.entities.BannedUser.delete(id),

### BannedUser.list (1 call-site(s))
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L25) — queryFn: () => base44.entities.BannedUser.list('-created_date', 100),

### BashoRecord.bulkCreate (2 call-site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L237) — await base44.entities.BashoRecord.bulkCreate(toCreate);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L798) — await base44.entities.BashoRecord.bulkCreate(toCreate);

### BashoRecord.delete (1 call-site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L415) — await base44.entities.BashoRecord.delete(sorted[i].id);

### BashoRecord.list (7 call-site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L201) — const allRecords = await base44.entities.BashoRecord.list('-created_date', 10000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L393) — const allBashoRecords = await base44.entities.BashoRecord.list('-created_date', 10000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L595) — data = await base44.entities.BashoRecord.list('-created_date', 10000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L766) — const existingRecords = await base44.entities.BashoRecord.list('-created_date', 10000);
- [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L99) — return await base44.entities.BashoRecord.list('-created_date', 5000);
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L61) — queryFn: () => base44.entities.BashoRecord.list('-basho', 5000),
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L68) — const allRecords = await base44.entities.BashoRecord.list('-basho', 5000);

### ComparisonReport.create (1 call-site(s))
- [src/components/comparison/SaveComparisonDialog.jsx](src/components/comparison/SaveComparisonDialog.jsx#L20) — mutationFn: (data) => base44.entities.ComparisonReport.create(data),

### ComparisonReport.list (1 call-site(s))
- [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L18) — const allReports = await base44.entities.ComparisonReport.list('-created_date', 200);

### ComparisonReport.update (2 call-site(s))
- [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L41) — base44.entities.ComparisonReport.update(reportId, {
- [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L52) — return base44.entities.ComparisonReport.update(reportId, {

### DataCorrectionRequest.create (1 call-site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L831) — await base44.entities.DataCorrectionRequest.create({

### ForumReply.create (1 call-site(s))
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L87) — mutationFn: (data) => base44.entities.ForumReply.create(data),

### ForumReply.delete (2 call-site(s))
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L48) — await base44.entities.ForumReply.delete(id);
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L138) — mutationFn: (replyId) => base44.entities.ForumReply.delete(replyId),

### ForumReply.list (2 call-site(s))
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L51) — const allReplies = await base44.entities.ForumReply.list('-created_date', 200);
- [src/pages/Profile.jsx](src/pages/Profile.jsx#L74) — const allReplies = await base44.entities.ForumReply.list('-created_date', 200);

### ForumReply.update (1 call-site(s))
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L117) — return base44.entities.ForumReply.update(reply.id, {

### ForumTopic.create (1 call-site(s))
- [src/components/forum/CreateTopicDialog.jsx](src/components/forum/CreateTopicDialog.jsx#L24) — await base44.entities.ForumTopic.create({

### ForumTopic.delete (2 call-site(s))
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L46) — await base44.entities.ForumTopic.delete(id);
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L130) — mutationFn: () => base44.entities.ForumTopic.delete(topicId),

### ForumTopic.list (5 call-site(s))
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L31) — queryFn: () => base44.entities.ForumTopic.list('-created_date', 100),
- [src/pages/Forum.jsx](src/pages/Forum.jsx#L20) — queryFn: () => base44.entities.ForumTopic.list('-created_date', 50),
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L37) — const topics = await base44.entities.ForumTopic.list('-created_date', 100);
- [src/pages/Profile.jsx](src/pages/Profile.jsx#L60) — const allTopics = await base44.entities.ForumTopic.list('-created_date', 100);
- [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L40) — const allTopics = await base44.entities.ForumTopic.list('-created_date', 100);

### ForumTopic.update (4 call-site(s))
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L80) — base44.entities.ForumTopic.update(topic.id, {
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L90) — await base44.entities.ForumTopic.update(topicId, {
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L146) — mutationFn: () => base44.entities.ForumTopic.update(topicId, {
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L156) — mutationFn: () => base44.entities.ForumTopic.update(topicId, {

### LeagueMembership.create (2 call-site(s))
- [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L36) — await base44.entities.LeagueMembership.create({
- [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L42) — await base44.entities.LeagueMembership.create({

### LeagueMembership.list (3 call-site(s))
- [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L32) — const allMemberships = await base44.entities.LeagueMembership.list('-created_date', 500);
- [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L27) — const allMemberships = await base44.entities.LeagueMembership.list('-created_date', 500);
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L34) — const allMemberships = await base44.entities.LeagueMembership.list('-total_points', 500);

### Match.bulkCreate (1 call-site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L509) — await base44.entities.Match.bulkCreate(matchesWithIds);

### Match.delete (1 call-site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L491) — await base44.entities.Match.delete(match.id);

### Match.list (2 call-site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L488) — const existing = await base44.entities.Match.list('-created_date', 500);
- [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L53) — return await base44.entities.Match.list('-match_date', 500);

### MatchPrediction.create (1 call-site(s))
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L128) — return base44.entities.MatchPrediction.create(data);

### MatchPrediction.list (2 call-site(s))
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L90) — const allPredictions = await base44.entities.MatchPrediction.list('-created_date', 500);
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L114) — const allPredictions = await base44.entities.MatchPrediction.list('-created_date', 50);

### Notification.list (1 call-site(s))
- [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L38) — const all = await base44.entities.Notification.list('-created_date', 50);

### PredictionLeague.create (1 call-site(s))
- [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L27) — const league = await base44.entities.PredictionLeague.create({

### PredictionLeague.list (3 call-site(s))
- [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L21) — const allLeagues = await base44.entities.PredictionLeague.list('-created_date', 200);
- [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L39) — queryFn: () => base44.entities.PredictionLeague.list('-created_date', 200),
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L20) — const leagues = await base44.entities.PredictionLeague.list('-created_date', 200);

### PredictionLeague.update (1 call-site(s))
- [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L47) — await base44.entities.PredictionLeague.update(league.id, {

### Report.create (1 call-site(s))
- [src/components/forum/ReportDialog.jsx](src/components/forum/ReportDialog.jsx#L23) — await base44.entities.Report.create({

### Report.list (1 call-site(s))
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L19) — queryFn: () => base44.entities.Report.list('-created_date', 200),

### Report.update (1 call-site(s))
- [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L36) — mutationFn: ({ id, data }) => base44.entities.Report.update(id, data),

### Tournament.list (5 call-site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L498) — const tournaments = await base44.entities.Tournament.list('-start_date', 100);
- [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L48) — queryFn: () => base44.entities.Tournament.list('-start_date', 100),
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L65) — queryFn: () => base44.entities.Tournament.list('-start_date', 100),
- [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L23) — return await base44.entities.Tournament.list('-start_date', 100);
- [src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L19) — queryFn: () => base44.entities.Tournament.list('-start_date', 100),

### TournamentPrediction.create (1 call-site(s))
- [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L56) — await base44.entities.TournamentPrediction.create({

### TournamentPrediction.list (4 call-site(s))
- [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L35) — const predictions = await base44.entities.TournamentPrediction.list('-created_date', 500);
- [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L43) — const allPredictions = await base44.entities.TournamentPrediction.list('-created_date', 500);
- [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L57) — const allPredictions = await base44.entities.TournamentPrediction.list('-created_date', 500);
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L48) — const allPredictions = await base44.entities.TournamentPrediction.list('-created_date', 500);

### User.list (4 call-site(s))
- [src/pages/Forum.jsx](src/pages/Forum.jsx#L32) — return await base44.entities.User.list('-created_date', 500);
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L70) — return await base44.entities.User.list('-created_date', 500);
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L72) — return await base44.entities.User.list('-created_date', 500);
- [src/pages/Profile.jsx](src/pages/Profile.jsx#L32) — const users = await base44.entities.User.list('-created_date', 500);

### Wrestler.bulkCreate (3 call-site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L328) — await base44.entities.Wrestler.bulkCreate(stubWrestlers);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L460) — await base44.entities.Wrestler.bulkCreate(data.wrestlers);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L690) — await base44.entities.Wrestler.bulkCreate(toCreate);

### Wrestler.create (1 call-site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L720) — await base44.entities.Wrestler.create(record);

### Wrestler.delete (2 call-site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L386) — await base44.entities.Wrestler.delete(sorted[i].id);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L455) — await base44.entities.Wrestler.delete(wrestler.id);

### Wrestler.list (15 call-site(s))
- [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L19) — queryFn: () => base44.entities.Wrestler.list('-rank', 500),
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L200) — const allWrestlers = await base44.entities.Wrestler.list('-created_date', 5000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L282) — const existingWrestlers = await base44.entities.Wrestler.list('-created_date', 5000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L363) — const allWrestlers = await base44.entities.Wrestler.list('-created_date', 5000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L452) — const existing = await base44.entities.Wrestler.list('-created_date', 500);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L560) — const wrestlers = await base44.entities.Wrestler.list('-created_date', 500);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L593) — data = await base44.entities.Wrestler.list('-created_date', 5000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L666) — const existingWrestlers = await base44.entities.Wrestler.list('-created_date', 5000);
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L769) — const existingWrestlers = await base44.entities.Wrestler.list('-created_date', 5000);
- [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L90) — queryFn: () => base44.entities.Wrestler.list('-rank', 500),
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L47) — const allWrestlers = await base44.entities.Wrestler.list('-created_date', 1000);
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L67) — const allWrestlers = await base44.entities.Wrestler.list('-created_date', 1000);
- [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L27) — const all = await base44.entities.Wrestler.list('-rank', 500);
- [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L33) — queryFn: () => base44.entities.Wrestler.list('-rank', 500),
- [src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L179) — queryFn: () => base44.entities.Wrestler.list('-rank', 500),

### Wrestler.update (2 call-site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L569) — await base44.entities.Wrestler.update(matchingWrestler.id, {
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L716) — await base44.entities.Wrestler.update(existing.id, record);

### WrestlerRating.create (1 call-site(s))
- [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L72) — mutationFn: (data) => base44.entities.WrestlerRating.create(data),

### WrestlerRating.list (2 call-site(s))
- [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L57) — const all = await base44.entities.WrestlerRating.list('-created_date', 500);
- [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L65) — const all = await base44.entities.WrestlerRating.list('-created_date', 500);

### WrestlerRating.update (1 call-site(s))
- [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L84) — mutationFn: ({ id, data }) => base44.entities.WrestlerRating.update(id, data),

## Appendix B — Full list of base44.auth.*() calls
### auth.me (10 call-site(s))
- [src/components/navigation/FloatingNav.jsx](src/components/navigation/FloatingNav.jsx#L29) — queryFn: () => base44.auth.me(),
- [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L51) — queryFn: () => base44.auth.me(),
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L150) — queryFn: () => base44.auth.me(),
- [src/pages/Forum.jsx](src/pages/Forum.jsx#L25) — queryFn: () => base44.auth.me(),
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L63) — queryFn: () => base44.auth.me(),
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L28) — queryFn: () => base44.auth.me(),
- [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L20) — queryFn: () => base44.auth.me(),
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L60) — queryFn: () => base44.auth.me(),
- [src/pages/Profile.jsx](src/pages/Profile.jsx#L24) — queryFn: () => base44.auth.me(),
- [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L35) — queryFn: () => base44.auth.me(),

### auth.updateMe (1 call-site(s))
- [src/pages/Profile.jsx](src/pages/Profile.jsx#L88) — mutationFn: (data) => base44.auth.updateMe(data),

## Appendix C — Full list of base44.integrations.* references
Note: only export-surface references were found (see [src/api/integrations.js](src/api/integrations.js#L1-L21) and [COUPLING_SCAN.md](COUPLING_SCAN.md#L1)).

- [src/api/integrations.js](src/api/integrations.js#L6) — export const Core = base44.integrations.Core;
- [src/api/integrations.js](src/api/integrations.js#L8) — export const InvokeLLM = base44.integrations.Core.InvokeLLM;
- [src/api/integrations.js](src/api/integrations.js#L10) — export const SendEmail = base44.integrations.Core.SendEmail;
- [src/api/integrations.js](src/api/integrations.js#L12) — export const UploadFile = base44.integrations.Core.UploadFile;
- [src/api/integrations.js](src/api/integrations.js#L14) — export const GenerateImage = base44.integrations.Core.GenerateImage;
- [src/api/integrations.js](src/api/integrations.js#L16) — export const ExtractDataFromUploadedFile = base44.integrations.Core.ExtractDataFromUploadedFile;
- [src/api/integrations.js](src/api/integrations.js#L18) — export const CreateFileSignedUrl = base44.integrations.Core.CreateFileSignedUrl;
- [src/api/integrations.js](src/api/integrations.js#L20) — export const UploadPrivateFile = base44.integrations.Core.UploadPrivateFile;

## Appendix D — Missing helper modules under .@/api/functions/* (all import sites)
- Distinct missing helper module paths found by deterministic scan: 11.
- Authoritative module-path list (each entry links to an import-site evidence line):
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

### achievementSystem (1 import site(s))
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L14) — import { updateForumStats } from '.@/api/functions/achievementSystem';

### fetchRealMatchHistory (1 import site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L14) — import fetchRealMatchHistory from '.@/api/functions/fetchRealMatchHistory';

### fetchRealSumoData (1 import site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L13) — import fetchRealSumoData from '.@/api/functions/fetchRealSumoData';

### fetchWrestlerPhotos (1 import site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L15) — import fetchWrestlerPhotos from '.@/api/functions/fetchWrestlerPhotos';

### getUserDisplayName (3 import site(s))
- [src/pages/Forum.jsx](src/pages/Forum.jsx#L12) — import { getUserDisplayName } from '.@/api/functions/getUserDisplayName';
- [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L10) — import { getDisplayNameFromEmail } from '.@/api/functions/getUserDisplayName';
- [src/pages/Profile.jsx](src/pages/Profile.jsx#L13) — import { getUserDisplayName } from '.@/api/functions/getUserDisplayName';

### matchPrediction (1 import site(s))
- [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L13) — import { calculateMatchProbability, fetchMatchOdds } from '.@/api/functions/matchPrediction';

### notificationSystem (4 import site(s))
- [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L11) — import { markNotificationAsRead, markAllAsRead } from '../.@/api/functions/notificationSystem';
- [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L6) — import { notifyMatchResult } from '../.@/api/functions/notificationSystem';
- [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L8) — import { notifyPredictionClosing } from '../.@/api/functions/notificationSystem';
- [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L15) — import { notifyForumReply } from '.@/api/functions/notificationSystem';

### predictionScoring (2 import site(s))
- [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L8) — import { scoreAllPredictionsForTournament } from '../.@/api/functions/predictionScoring';
- [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L9) — import { generateLeagueCode } from '../.@/api/functions/predictionScoring';

### resolveJSAProfiles (1 import site(s))
- [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L16) — import resolveJSAProfiles from '.@/api/functions/resolveJSAProfiles';

### syncLiveData (1 import site(s))
- [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L24) — import syncLiveData from '.@/api/functions/syncLiveData';

### userPreferences (1 import site(s))
- [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L25) — import { getUserPreferences, saveUserPreferences, toggleFollowWrestler, toggleWidget, updateNotificationSettings } from '.@/api/functions/userPreferences';

## Verification Appendix (deterministic scan commands + counts)

The counts and site lists in this document are derived from a deterministic scan of `src/**/*.js|jsx|ts|tsx`.

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

Final counts (from the command above):

- Missing helper module paths: 11 (see Appendix D)
- Missing helper import sites: 17 (see Appendix D)
- `refetchInterval` sites: 1 (see [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L42))
- `setInterval` sites: 3 (see [src/components/sync/SyncStatus.jsx](src/components/sync/SyncStatus.jsx#L30), [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L377), [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L34))
- `setTimeout` sites: 4 (see [src/components/achievements/AchievementNotification.jsx](src/components/achievements/AchievementNotification.jsx#L8), [src/components/ui/use-toast.jsx](src/components/ui/use-toast.jsx#L28), [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L23), [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L38))
- Total timer/polling sites (`refetchInterval + setInterval + setTimeout`): 8
