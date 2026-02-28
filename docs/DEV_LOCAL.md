# Local development (frontend + API)

## Install dependencies

npm install

## Start backend API (port 8790)

npm run server:dev

Expected API health endpoint:

curl -i http://127.0.0.1:8790/api/health

## Start frontend (Vite)

npm run dev

Or force host/port:

npm run dev -- --host 127.0.0.1 --port 5173

If 5173 is occupied, Vite will pick the next available port.

## Verify API route used by frontend

The frontend calls relative `/api/v1/*` URLs.
In dev, Vite proxies `/api` to `http://127.0.0.1:8790`.

## Curl examples (backend directly)

curl -i http://127.0.0.1:8790/api/v1/rikishi/rks_0001
curl -i http://127.0.0.1:8790/api/v1/basho
curl -i http://127.0.0.1:8790/api/v1/basho/202401/makuuchi

## One-command local run (optional)

npm run dev:all
