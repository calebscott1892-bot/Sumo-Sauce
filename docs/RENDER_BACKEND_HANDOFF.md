# Render Backend Handoff

Use the checked-in `render.yaml` blueprint or mirror these values in the Render dashboard.

## Service

- Type: `Web Service`
- Name: `sumo-sauce-backend`
- Runtime: `Node`
- Root directory: `server`
- Plan: `Starter` or higher
- Instances: `1`
- Preview environments: `Disabled`
- Persistent disk:
  - Name: `data`
  - Mount path: `/var/data`
  - Size: `1 GB`

## Commands

- Build command: `npm ci && npm run build`
- Start command: `npm run start:hosted`
- Health check path: `/api/health`

## Required env vars

Copy/paste these into Render:

```text
DATABASE_URL=file:/var/data/sumo.db
HOST=0.0.0.0
ADMIN_TOKEN=replace-with-a-long-random-secret
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,https://your-production-frontend-domain
```

Optional backend env vars:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Expected health response

- URL: `https://<your-render-service>.onrender.com/api/health`
- Expected HTTP status: `200`
- Expected JSON shape:

```json
{
  "ok": true,
  "db": "up",
  "adminTokenConfigured": true,
  "supabaseAuthConfigured": false,
  "supabaseAdminConfigured": false
}
```

## Frontend follow-through

Once the backend URL exists, set these on the frontend deploy:

```text
VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api
SITE_URL=https://<your-frontend-domain>
```

Reminders:

- The frontend must point to the hosted backend URL above, not same-origin `/api`.
- `CORS_ALLOWED_ORIGINS` on Render must include every frontend origin allowed to call the API.
- If you later enable preview frontend deploys, add those preview origins to `CORS_ALLOWED_ORIGINS` first.

## Known limitations

- SQLite keeps this backend single-instance. Do not scale horizontally.
- Persistent disk storage is required. Do not use ephemeral root storage for the database file.
- Preview environments are intentionally disabled for this backend shape.
- Admin/import endpoints remain protected by `ADMIN_TOKEN`; do not leave it blank in production.
