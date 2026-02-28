# DEV Compare Route

Local compare route references.

## URLs

- Backend API base: http://127.0.0.1:8790/api/v1
- Frontend app: http://127.0.0.1:5173 (or the exact Vite URL printed in terminal if a different port is used)

## Start local services

Backend:

- `npm run api:dev`

Frontend:

- `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`

## Compare API examples

Successful compare:

- `curl -sS http://127.0.0.1:8790/api/v1/compare/rks_0001/rks_0002 | jq`

Unknown rikishi (404):

- `curl -sS -i http://127.0.0.1:8790/api/v1/compare/does_not_exist/rks_0002`

Invalid parameter (400, empty id):

- `curl -sS -i http://127.0.0.1:8790/api/v1/compare/%20/rks_0002`

## Frontend compare URL example

- http://127.0.0.1:5173/compare/rks_0001/rks_0002

## Deterministic smoke checks

- API smoke:
  - `npm run api:smoke > /tmp/api1.json && npm run api:smoke > /tmp/api2.json && shasum -a 256 /tmp/api1.json /tmp/api2.json && diff -u /tmp/api1.json /tmp/api2.json`
- E2E smoke:
  - `npm run e2e:smoke > /tmp/e2e1.json && npm run e2e:smoke > /tmp/e2e2.json && shasum -a 256 /tmp/e2e1.json /tmp/e2e2.json && diff -u /tmp/e2e1.json /tmp/e2e2.json`
