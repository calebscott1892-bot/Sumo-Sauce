#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const WRESTLERS_INPUT = 'data/wrestlers_final_rid_slug.json';
const BASHO_INPUT = 'data/basho_records_final.json';
const MERGED_OUTPUT = 'data/wrestlers_final_merged.json';

const DIVISION_CODE_MAP = {
  1: 'Makuuchi',
  2: 'Juryo',
  3: 'Makushita',
  4: 'Sandanme',
  5: 'Jonidan',
  6: 'Jonokuchi',
};

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const SERVER_URL = String(process.env.SERVER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const CHUNK_SIZE = Number.parseInt(String(process.env.CHUNK_SIZE || '300'), 10);

function fail(message, extra) {
  console.error(message);
  if (extra !== undefined) {
    try {
      console.error(typeof extra === 'string' ? extra : JSON.stringify(extra, null, 2));
    } catch {
      console.error(String(extra));
    }
  }
  process.exit(1);
}

function normalizeRid(v) {
  return String(v || '').trim().toLowerCase();
}

function toSafeString(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function toNullableNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function titleCaseRid(rid) {
  return String(rid)
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function pickDivision(record) {
  const byName = toSafeString(record?.division);
  if (byName) return byName;

  const code = Number(record?.division_code);
  if (Number.isFinite(code) && DIVISION_CODE_MAP[code]) {
    return DIVISION_CODE_MAP[code];
  }

  return '';
}

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function readJsonArray(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  let parsed;
  try {
    const raw = await fs.readFile(abs, 'utf8');
    parsed = JSON.parse(raw);
  } catch (err) {
    fail(`Failed to read/parse ${filePath}: ${String(err?.message || err)}`);
  }
  if (!Array.isArray(parsed)) {
    fail(`${filePath} must be a JSON array`);
  }
  return parsed;
}

async function fetchJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    fail(`Network error for ${url}: ${String(err?.message || err)}`);
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    fail(`Non-JSON response from ${url} (status ${response.status})`, text);
  }

  if (!response.ok) {
    fail(`HTTP ${response.status} from ${url}`, data);
  }

  return data;
}

function mergeWrestlersFromBasho(wrestlers, bashoRecords) {
  const existingRids = new Set(wrestlers.map((w) => normalizeRid(w?.rid)).filter(Boolean));

  const ridToSample = new Map();
  for (const record of bashoRecords) {
    const rid = normalizeRid(record?.rid);
    if (!rid) continue;
    if (!ridToSample.has(rid)) ridToSample.set(rid, record);
  }

  const stubs = [];
  for (const [rid, sample] of ridToSample.entries()) {
    if (existingRids.has(rid)) continue;

    stubs.push({
      rid,
      shikona: toSafeString(sample?.shikona) || titleCaseRid(rid),
      status_is_active: true,
      status_is_retired: false,
      external_id: '',
      current_division: pickDivision(sample),
      current_rank: toSafeString(sample?.rank),
      current_rank_number: toNullableNumber(sample?.rank_number),
      current_side: toSafeString(sample?.side),
      official_image_url: '',
    });
  }

  const merged = [...wrestlers, ...stubs].sort((a, b) => normalizeRid(a?.rid).localeCompare(normalizeRid(b?.rid)));
  return { merged, stubs };
}

async function importInChunks({ entity, endpoint, rows, dryRun }) {
  const chunks = chunkArray(rows, CHUNK_SIZE);
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
    const data = await fetchJson(`${SERVER_URL}${endpoint}?dry_run=${dryRun ? '1' : '0'}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-token': ADMIN_TOKEN,
      },
      body: JSON.stringify(chunk),
    });

    const created = Number(data?.created_count || 0);
    const skipped = Number(data?.skipped_duplicates_count || 0);
    const failed = Number(data?.failed_validation_count || 0);
    const missingFk = Number(data?.missing_fk_count || 0);
    const received = Number(data?.received_count || 0);

    totals.received_count += received;
    totals.created_count += created;
    totals.skipped_duplicates_count += skipped;
    totals.failed_validation_count += failed;
    totals.missing_fk_count += missingFk;

    console.log(
      `[${entity}][dry_run=${dryRun ? 1 : 0}] chunk ${i + 1}/${chunks.length}: created=${created}, skipped_duplicates=${skipped}, failed_validation=${failed}, missing_fk=${missingFk}`
    );

    if (failed > 0 || missingFk > 0) {
      fail(`Import halted for ${entity} at chunk ${i + 1}/${chunks.length}`, {
        failures: data?.failures || [],
        chunk_index: i + 1,
        chunk_total: chunks.length,
      });
    }
  }

  return totals;
}

async function resetEntity(entity) {
  const data = await fetchJson(`${SERVER_URL}/api/admin/reset-entity`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ entity }),
  });
  console.log(`[reset] ${entity}: deleted_count=${Number(data?.deleted_count || 0)}`);
  return data;
}

async function main() {
  if (!ADMIN_TOKEN) {
    fail('ADMIN_TOKEN is required in environment.');
  }
  if (!(CHUNK_SIZE > 0)) {
    fail('CHUNK_SIZE must be a positive integer.');
  }

  await fetchJson(`${SERVER_URL}/api/health`);
  console.log(`[health] ok ${SERVER_URL}`);

  await resetEntity('BashoRecord');
  await resetEntity('Wrestler');

  const wrestlers = await readJsonArray(WRESTLERS_INPUT);
  const bashoRecords = await readJsonArray(BASHO_INPUT);

  const { merged, stubs } = mergeWrestlersFromBasho(wrestlers, bashoRecords);
  await fs.writeFile(path.resolve(process.cwd(), MERGED_OUTPUT), `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(`[merge] wrote ${MERGED_OUTPUT} (merged=${merged.length}, stubs=${stubs.length})`);

  const wrestlerDryTotals = await importInChunks({
    entity: 'Wrestler',
    endpoint: '/api/admin/import/wrestlers',
    rows: merged,
    dryRun: true,
  });
  const wrestlerWriteTotals = await importInChunks({
    entity: 'Wrestler',
    endpoint: '/api/admin/import/wrestlers',
    rows: merged,
    dryRun: false,
  });

  const bashoDryTotals = await importInChunks({
    entity: 'BashoRecord',
    endpoint: '/api/admin/import/basho-records',
    rows: bashoRecords,
    dryRun: true,
  });
  const bashoWriteTotals = await importInChunks({
    entity: 'BashoRecord',
    endpoint: '/api/admin/import/basho-records',
    rows: bashoRecords,
    dryRun: false,
  });

  const sampleWrestlers = await fetchJson(`${SERVER_URL}/api/entities/Wrestler?limit=3`);
  const sampleBasho = await fetchJson(`${SERVER_URL}/api/entities/BashoRecord?limit=3`);

  const summary = {
    merged_wrestlers_count: merged.length,
    stub_created_count: stubs.length,
    wrestler_import_totals: {
      dry_run: wrestlerDryTotals,
      write: wrestlerWriteTotals,
    },
    basho_import_totals: {
      dry_run: bashoDryTotals,
      write: bashoWriteTotals,
    },
    sample_wrestlers: Array.isArray(sampleWrestlers) ? sampleWrestlers.slice(0, 3) : [],
    sample_basho_records: Array.isArray(sampleBasho) ? sampleBasho.slice(0, 3) : [],
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
