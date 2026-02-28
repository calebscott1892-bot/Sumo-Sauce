# SumoWatch

SumoWatch is a Vite + React app with an owned backend API.

- Frontend: Vite dev server
- Backend: Express server under `/api/*`
- API contract: `api.entities.*` and `api.auth.*` (see `API_COMPAT_CONTRACT.md`)

## Architecture Today

- As-is architecture map: [docs/ARCHITECTURE_AS_IS.md](docs/ARCHITECTURE_AS_IS.md)
- Risk register (determinism, schema drift, scale): [docs/RISKS.md](docs/RISKS.md)
- Base44/Wix remnant inventory: [docs/BASE44_REMNANTS.md](docs/BASE44_REMNANTS.md)
- Quick repository audit script: [scripts/audit.mjs](scripts/audit.mjs)

Run the audit script:

```bash
node scripts/audit.mjs
```

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