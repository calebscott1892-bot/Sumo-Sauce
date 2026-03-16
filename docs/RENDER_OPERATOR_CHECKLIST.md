# Render Operator Checklist

Use this to deploy the backend for the already-live frontend at `https://sumo-sauce.vercel.app/`.

## 1. Create the service

Recommended path:

1. In Render, click `New +`
2. Click `Blueprint`
3. Connect/select repo: `calebscott1892-bot/Sumo-Sauce`
4. Branch: `main`
5. Render should detect `render.yaml`
6. Confirm the service below and continue

Manual fallback if you do not use the Blueprint:

- Service type: `Web Service`
- Runtime: `Node`
- Service name: `sumo-sauce-backend`
- Root directory: `server`
- Plan: `Starter` or higher
- Instances: `1`
- Preview environments: `Disabled`

## 2. Exact settings

- Build command: `npm ci && npm run build`
- Start command: `npm run start:hosted`
- Health check path: `/api/health`
- Persistent disk name: `data`
- Persistent disk mount path: `/var/data`
- Recommended disk size: `1 GB`

SQLite means this backend must stay single-instance.

## 3. Environment variables

Paste these into Render.

Required:

```text
DATABASE_URL=file:/var/data/sumo.db
HOST=0.0.0.0
CORS_ALLOWED_ORIGINS=https://sumo-sauce.vercel.app
ADMIN_TOKEN=<generate-a-long-random-secret>
```

Secret values:

- `ADMIN_TOKEN` is a secret

Not secrets:

- `DATABASE_URL`
- `HOST`
- `CORS_ALLOWED_ORIGINS`

If you later add a custom frontend domain, append it to `CORS_ALLOWED_ORIGINS`:

```text
CORS_ALLOWED_ORIGINS=https://sumo-sauce.vercel.app,https://your-custom-frontend-domain
```

Optional only if you actually use Supabase:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 4. What to click in Render

If using the Blueprint:

1. Import the Blueprint
2. Open the created service `sumo-sauce-backend`
3. Add the persistent disk at `/var/data` with size `1 GB`
4. Open `Environment`
5. Set `ADMIN_TOKEN`
6. Set `CORS_ALLOWED_ORIGINS=https://sumo-sauce.vercel.app`
7. Confirm `DATABASE_URL=file:/var/data/sumo.db`
8. Confirm `HOST=0.0.0.0`
9. Deploy

If creating manually:

1. Create a `Web Service`
2. Set root directory to `server`
3. Set build command to `npm ci && npm run build`
4. Set start command to `npm run start:hosted`
5. Add persistent disk `data` mounted at `/var/data` with `1 GB`
6. Add the required env vars above
7. Set health check path to `/api/health`
8. Deploy

## 5. What success looks like

- Render deploy finishes green
- Service stays `Live`
- Health URL returns HTTP `200`

Health URL:

```text
https://<your-render-service>.onrender.com/api/health
```

Expected response:

```json
{
  "ok": true,
  "db": "up",
  "adminTokenConfigured": true,
  "supabaseAuthConfigured": false,
  "supabaseAdminConfigured": false
}
```

## 6. URL to bring back after deploy

Copy the Render service URL shown in the service header, for example:

```text
https://<your-render-service>.onrender.com
```

That exact URL is what must come back after backend deploy.

Frontend follow-through after backend deploy succeeds:

```text
VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api
```

Do not do the Vercel env repair step until the Render backend is live and `/api/health` is returning `200`.
