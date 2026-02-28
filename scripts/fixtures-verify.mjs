#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { sha256Hex } from '../pipeline/hash.ts';
import { requiredSnapshotsForBasho } from '../pipeline/ingest/sources.ts';
import { CaptureSnapshotMetaSchema } from '../pipeline/snapshots/snapshotTypes.ts';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PHASE8_FIXTURES_DIR = path.join(ROOT, 'pipeline', 'fixtures', 'snapshots', 'phase8');

function fail(code, message, details) {
  const payload = {
    code,
    message,
    details: details || undefined,
  };
  throw new Error(JSON.stringify(payload));
}

function parseArgs(argv) {
  const out = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1];
    if (value == null || value.startsWith('--')) {
      fail('FIXTURE_ARGS_INVALID', `Missing value for ${key}`);
    }
    out.set(key.slice(2), value);
    i += 1;
  }
  return out;
}

function bodyExtFromMetaContentType(contentType) {
  const t = String(contentType || '').toLowerCase();
  if (t.includes('html')) return 'html';
  if (t.includes('json')) return 'json';
  return 'txt';
}

async function verifyOne(required, bashoId) {
  const base = `${bashoId}.${required.source}.${required.kind}`;
  const metaPath = path.join(PHASE8_FIXTURES_DIR, `${base}.meta.json`);

  let rawMeta;
  try {
    rawMeta = await readFile(metaPath, 'utf8');
  } catch {
    fail('FIXTURE_META_MISSING', 'Missing fixture meta file', { metaPath });
  }

  let meta;
  try {
    meta = CaptureSnapshotMetaSchema.parse(JSON.parse(rawMeta));
  } catch (err) {
    fail('FIXTURE_META_INVALID', 'Invalid fixture meta schema', {
      metaPath,
      error: String(err?.message || err),
    });
  }

  if (meta.url !== required.url) {
    fail('FIXTURE_URL_MISMATCH', 'Fixture meta URL does not match required authoritative URL', {
      expected: required.url,
      actual: meta.url,
      metaPath,
    });
  }

  const ext = bodyExtFromMetaContentType(meta.contentType);
  const bodyPath = path.join(PHASE8_FIXTURES_DIR, `${base}.${ext}`);

  let bodyBytes;
  try {
    bodyBytes = await readFile(bodyPath);
  } catch {
    fail('FIXTURE_BODY_MISSING', 'Missing fixture body file', { bodyPath, metaPath });
  }

  const computedSha = sha256Hex(bodyBytes);
  if (computedSha !== meta.contentSha256) {
    fail('FIXTURE_SHA_MISMATCH', 'Fixture body SHA does not match meta.contentSha256', {
      bodyPath,
      expected: meta.contentSha256,
      actual: computedSha,
    });
  }

  if (bodyBytes.byteLength !== meta.bytes) {
    fail('FIXTURE_BYTES_MISMATCH', 'Fixture body bytes does not match meta.bytes', {
      bodyPath,
      expected: meta.bytes,
      actual: bodyBytes.byteLength,
    });
  }

  return {
    source: meta.source,
    kind: required.kind,
    url: meta.url,
    sha256: meta.contentSha256,
    bytes: meta.bytes,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bashoId = String(args.get('basho') || '').trim();
  if (!bashoId) {
    fail('FIXTURE_ARGS_INVALID', 'Usage: npm run fixtures:verify -- --basho YYYYMM');
  }

  const required = requiredSnapshotsForBasho(bashoId);
  const rows = [];
  for (const item of required) {
    rows.push(await verifyOne(item, bashoId));
  }

  for (const row of rows) {
    process.stdout.write(`${JSON.stringify(row)}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`${String(err?.message || err)}\n`);
  process.exit(1);
});
