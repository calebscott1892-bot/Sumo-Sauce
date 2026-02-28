import path from 'node:path';

export type IngestMode = 'offline' | 'live';

export type IngestConfig = {
  mode: IngestMode;
  fixturesDir: string;
  outputDir: string;
  userAgent: string;
  rateLimitMs: number;
  timeoutMs: number;
};

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseMode(value: string | undefined): IngestMode {
  const mode = String(value || 'offline').trim().toLowerCase();
  return mode === 'live' ? 'live' : 'offline';
}

export const ingestConfig: IngestConfig = {
  mode: parseMode(process.env.INGEST_MODE),
  fixturesDir: path.resolve(ROOT, process.env.INGEST_FIXTURES_DIR || 'pipeline/fixtures/snapshots/phase8/'),
  outputDir: path.resolve(ROOT, process.env.INGEST_OUTPUT_DIR || 'data/ingestion/'),
  userAgent: String(process.env.INGEST_USER_AGENT || 'SumoWatchIngestion/phase8 (+https://example.invalid)').trim(),
  rateLimitMs: parsePositiveInt(process.env.INGEST_RATE_LIMIT_MS, 1000),
  timeoutMs: parsePositiveInt(process.env.INGEST_TIMEOUT_MS, 20000),
};
