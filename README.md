# SumoWatch

SumoWatch is a Vite + React app with an owned backend API.

- Frontend: Vite dev server
- Backend: Express server under `/api/*`
- API contract: `api.entities.*` and `api.auth.*` (see `API_COMPAT_CONTRACT.md`)

## Development

```bash
npm install
```

In one terminal:

```bash
npm run server:dev
```

In another terminal:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173` and talks to the backend at `http://127.0.0.1:8787` by default.

## Build

```bash
npm run build
```