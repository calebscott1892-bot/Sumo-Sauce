#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const WRESTLERS_INPUT = 'data/wrestlers_final_rid_slug.json';
const BASHO_INPUT = 'data/basho_records_final.json';
const OUTPUT = 'data/wrestlers_final_merged.json';

const DIVISION_CODE_MAP = {
  1: 'Makuuchi',
  2: 'Juryo',
  3: 'Makushita',
  4: 'Sandanme',
  5: 'Jonidan',
  6: 'Jonokuchi',
};

function titleCaseRid(rid) {
  return String(rid)
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
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

function pickDivision(record) {
  const byName = toSafeString(record?.division);
  if (byName) return byName;

  const code = Number(record?.division_code);
  if (Number.isFinite(code) && DIVISION_CODE_MAP[code]) {
    return DIVISION_CODE_MAP[code];
  }

  return '';
}

async function readJsonArray(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(abs, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} must be a JSON array`);
  }
  return parsed;
}

async function main() {
  const wrestlers = await readJsonArray(WRESTLERS_INPUT);
  const bashoRecords = await readJsonArray(BASHO_INPUT);

  const existingRids = new Set(
    wrestlers
      .map((w) => normalizeRid(w?.rid))
      .filter(Boolean)
  );

  const bashoRidToSampleRecord = new Map();
  for (const record of bashoRecords) {
    const rid = normalizeRid(record?.rid);
    if (!rid) continue;
    if (!bashoRidToSampleRecord.has(rid)) {
      bashoRidToSampleRecord.set(rid, record);
    }
  }

  const stubWrestlers = [];
  for (const [rid, sample] of bashoRidToSampleRecord.entries()) {
    if (existingRids.has(rid)) continue;

    const shikona = toSafeString(sample?.shikona) || titleCaseRid(rid);
    const stub = {
      rid,
      shikona,
      status_is_active: true,
      status_is_retired: false,
      external_id: '',
      current_division: pickDivision(sample),
      current_rank: toSafeString(sample?.rank),
      current_rank_number: toNullableNumber(sample?.rank_number),
      current_side: toSafeString(sample?.side),
      official_image_url: '',
    };

    stubWrestlers.push(stub);
  }

  const merged = [...wrestlers, ...stubWrestlers].sort((a, b) => {
    const ar = normalizeRid(a?.rid);
    const br = normalizeRid(b?.rid);
    return ar.localeCompare(br);
  });

  const outAbs = path.resolve(process.cwd(), OUTPUT);
  await fs.writeFile(outAbs, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  const report = {
    original_wrestlers_count: wrestlers.length,
    basho_unique_rids_count: bashoRidToSampleRecord.size,
    stub_created_count: stubWrestlers.length,
    merged_total_count: merged.length,
    first_30_new_stub_rids: stubWrestlers
      .map((w) => w.rid)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 30),
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
