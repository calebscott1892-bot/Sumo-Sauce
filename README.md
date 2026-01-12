# SumoWatch

SumoWatch is a Vite + React app with an owned backend API.

- Frontend: Vite dev server
- Backend: Express server under `/api/*`
- API contract: `api.entities.*` and `api.auth.*` (see `API_COMPAT_CONTRACT.md`)

## Development

```bash
npm install
npm run bootstrap
npm run server:dev
npm run dev
```

Frontend: `http://localhost:5173` • Backend: `http://127.0.0.1:8787`

## Build

```bash
npm run build
```

## CI / Proof Pack
Runs Proof Pack A–G (no legacy tokens, no fallback data, no direct fetch, build OK, clean tree gate, verifiers before/after bootstrap).

Run locally: `bash scripts/ci-proof-pack-local.sh`