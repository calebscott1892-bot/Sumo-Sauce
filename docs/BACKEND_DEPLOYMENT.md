# Backend Deployment

This backend is a long-running Node + Express + Prisma service using SQLite.

For the exact Render handoff, use `docs/RENDER_BACKEND_HANDOFF.md` plus the root `render.yaml`.

## Best fit

Use a single-instance web service with persistent disk storage.

Render is the best fit for the current backend shape because it has a straightforward Node web service model, built-in health checks, and first-class persistent disks for SQLite. Railway can also work, but the current single-writer SQLite setup is a cleaner match for one Render web service with one mounted disk.

## Service root

Deploy the `server/` directory as the backend service root.

## Commands

- Build command: `npm ci && npm run build`
- Start command: `npm run start:hosted`

`start:hosted` runs `prisma migrate deploy` before starting the server so the checked-in migrations are applied on first boot.

## Required env vars

- `DATABASE_URL`
  - Required
  - Local relative example: `file:./sumo.db`
  - Render example: `file:/var/data/sumo.db`
  - Railway example: `file:/data/sumo.db`
- `PORT`
  - Optional on most hosts; the platform usually injects it
- `HOST`
  - Optional
  - Default is `0.0.0.0`
- `CORS_ALLOWED_ORIGINS`
  - Required if the frontend is on another origin
  - Comma-separated list
- `ADMIN_TOKEN`
  - Recommended
  - Required for admin/import endpoints
- `SUPABASE_URL`
  - Optional
- `SUPABASE_ANON_KEY`
  - Optional
- `SUPABASE_SERVICE_ROLE_KEY`
  - Optional

## Health check

- Path: `/api/health`

The health endpoint now checks database connectivity and returns HTTP 500 if the database is unavailable.

## Important constraints

- Keep this as a single instance while it uses SQLite.
- Put the SQLite file on a persistent disk/volume, not ephemeral root storage.
- Do not rely on `bootstrap` for production data; it seeds local/demo fallback records.
- Some domain routes require imported build data and may still return empty/503 until that data is loaded.
