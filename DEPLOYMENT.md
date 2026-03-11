# SumoWatch — Deployment Guide

## Prerequisites

- **Node.js** ≥ 18 (LTS recommended)
- **npm** ≥ 9
- SQLite database (auto-provisioned by Prisma)

---

## Quick Start (Development)

```bash
# 1. Install dependencies
npm install
cd server && npm install && cd ..

# 2. Copy environment file
cp .env.example .env

# 3. Set up database
npm run bootstrap

# 4. Start dev servers (frontend + backend)
npm run dev:all
```

Frontend: `http://localhost:5173`  
API: `http://localhost:8790`

---

## Production Build

### 1. Environment Variables

Copy `.env.example` to `.env` and configure production values:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | `/api` | API base URL. Set if API is on a different origin. |
| `SITE_URL` | No | `https://sumowatch.app` | Public URL for sitemap & canonical links. |
| `PORT` | No | `8790` | Express server port. |
| `ADMIN_TOKEN` | Yes | — | Token for admin/ingestion endpoints. **Must change in prod.** |
| `DATABASE_URL` | No | `file:./prisma/sumo.db` | Prisma database connection string. |

### 2. Build Frontend

```bash
npm run build
```

This runs `vite build` followed by sitemap generation. Output goes to `dist/`.

Build produces:
- `dist/index.html` — SPA entry point
- `dist/assets/` — hashed JS/CSS chunks
- `dist/sitemap.xml` — auto-generated sitemap
- `dist/robots.txt` — search engine directives (copied from `public/`)
- `dist/favicon.svg` — site icon

### 3. Start Production Server

```bash
cd server
PORT=8790 ADMIN_TOKEN=your-secret-token node index.mjs
```

Or use a process manager:

```bash
# PM2
pm2 start server/index.mjs --name sumowatch-api -- 

# Systemd (create service file)
```

---

## Deployment Architecture

```
┌─────────────────┐      ┌──────────────────┐
│  Static Host     │      │  API Server      │
│  (Nginx/Vercel)  │      │  (Node.js)       │
│                  │      │                  │
│  dist/           │ ───→ │  :8790/api/v1/*  │
│  - index.html    │      │  - SQLite DB     │
│  - assets/*      │      │  - Prisma ORM    │
│  - sitemap.xml   │      └──────────────────┘
│  - robots.txt    │
└─────────────────┘
```

### Option A: Single Server (Nginx Reverse Proxy)

```nginx
server {
    listen 80;
    server_name sumowatch.app;

    root /var/www/sumowatch/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8790;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static asset caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # favicon caching
    location /favicon.svg {
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

### Option B: Separate Static Host + API

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, S3+CloudFront).  
Set `VITE_API_BASE_URL` to the API server's public URL before building.

---

## Caching Strategy

| Resource | Cache Policy | Rationale |
|----------|-------------|-----------|
| `dist/assets/*` | `max-age=31536000, immutable` | Content-hashed filenames |
| `dist/index.html` | `no-cache` or `max-age=300` | Must always serve latest |
| `dist/sitemap.xml` | `max-age=86400` | Regenerated on each build |
| `dist/robots.txt` | `max-age=86400` | Rarely changes |
| `/api/*` | `no-cache` | Dynamic data |

---

## Database Management

The SQLite database lives at `server/prisma/sumo.db`.

```bash
# Push schema changes
npm run server:db:push

# Bootstrap with seed data
npm run bootstrap

# Full data import
ADMIN_TOKEN=your-token npm run import:all
```

**Backups**: The SQLite file can be copied directly:
```bash
cp server/prisma/sumo.db server/prisma/sumo.db.backup-$(date +%Y%m%d)
```

---

## Health Checks

The API server responds to all `/api/v1/*` routes. A simple health check:

```bash
curl -s http://localhost:8790/api/v1/rikishi?limit=1 | head -c 100
```

---

## Bundle Analysis

After building, inspect the output:

```bash
npx vite-bundle-visualizer
```

Expected chunk structure:
- `vendor-react` — React + ReactDOM + React Router (~180 KB gzip)
- `vendor-recharts` — Charts library (~120 KB gzip)
- `vendor-motion` — Framer Motion (~45 KB gzip)
- `vendor-query` — TanStack Query (~15 KB gzip)
- Per-page lazy chunks — loaded on navigation

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank page after deploy | Ensure SPA fallback (`try_files $uri /index.html`) is configured |
| API 404s in production | Check `VITE_API_BASE_URL` or Nginx proxy config |
| Database locked errors | Ensure only one server process writes to SQLite |
| Build fails with OOM | Increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run build` |
| Sitemap not generated | Run `npm run sitemap` manually or check `scripts/generate-sitemap.mjs` |
