# Vercel Deployment

## Real deployment model

Vercel is suitable for the frontend only.

This repo's current API server is a separate Node + Express + Prisma service backed by SQLite and admin/import endpoints. It expects a long-running process and a writable database, so it should not be treated as a drop-in Vercel serverless deployment.

## Vercel project settings

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Install command: default `npm install`
- Node version: `20.x`

`vercel.json` already handles SPA deep-link fallback to `index.html` and keeps same-origin `/api` paths from being silently rewritten to HTML.

## Required frontend env vars on Vercel

- `VITE_API_BASE_URL`
  - Required for production.
  - Example: `https://sumo-sauce.onrender.com/api`
- `SITE_URL`
  - Strongly recommended for production sitemap generation.
  - Example: `https://sumosauce.app`

## Required backend env vars outside Vercel

- `DATABASE_URL`
- `ADMIN_TOKEN`
- `CORS_ALLOWED_ORIGINS`
  - Include the production Vercel domain and any preview domains that should be allowed to call the API.
- `SUPABASE_URL` optional
- `SUPABASE_ANON_KEY` optional
- `SUPABASE_SERVICE_ROLE_KEY` optional

## Notes

- Local localhost development can still rely on the Vite `/api` proxy when `VITE_API_BASE_URL` is unset.
- Production should not rely on same-origin `/api` unless you have intentionally added a real reverse proxy in front of Vercel.
- The backend should be deployed on a platform that supports a persistent Node process and durable storage, or migrated to a different data/runtime model before attempting a full Vercel-only deployment.

## Post-hookup checklist

- Backend root URL (hosted): `https://sumo-sauce.onrender.com`
- On Vercel, set `VITE_API_BASE_URL` to `https://sumo-sauce.onrender.com/api` in the Production environment, then trigger a production redeploy so the frontend is rebuilt with the correct API base.

If you cannot use the Vercel CLI from this environment, use the Vercel Dashboard: Project → Settings → Environment Variables → add/update `VITE_API_BASE_URL` (Production) and click "Redeploy" or trigger a new deployment from the GitHub repo.
