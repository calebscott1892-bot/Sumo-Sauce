#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const USAGE = `Usage:
  node scripts/import-json-chunks.mjs \
    --entity Wrestler|BashoRecord \
    --file /absolute/or/relative/path/to/file.json \
    --server http://127.0.0.1:8787 \
    --token <admin-token> \
    --chunk 300 \
    --dry-run 1|0

Options:
  --entity    Required. Wrestler or BashoRecord
  --file      Required. Path to JSON file (must be a JSON array)
  --server    Optional. Default: http://127.0.0.1:8787
  --token     Required. X-ADMIN-TOKEN header value (never printed)
  --chunk     Optional. Default: 300
  --dry-run   Optional. 1 or 0. Default: 1
  --help      Show this help
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);

    if (name === 'help') {
      args.help = true;
      continue;
    }

    const value = argv[i + 1];
    if (value == null || value.startsWith('--')) {
      throw new Error(`Missing value for --${name}`);
    }

    args[name] = value;
    i += 1;
  }
  return args;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function endpointForEntity(entity) {
  if (entity === 'Wrestler') return '/api/admin/import/wrestlers';
  if (entity === 'BashoRecord') return '/api/admin/import/basho-records';
  throw new Error('Invalid --entity. Use Wrestler or BashoRecord.');
}

function asNumber(v) {
  return Number.isFinite(Number(v)) ? Number(v) : 0;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Argument error: ${String(err?.message || err)}`);
    console.error(USAGE);
    process.exit(1);
  }

  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const entity = args.entity;
  const fileArg = args.file;
  const server = String(args.server || 'http://127.0.0.1:8787').replace(/\/$/, '');
  const token = args.token;
  const chunkSize = Number.parseInt(String(args.chunk || '300'), 10);
  const dryRun = String(args['dry-run'] || '1');

  if (!entity || !fileArg || !token) {
    console.error('Missing required flags: --entity, --file, --token');
    console.error(USAGE);
    process.exit(1);
  }

  if (!(chunkSize > 0)) {
    console.error('--chunk must be a positive integer');
    process.exit(1);
  }

  if (dryRun !== '0' && dryRun !== '1') {
    console.error('--dry-run must be 1 or 0');
    process.exit(1);
  }

  const endpoint = endpointForEntity(entity);
  const filePath = path.resolve(process.cwd(), fileArg);

  let parsed;
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read/parse file: ${String(err?.message || err)}`);
    process.exit(1);
  }

  if (!Array.isArray(parsed)) {
    console.error('Input file must contain a JSON array at the top level.');
    process.exit(1);
  }

  const chunks = chunkArray(parsed, chunkSize);
  const totals = {
    chunks: chunks.length,
    received_count: 0,
    created_count: 0,
    skipped_duplicates_count: 0,
    failed_validation_count: 0,
    missing_fk_count: 0,
  };

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const url = `${server}${endpoint}?dry_run=${dryRun}`;

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify(chunk),
      });
    } catch (err) {
      console.error(`Request failed for chunk ${i + 1}/${chunks.length}: ${String(err?.message || err)}`);
      process.exit(1);
    }

    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      console.error(`Non-JSON response for chunk ${i + 1}/${chunks.length} (status ${response.status}).`);
      process.exit(1);
    }

    if (!response.ok) {
      console.error(`HTTP ${response.status} on chunk ${i + 1}/${chunks.length}: ${data?.error || 'Unknown error'}`);
      process.exit(1);
    }

    const created = asNumber(data.created_count);
    const skipped = asNumber(data.skipped_duplicates_count);
    const failed = asNumber(data.failed_validation_count);
    const missingFk = asNumber(data.missing_fk_count);
    const received = asNumber(data.received_count);

    totals.received_count += received;
    totals.created_count += created;
    totals.skipped_duplicates_count += skipped;
    totals.failed_validation_count += failed;
    totals.missing_fk_count += missingFk;

    console.log(
      `chunk ${i + 1}/${chunks.length}: created=${created}, skipped_duplicates=${skipped}, failed_validation=${failed}, missing_fk=${missingFk}`
    );

    if (failed > 0 || missingFk > 0) {
      console.error('Import halted due to validation/FK errors.');
      console.error(JSON.stringify(data.failures || [], null, 2));
      process.exit(1);
    }
  }

  console.log('--- totals ---');
  console.log(JSON.stringify(totals, null, 2));
}

main();
