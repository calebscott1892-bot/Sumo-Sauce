#!/usr/bin/env node
/**
 * Live-fetches all basho from SumoDB with progress tracking.
 * Processes basho sequentially with a rate limit between requests.
 */
import { ingestRange } from '../pipeline/ingest/ingestController.ts';

const FROM = process.argv[2] || '200001';
const TO = process.argv[3] || '202403';

async function main() {
  console.log(`[ingest-all] Starting live ingestion from ${FROM} to ${TO}`);
  console.log(`[ingest-all] Time: ${new Date().toISOString()}`);

  const result = await ingestRange({
    from: FROM,
    to: TO,
    mode: 'live',
    force: true,
  });

  let completed = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of result.results) {
    if (row.status === 'COMPLETE' && !row.skipped) {
      completed++;
      console.log(`[OK] ${row.bashoId} — snapshots=${row.summary?.snapshotCount || 0} canonical=${row.summary?.canonicalCount || 0}`);
    } else if (row.skipped) {
      skipped++;
      console.log(`[SKIP] ${row.bashoId}`);
    } else {
      failed++;
      console.error(`[FAIL] ${row.bashoId} — ${row.errorMessage || 'unknown'}`);
    }
  }

  console.log(`\n[ingest-all] Done: ${completed} completed, ${failed} failed, ${skipped} skipped out of ${result.total}`);
  console.log(`[ingest-all] Time: ${new Date().toISOString()}`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
