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
  - Required when the API is hosted outside the Vercel frontend origin.
  - Example: `https://api.sumosauce.app/api`
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

- If you leave `VITE_API_BASE_URL` unset, the frontend will default to `/api`, which only works if you provide a same-origin reverse proxy outside Vercel.
- The backend should be deployed on a platform that supports a persistent Node process and durable storage, or migrated to a different data/runtime model before attempting a full Vercel-only deployment.
