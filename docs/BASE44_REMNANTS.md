# Base44 / Wix remnants (As-Is)

Last audited: 2026-02-27.

Scope: repository text scan excluding `node_modules`, `.git`, build outputs, and binary assets.

## Summary

- `base44` occurrences: **1417**
- `wix` occurrences (word match): **37**
- `frog.wix.com` occurrences: **18**

Detected references are concentrated in migration/audit documentation and audit tooling. No runtime code path currently references a Base44 SDK endpoint.

## Files containing `base44`

- [c4-proof-pack/README.md](c4-proof-pack/README.md)
- [README.md](README.md)
- [docs/BASE44_REMNANTS.md](docs/BASE44_REMNANTS.md)
- [docs/history/API_CONTRACT.md](docs/history/API_CONTRACT.md)
- [docs/history/BACKEND_STUB_PLAN.md](docs/history/BACKEND_STUB_PLAN.md)
- [docs/history/BASE44_CALL_SURFACE_EXTRACT.md](docs/history/BASE44_CALL_SURFACE_EXTRACT.md)
- [docs/history/BASE44_TRANSCRIPT.md](docs/history/BASE44_TRANSCRIPT.md)
- [docs/history/COUPLING_SCAN.md](docs/history/COUPLING_SCAN.md)
- [docs/history/DATA_MODEL.md](docs/history/DATA_MODEL.md)
- [docs/history/ENVIRONMENT.md](docs/history/ENVIRONMENT.md)
- [docs/history/LINK_VALIDATION_REPORT.md](docs/history/LINK_VALIDATION_REPORT.md)
- [docs/history/MIGRATION_EXECUTION_PLAN.md](docs/history/MIGRATION_EXECUTION_PLAN.md)
- [docs/history/MIGRATION_SPEC.md](docs/history/MIGRATION_SPEC.md)
- [docs/history/PSA_COVERAGE_REPORT.md](docs/history/PSA_COVERAGE_REPORT.md)
- [docs/history/PSA_COVERAGE_REPORT_RECONCILED.md](docs/history/PSA_COVERAGE_REPORT_RECONCILED.md)
- [docs/history/TECH_DEBT_SHIMS.md](docs/history/TECH_DEBT_SHIMS.md)
- [docs/history/tools/psa_regen.py](docs/history/tools/psa_regen.py)
- [scripts/audit.mjs](scripts/audit.mjs)

## Files containing `wix` / `frog.wix.com`

- [docs/history/BASE44_TRANSCRIPT.md](docs/history/BASE44_TRANSCRIPT.md)
- [docs/BASE44_REMNANTS.md](docs/BASE44_REMNANTS.md)
- [docs/history/MIGRATION_EXECUTION_PLAN.md](docs/history/MIGRATION_EXECUTION_PLAN.md)
- [docs/history/MIGRATION_SPEC.md](docs/history/MIGRATION_SPEC.md)
- [docs/history/PSA_COVERAGE_REPORT.md](docs/history/PSA_COVERAGE_REPORT.md)
- [docs/history/PSA_COVERAGE_REPORT_RECONCILED.md](docs/history/PSA_COVERAGE_REPORT_RECONCILED.md)
- [README.md](README.md)
- [scripts/audit.mjs](scripts/audit.mjs)

## Base44-shaped environment variables

Repository scan found **no env var names** matching Base44/Wix patterns (`*BASE44*`, `*WIX*`, `*FROG*`).

Current active env variables in runtime config are generic/project-owned (for example `DATABASE_URL`, `PORT`, `ADMIN_TOKEN`, `SUPABASE_*`):
- [server/.env](server/.env)
- [server/index.mjs](server/index.mjs)
