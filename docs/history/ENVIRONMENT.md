# Environment Variables

This document lists environment variables used by the app and what consumes them.

## Current findings (repo-wide scan)

### Environment variables

No environment variables are referenced anywhere in the codebase:

- No `import.meta.env.*` usages found in `src/`, `vite.config.js`, or `index.html`.
- No `process.env.*` usages found in `src/` or `vite.config.js`.

Evidence (line-level scan): [COUPLING_SCAN.md](COUPLING_SCAN.md#env_import_meta_or_process-0) shows 0 matches for `import.meta.env` / `process.env` across code/config files.

Implication: there is currently **no env-driven configuration** for API endpoints, keys, or feature flags.

### Hard-coded Base44 configuration (client bundle)

Base44 client configuration is hard-coded directly in the browser bundle via `export const base44 = createClient({` in [src/api/base44Client.js](src/api/base44Client.js#L5-L8).

- `appId` is embedded as a string literal.
- `requiresAuth: true` is enabled for all Base44 operations.

This is a migration constraint: replacing Base44 will require introducing env-based configuration (or an owned config endpoint) because the current app cannot be re-pointed without editing source.

## Conventions (Vite)

- Vite exposes variables prefixed with `VITE_` to client code via `import.meta.env`.
- Non-`VITE_` variables are not exposed to the browser bundle by default.

## Update process (when adding owned backend config)

When Base44 is replaced, introduce env vars (Vite client + server-only) and keep this doc grounded by:

- Searching for `import.meta.env` and `process.env` usages.
- Enumerating each variable with:
  - Purpose
  - Required vs optional
  - Where it is read (file + lines)
  - What runtime behavior it gates (auth, API base URL, storage, telemetry)

## Template (to be filled)

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `VITE_…` |  |  |  |

## Anticipated variables (for migration off Base44)

These are **not currently used** in the repo. They are anticipated variables needed to operate without Base44 long-term. Names are suggestions; rename as needed to match the owned backend.

Vite/browser-exposed variables (client):

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `VITE_API_BASE_URL` | Yes | Web app | Base URL for owned API (non-Base44). |
| `VITE_SUPABASE_URL` | Yes | Web app | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Web app | Supabase anon key used by the client SDK. |
| `VITE_AUTH_PROVIDER` | No | Web app | Auth mode selector (e.g., `clerk`, `auth0`, `custom`, `none`). |
| `VITE_AUTH_PUBLIC_KEY` | Maybe | Web app | Public key/client ID for the auth provider if required. |
| `VITE_STORAGE_PUBLIC_BASE_URL` | No | Web app | Public base URL for user-uploaded assets (CDN/object storage). |
| `VITE_EXTERNAL_DATA_PROVIDER` | No | Web app | External data source selector (e.g., `sumodb`, `custom`). |
| `VITE_SENTRY_DSN` | No | Web app | Frontend error reporting/telemetry DSN. |

Server-only variables (not exposed to browser; used by owned backend/services):

Supabase

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `SUPABASE_URL` | Maybe | Server/worker | Supabase URL (only needed if not already embedded/configured). |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Server/worker | Supabase service role key for privileged operations (never in client). |
| `SUPABASE_JWT_SECRET` | No | Server/worker | Used only if self-verifying JWTs outside Supabase tooling. |

Admin roles / security

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `ADMIN_EMAIL_ALLOWLIST` | No | Server/worker | Comma-separated emails granted admin role during bootstrap. |
| `ADMIN_USER_ID_ALLOWLIST` | No | Server/worker | Comma-separated user IDs granted admin role during bootstrap. |
| `RLS_BYPASS_ALLOWED` | No | Server/worker | Guardrail toggle: allow service-role operations (should be true only server-side). |
| `SECURITY_AUDIT_LOG_SINK` | No | Server/worker | Target for audit logs (e.g., `stdout`, `datadog`, `s3`). |

Database

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `DATABASE_URL` | Yes | API/server | Primary DB connection string. |
| `DATABASE_READ_URL` | No | API/server | Read-replica connection string (optional). |
| `DB_SSL` | No | API/server | Force SSL mode if not embedded in URL. |
| `DB_POOL_SIZE` | No | API/server | Connection pool sizing. |

Auth

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `AUTH_JWKS_URL` | Maybe | API/server | JWKS endpoint for token verification. |
| `AUTH_ISSUER` | Maybe | API/server | Expected token issuer. |
| `AUTH_AUDIENCE` | Maybe | API/server | Expected token audience. |
| `SESSION_SECRET` | Maybe | API/server | Cookie/session signing secret (if using sessions). |

Storage (uploads/photos)

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `STORAGE_PROVIDER` | No | API/server | Storage backend selector (`s3`, `gcs`, `r2`, `local`). |
| `STORAGE_BUCKET` | Maybe | API/server | Bucket name for photos/assets. |
| `STORAGE_REGION` | No | API/server | Region for bucket/provider. |
| `STORAGE_ACCESS_KEY_ID` | Maybe | API/server | Credentials (if not using workload identity). |
| `STORAGE_SECRET_ACCESS_KEY` | Maybe | API/server | Credentials secret. |
| `STORAGE_ENDPOINT` | No | API/server | Custom endpoint for S3-compatible storage. |

Cron / scheduled jobs

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `CRON_ENABLED` | No | API/server | Enable/disable scheduled jobs. |
| `CRON_TZ` | No | API/server | Timezone for scheduled tasks. |
| `CRON_SIGNING_SECRET` | No | API/server | Optional verification for cron callbacks/webhooks. |
| `INGESTION_SCHEDULE_CRON` | No | Ingest worker | Cron expression for periodic sync (transcript mentions hourly). |
| `INGESTION_ENABLED` | No | Ingest worker | Feature flag to enable periodic ingestion/sync. |

Live polling / live tournament updates

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `LIVE_TOURNAMENT_POLL_INTERVAL_SECONDS` | No | Ingest worker/API | Poll interval for live tournament feed (transcript mentions 2-minute polling). |
| `LIVE_TOURNAMENT_ENABLED` | No | Ingest worker/API | Feature flag to enable live tournament polling. |
| `LIVE_TOURNAMENT_CACHE_TTL_SECONDS` | No | API/server | Cache TTL to reduce load and avoid repeated fetches. |

External data sources (sumo records)

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `EXTERNAL_DATA_BASE_URL` | No | Ingest worker/API | Base URL for external data provider. |
| `EXTERNAL_DATA_API_KEY` | No | Ingest worker/API | API key/token for provider. |
| `EXTERNAL_DATA_RATE_LIMIT_RPS` | No | Ingest worker | Client-side throttling configuration. |
| `EXTERNAL_DATA_USER_AGENT` | No | Ingest worker | User-Agent string for outbound fetches (some sources require one). |
| `SUMODB_BASE_URL` | No | Ingest worker | SumoDB base URL (transcript references `https://sumodb.sumogames.de`). |
| `JSA_BASE_URL` | No | Ingest worker | Japan Sumo Association base URL (transcript references `https://www.sumo.or.jp`). |
| `WIKIPEDIA_API_BASE_URL` | No | Ingest worker | Wikipedia API base URL for lookup/enrichment. |
| `MEDIAWIKI_API_BASE_URL` | No | Ingest worker | MediaWiki API base URL for images (transcript references MediaWiki API). |
| `INGESTION_CACHE_TTL_SECONDS` | No | Ingest worker | Cache TTL for scraped/derived data (supports “intelligent caching”). |

Notifications (email/push/webhooks)

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `NOTIFICATIONS_PROVIDER` | No | API/server | Provider selector (`sendgrid`, `postmark`, `ses`, `none`). |
| `NOTIFICATIONS_API_KEY` | Maybe | API/server | Provider API key/token. |
| `NOTIFICATIONS_FROM_EMAIL` | Maybe | API/server | Default “from” email. |
| `WEBHOOK_SIGNING_SECRET` | No | API/server | Signing secret for inbound/outbound webhooks. |

## Additional implied variables (from transcript)

Optional LLM/scraping (implied by "AI-powered web scraping"):

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `LLM_PROVIDER` | No | Ingest worker | LLM provider selector (if using LLM-assisted parsing). |
| `LLM_API_KEY` | Maybe | Ingest worker | API key for the selected LLM provider. |
| `LLM_MODEL` | No | Ingest worker | Model name for extraction/enrichment. |

Polling/refresh intervals (explicit in transcript):

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `LIVE_MATCH_POLL_INTERVAL_SECONDS` | No | Ingest worker/API | Real-time live bout polling interval (transcript mentions 30s). |
| `NOTIFICATIONS_POLL_INTERVAL_SECONDS` | No | API/client | Notification center refresh interval (transcript mentions 30s). |

Prediction automation (implied by "automatic prediction resolution"):

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `PREDICTION_AUTO_RESOLVE_ENABLED` | No | Worker | Enable automatic prediction resolution from live results. |
| `PREDICTION_AUTO_RESOLVE_INTERVAL_SECONDS` | No | Worker | How often to attempt resolution. |

Query safety (implied by repeated Base44 query failures):

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `DEFAULT_LIST_LIMIT` | No | API/worker | Default limit for list queries to avoid runtime failures. |
