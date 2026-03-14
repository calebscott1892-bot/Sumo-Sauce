# Local API development (/api/v1)

Use port `8790` for local backend API testing.

> Do not use literal `PORT` — replace with `8790`.

## Start API server

npm run api:dev

(Equivalent backend-only command)

npm run server:dev

## Health check

curl -i http://127.0.0.1:8790/api/health

## Valid /api/v1 examples

curl -i http://127.0.0.1:8790/api/v1/rikishi/rks_0001
curl -i http://127.0.0.1:8790/api/v1/basho/202401
curl -i http://127.0.0.1:8790/api/v1/basho/202401/makuuchi
curl -i http://127.0.0.1:8790/api/v1/head-to-head/rks_0001/rks_0002

## Error-case examples

Invalid division (400):

curl -i http://127.0.0.1:8790/api/v1/basho/202401/invaliddivision

Unknown rikishi (404):

curl -i http://127.0.0.1:8790/api/v1/rikishi/does_not_exist

## Smoke test

npm run api:smoke

## Determinism check

npm run api:smoke > /tmp/api1.json
npm run api:smoke > /tmp/api2.json
shasum -a 256 /tmp/api1.json /tmp/api2.json
diff -u /tmp/api1.json /tmp/api2.json

## E2E smoke (deterministic)

npm run e2e:smoke
npm run e2e:smoke > /tmp/e2e1.json
npm run e2e:smoke > /tmp/e2e2.json
shasum -a 256 /tmp/e2e1.json /tmp/e2e2.json
diff -u /tmp/e2e1.json /tmp/e2e2.json
