# Data Model

This document describes the app’s data model (entities/tables/relationships) under full ownership.

Status: migration-planning draft. The section **“Observed entities & fields (current code)”** is grounded in the repo’s current `src/` usage; the rest of the document remains a target-state proposal and should be validated during backend design.

## Scope

- What data the product stores and why
- Entity definitions (fields + constraints)
- Relationships (cardinality, foreign keys)
- Indexing/uniqueness rules
- Ownership boundaries (client vs server)

## Observed entities & fields (current code)

Entity surface area is defined centrally via Base44 exports in [src/api/entities.js](src/api/entities.js#L1-L22) — `export const Wrestler = base44.entities.Wrestler;`.

### Auth / User

- Current user lookup: `base44.auth.me()` is called in multiple pages/components (example: [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L24-L31)).
- Profile update: `base44.auth.updateMe(data)` is called in [src/pages/Profile.jsx](src/pages/Profile.jsx#L88).
- User directory queries: `base44.entities.User.list('-created_date', 500)` is used to resolve display names (examples: [src/pages/Forum.jsx](src/pages/Forum.jsx#L32), [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L70)).
- Observed user fields consumed by UI: `email`, `role`, `username`, `full_name` (example display name logic: [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L17-L21)).

### ForumTopic

- Create payload fields: `title`, `content`, `category`, `view_count`, `reply_count` ([src/components/forum/CreateTopicDialog.jsx](src/components/forum/CreateTopicDialog.jsx#L24)).
- Update payload fields: `view_count`, `reply_count`, `is_pinned`, `is_locked` ([src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L80-L90), [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L146-L158)).
- Observed foreign/user linkage: the UI reads `topic.created_by` to notify the topic creator ([src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L112-L114)).

### ForumReply

- Create payload fields: `topic_id`, `content` ([src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L173-L176)).
- Update payload fields: `likes`, `liked_by` ([src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L111-L123)).

### Report

- Create payload fields: `content_type`, `content_id`, `reason`, `details`, `status` ([src/components/forum/ReportDialog.jsx](src/components/forum/ReportDialog.jsx#L23)).

### BannedUser

- Create payload fields: `user_email`, `banned_by`, `reason`, `is_permanent`, `ban_until` ([src/components/forum/BanUserDialog.jsx](src/components/forum/BanUserDialog.jsx#L31)).

### WrestlerRating

- Create/update payload fields: `wrestler_id`, `rating`, `comment`, `categories` (JSON-ish object) ([src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L110-L113)).
- Observed filtering fields: `created_by` is used to find the current user’s rating ([src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L77-L80)).

### ComparisonReport

- Create payload fields: `title`, `wrestler_ids` (array), `notes`, `is_public`, `views`, `likes` ([src/components/comparison/SaveComparisonDialog.jsx](src/components/comparison/SaveComparisonDialog.jsx#L36-L40)).
- Update payload fields: `views`, `likes`, `liked_by` ([src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L41-L58)).

### PredictionLeague

- Create payload fields: `name`, `description`, `join_code`, `is_public`, `admin_email`, `member_count` ([src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L27-L34)).
- Update payload fields: `member_count` ([src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L47-L49)).

### LeagueMembership

- Create payload fields: `league_id`, `user_email` ([src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L36-L39), [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L42-L45)).
- Observed scoring fields: `total_points`, `correct_predictions` are rendered in league views ([src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L141-L175)).

### TournamentPrediction

- Create payload fields: `tournament_id`, `league_id`, `user_email`, `predicted_winner`, `predicted_runner_up`, `predicted_outstanding_performance` ([src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L56-L63)).
- Observed scoring fields: `is_scored` is checked before notifying users ([src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L35)).

### MatchPrediction

- Create payload fields: `wrestler1_id`, `wrestler1_name`, `wrestler2_id`, `wrestler2_name`, `user_prediction`, `ai_prediction`, `ai_probability`, `match_date`, `is_resolved` ([src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L280-L288)).
- Observed resolution fields: `is_resolved`, `is_correct` are used to compute stats ([src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L83-L92)).

### Notification

- List/filter fields: `recipient_email` ([src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L38-L40)).
- Read-state fields: `is_read` ([src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L59-L63)).
- Display fields: `type`, `title`, `message`, `link`, `created_date` ([src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L106-L140)).

### DataCorrectionRequest

- Create payload fields: `issue_description`, `suggested_correction` ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L832-L833)).

### Wrestler / BashoRecord / Match / Tournament (import/ingestion shapes)

The app constructs/imports these entities in the admin import page; observed fields include:

- `BashoRecord` stub shape: `record_id`, `rid`, `shikona`, `basho`, `wins`, `losses`, `absences`, `win_pct`, `is_stub` ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L221-L230)).
- `Wrestler` stub shape: `rid`, `shikona`, `current_rank`, `status_is_active`, `status_is_retired` ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L314-L324)).
- `Match` import mapping adds: `tournament_id`, `wrestler1_id`, `wrestler2_id`, `winner_id` (note: values are derived from wrestler names in this mapping) ([src/pages/DataImport.jsx](src/pages/DataImport.jsx#L503-L506)).
- `Tournament` fields consumed broadly: `name`, `status`, `basho`, `location`, `start_date`, `end_date`, `winner`, `winner_record`, `runner_up`, `special_prizes` ([src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L19-L140)).

## Entities (initial)

> Add entities as they are discovered. Keep names stable and map to Supabase tables later.

Conventions (recommended for Supabase/Postgres):

- Primary keys: `uuid` (default `gen_random_uuid()`)
- Timestamps: `created_at`, `updated_at` (`timestamptz`)
- Soft delete where needed: `deleted_at` (`timestamptz`, nullable)

## Models

### Wrestler

- Primary key: `id` (uuid)
- Foreign keys: none
- Required fields:
	- `shikona` (text) — ring name
	- `rank` (text) — e.g., Yokozuna/Ozeki/Maegashira/Juryo
	- `rank_number` (int) — numeric position within rank
	- `side` (text) — East/West
	- `stable` (text) — heya
	- `is_active` (bool)
- Optional fields:
	- `real_name` (text)
	- `birthplace` (text)
	- `birth_date` (date)
	- `height_cm` (int)
	- `weight_kg` (int)
	- `nationality` (text)
	- `debut_year` (int)
	- `tournament_titles` (int)
	- `special_prizes` (int)
	- `image_url` (text) — stable URL for profile image
	- `current_division` (text) — optional denormalization
- Derived fields (materialized or view):
	- `career_wins`, `career_losses`, `career_absences` (int)
	- `win_rate` (numeric)
	- `current_streak` (int)
	- `basho_wins`, `basho_losses` (int) — current/most recent basho record (if tracked)
- Indexing needs:
	- Unique (or at least indexed): `shikona` (case-insensitive search via `citext` or trigram)
	- Index: (`rank`, `rank_number`, `side`)
	- Index: (`current_division`)

### Basho

- Primary key: `id` (uuid)
- Foreign keys: none
- Required fields:
	- `name` (text) — e.g., “Hatsu 2026”
	- `year` (int)
	- `month` (int)
	- `start_date` (date)
	- `end_date` (date)
	- `location` (text)
- Derived fields:
	- `is_active` (bool) — based on date range
	- `current_day` (int) — based on today
- Indexing needs:
	- Unique: (`year`, `month`)
	- Index: `start_date`, `end_date`

### BashoRecord

- Primary key: `id` (uuid)
- Foreign keys:
	- `basho_id` → Basho
	- `wrestler_id` → Wrestler
- Required fields:
	- `division` (text)
	- `rank` (text)
	- `wins` (int)
	- `losses` (int)
	- `absences` (int)
- Optional fields:
	- `shikona_display` (text) — if snapshotting name/rank at time
- Derived fields:
	- `win_rate` (numeric)
	- `kachi_koshi` (bool)
- Indexing needs:
	- Unique: (`basho_id`, `wrestler_id`)
	- Index: (`basho_id`, `division`), (`wrestler_id`, `basho_id`)

### Match

- Primary key: `id` (uuid)
- Foreign keys:
	- `basho_id` → Basho
	- `east_wrestler_id` → Wrestler
	- `west_wrestler_id` → Wrestler
	- `winner_wrestler_id` → Wrestler (nullable until complete)
- Required fields:
	- `day` (int)
	- `division` (text)
	- `scheduled_at` (timestamptz, nullable)
- Optional fields:
	- `kimarite` (text)
	- `is_fusen` (bool)
	- `notes` (text)
- Derived fields:
	- `is_complete` (bool)
- Indexing needs:
	- Unique (optional): (`basho_id`, `day`, `east_wrestler_id`, `west_wrestler_id`)
	- Index: (`basho_id`, `day`), (`east_wrestler_id`), (`west_wrestler_id`), (`winner_wrestler_id`)

### User

- Primary key: `id` (uuid)
- Foreign keys:
	- For Supabase Auth: `id` aligns with `auth.users.id`
- Required fields:
	- `username` (text) — public handle (privacy via usernames)
- Optional fields:
	- `avatar_url` (text)
	- `display_name` (text)
	- `role` (text) — e.g., `user`, `moderator`, `admin`
- Derived fields:
	- `is_moderator`/`is_admin` (bool)
- Indexing needs:
	- Unique: `username` (case-insensitive)
	- Index: `role`

### UserPreferences

- Primary key: `id` (uuid)
- Foreign keys:
	- `user_id` → User
- Required fields:
	- `user_id` (uuid)
- Optional fields:
	- `theme` (text)
	- `dashboard_layout` (jsonb)
	- `notification_settings` (jsonb)
- Derived fields:
	- none
- Indexing needs:
	- Unique: `user_id`

### Favorite

- Primary key: `id` (uuid)
- Foreign keys:
	- `user_id` → User
	- `wrestler_id` → Wrestler
- Required fields:
	- `user_id`, `wrestler_id`
- Derived fields:
	- none
- Indexing needs:
	- Unique: (`user_id`, `wrestler_id`)
	- Index: (`wrestler_id`)

### ForumTopic

- Primary key: `id` (uuid)
- Foreign keys:
	- `author_user_id` → User
- Required fields:
	- `title` (text)
	- `body` (text)
	- `author_user_id` (uuid)
- Optional fields:
	- `locked` (bool)
	- `pinned` (bool)
	- `deleted_at` (timestamptz)
- Derived fields:
	- `reply_count` (int)
	- `last_reply_at` (timestamptz)
- Indexing needs:
	- Index: (`pinned`, `last_reply_at`)
	- Full-text search index on (`title`, `body`)

### ForumReply

- Primary key: `id` (uuid)
- Foreign keys:
	- `topic_id` → ForumTopic
	- `author_user_id` → User
- Required fields:
	- `topic_id`, `author_user_id`
	- `body` (text)
- Optional fields:
	- `deleted_at` (timestamptz)
- Derived fields:
	- none
- Indexing needs:
	- Index: (`topic_id`, `created_at`)

### Rating

- Primary key: `id` (uuid)
- Foreign keys:
	- `user_id` → User
	- `wrestler_id` → Wrestler
- Required fields:
	- `score` (int) — define range (e.g., 1–5 or 0–100)
	- `user_id`, `wrestler_id`
- Optional fields:
	- `comment` (text)
- Derived fields:
	- none
- Indexing needs:
	- Unique: (`user_id`, `wrestler_id`)
	- Index: (`wrestler_id`)

### Report

- Primary key: `id` (uuid)
- Foreign keys:
	- `reporter_user_id` → User
	- `topic_id` → ForumTopic (nullable)
	- `reply_id` → ForumReply (nullable)
- Required fields:
	- `reason` (text)
	- `status` (text) — e.g., `open`, `resolved`, `dismissed`
	- `reporter_user_id` (uuid)
- Optional fields:
	- `details` (text)
	- `resolved_by_user_id` (uuid)
	- `resolved_at` (timestamptz)
- Derived fields:
	- none
- Indexing needs:
	- Index: (`status`, `created_at`)

### Ban

- Primary key: `id` (uuid)
- Foreign keys:
	- `user_id` → User
	- `banned_by_user_id` → User
- Required fields:
	- `user_id`, `banned_by_user_id`
	- `reason` (text)
	- `starts_at` (timestamptz)
- Optional fields:
	- `ends_at` (timestamptz)
- Derived fields:
	- `is_active` (bool)
- Indexing needs:
	- Index: (`user_id`, `starts_at`)

### Achievement

- Primary key: `id` (uuid)
- Foreign keys: none
- Required fields:
	- `key` (text) — stable identifier
	- `name` (text)
	- `description` (text)
- Optional fields:
	- `icon` (text)
	- `criteria` (jsonb)
- Derived fields:
	- none
- Indexing needs:
	- Unique: `key`

### PredictionLeague

- Primary key: `id` (uuid)
- Foreign keys:
	- `owner_user_id` → User
- Required fields:
	- `name` (text)
	- `owner_user_id` (uuid)
- Optional fields:
	- `join_code` (text)
	- `is_public` (bool)
	- `rules` (jsonb)
- Derived fields:
	- `member_count` (int)
- Indexing needs:
	- Unique: `join_code` (if used)

### LeagueMembership

- Primary key: `id` (uuid)
- Foreign keys:
	- `league_id` → PredictionLeague
	- `user_id` → User
- Required fields:
	- `league_id`, `user_id`
	- `role` (text) — e.g., `member`, `admin`
- Derived fields:
	- none
- Indexing needs:
	- Unique: (`league_id`, `user_id`)

### TournamentPrediction

- Primary key: `id` (uuid)
- Foreign keys:
	- `league_id` → PredictionLeague
	- `user_id` → User
	- `basho_id` → Basho
- Required fields:
	- `league_id`, `user_id`, `basho_id`
	- `prediction` (jsonb) — structure TBD (e.g., winner + placements)
- Optional fields:
	- `submitted_at` (timestamptz)
- Derived fields:
	- `score` (int)
- Indexing needs:
	- Unique: (`league_id`, `user_id`, `basho_id`)

### MatchPrediction

- Primary key: `id` (uuid)
- Foreign keys:
	- `league_id` → PredictionLeague
	- `user_id` → User
	- `match_id` → Match
	- `predicted_winner_wrestler_id` → Wrestler
- Required fields:
	- `league_id`, `user_id`, `match_id`, `predicted_winner_wrestler_id`
- Optional fields:
	- `confidence` (int)
	- `submitted_at` (timestamptz)
- Derived fields:
	- `is_correct` (bool)
	- `score` (int)
- Indexing needs:
	- Unique: (`league_id`, `user_id`, `match_id`)

### ComparisonReport

- Primary key: `id` (uuid)
- Foreign keys:
	- `created_by_user_id` → User (nullable for anonymous share)
	- `left_wrestler_id` → Wrestler
	- `right_wrestler_id` → Wrestler
- Required fields:
	- `left_wrestler_id`, `right_wrestler_id`
	- `report_data` (jsonb) — snapshot of computed comparison
- Optional fields:
	- `share_slug` (text)
	- `visibility` (text) — `private`, `unlisted`, `public`
- Derived fields:
	- none
- Indexing needs:
	- Unique: `share_slug` (if used)
	- Index: (`left_wrestler_id`), (`right_wrestler_id`)

### Notification

- Primary key: `id` (uuid)
- Foreign keys:
	- `user_id` → User
- Required fields:
	- `user_id` (uuid)
	- `type` (text) — e.g., `basho_update`, `favorite_match`, `achievement`
	- `title` (text)
	- `body` (text)
- Optional fields:
	- `data` (jsonb)
	- `read_at` (timestamptz)
- Derived fields:
	- `is_read` (bool)
- Indexing needs:
	- Index: (`user_id`, `read_at`)

### DataSource (implied by transcript: SumoDB/JSA/Wikipedia)

- Primary key: `id` (uuid)
- Foreign keys: none
- Required fields:
	- `key` (text) — e.g., `sumodb`, `jsa`, `wikipedia`
	- `base_url` (text)
- Optional fields:
	- `enabled` (bool)
	- `rate_limit_rps` (numeric)
	- `notes` (text)
- Derived fields:
	- none
- Indexing needs:
	- Unique: `key`

### DataSyncRun (implied by transcript: hourly sync, diffing, status tracking)

- Primary key: `id` (uuid)
- Foreign keys:
	- `source_id` → DataSource (nullable if multi-source run)
- Required fields:
	- `run_type` (text) — e.g., `wrestlers_full_refresh`, `wrestlers_diff`, `live_tournament_poll`
	- `status` (text) — `running`, `succeeded`, `failed`
	- `started_at` (timestamptz)
- Optional fields:
	- `finished_at` (timestamptz)
	- `stats` (jsonb) — counts, diff summary
	- `error_message` (text)
- Derived fields:
	- `duration_ms` (int)
- Indexing needs:
	- Index: (`run_type`, `started_at`)
	- Index: (`status`, `started_at`)

### DataSyncSetting (implied by transcript: auto-sync toggle, interval)

- Primary key: `id` (uuid)
- Foreign keys:
	- `updated_by_user_id` → User (nullable)
- Required fields:
	- `key` (text) — e.g., `auto_sync_enabled`, `sync_interval_minutes`
	- `value` (jsonb)
- Optional fields:
	- `scope` (text) — `global` (default), `user`
	- `user_id` (uuid, nullable)
- Derived fields:
	- none
- Indexing needs:
	- Unique: (`scope`, `key`, `user_id`)

## Relationships

> Diagram or bullet list (e.g., `User 1—N Topic`).

- (TBD)

Suggested relationship sketch:

- User 1—1 UserPreferences
- User 1—N Favorite; Favorite N—1 Wrestler
- Basho 1—N Match; Match N—1 Wrestler (east/west/winner)
- Basho 1—N BashoRecord; BashoRecord N—1 Wrestler
- User 1—N ForumTopic; ForumTopic 1—N ForumReply
- User 1—N Rating; Rating N—1 Wrestler
- User 1—N Report; Report N—1 (ForumTopic or ForumReply)
- User 1—N Ban (as banned user) and User 1—N Ban (as moderator)
- PredictionLeague 1—N LeagueMembership; LeagueMembership N—1 User
- PredictionLeague 1—N TournamentPrediction; TournamentPrediction N—1 User; TournamentPrediction N—1 Basho
- PredictionLeague 1—N MatchPrediction; MatchPrediction N—1 User; MatchPrediction N—1 Match
- User 1—N Notification

- DataSource 1—N DataSyncRun
- User 1—N DataSyncSetting (if scoped per-user); global settings have no user

## Notes / Open Questions

- (TBD)

## Transcript Additions (Prompt Set A)

- User profile fields implied by transcript: `bio` (text), `email_visibility` (text or bool), and display-name handling for public surfaces (forum/leaderboards).
- Achievement awarding is implied beyond the `Achievement` catalog: add a `UserAchievement` join table with `user_id`, `achievement_id`, `earned_at`, and optional `rarity_tier_at_award`.
- Notification system implies richer fields: `link_path`/`action_url`, `source_type`/`source_id`, and consistent unread state (`read_at` already exists).
- Wrestler rating system mentions category ratings: add `category_scores` (jsonb) or a normalized `RatingCategory` child table.
- Live bout tracking implies a `LiveBout`/`LiveMatchEvent` model (or additional fields on `Match`) to represent in-progress state, polling snapshots, and resolution timestamps.

- Forum implies `ForumTopic` (title, body, author `user_id`, timestamps, and moderation fields like `pinned`/`locked`) and `ForumReply` (topic `topic_id`, author `user_id`, body, timestamps).
- Moderation implies `Report` (reporter `user_id`, target type/id, reason, status) and `BannedUser` (target `user_id`, banned_at, banned_by, reason).
- Shareable comparison reports imply `ComparisonReport` with an owner `user_id`, selected `wrestler_ids`, a visibility flag (`public`/`private`), and a stable share identifier for link routing.
- Import discussion implies a per-tournament record model (e.g., `BashoRecord`) linked to `Wrestler`, with a stable record identifier (`record_id`/`rid`) and fields like basho, division/rank, and win/loss record.
