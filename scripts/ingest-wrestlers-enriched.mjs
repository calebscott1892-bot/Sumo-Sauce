#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const API_URL = String(process.env.WRESTLER_API_URL || 'http://127.0.0.1:8787/api/entities/Wrestler?limit=5000').trim();
const PROFILE_BASE_URL = String(process.env.PROFILE_BASE_URL || 'https://www.sumo.or.jp/EnSumoDataRikishi/profile').replace(/\/$/, '');
const PUBLIC_WRESTLERS_DIR = path.resolve(process.cwd(), 'public/wrestlers');
const BACKUP_DIR = path.resolve(process.cwd(), 'data');
const DELAY_MS = Number(process.env.SCRAPE_DELAY_MS || 500);
const BACKUP_EVERY = 25;
const DRY_RUN = String(process.env.DRY_RUN || '').trim().toLowerCase() === 'true';

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logProgress(index, total, rid, note) {
  console.log(`[${index}/${total}] ${rid} - ${note}`);
}

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractProfileIdFromExternalId(externalId) {
  const value = String(externalId || '').trim();
  if (!value) return '';

  const exactNumeric = value.match(/^\d+$/);
  if (exactNumeric) return exactNumeric[0];

  const markerMatch = value.match(/(?:profile|rikishi)[_\-/:\s]+(\d{3,6})\b/i);
  if (markerMatch) return markerMatch[1];

  return '';
}

function extractProfileId(wrestler) {
  const profileUrlCandidates = [
    wrestler?.official_image_url,
    wrestler?.media?.official_image_url,
    wrestler?.profile_url,
  ].map((v) => String(v || '').trim()).filter(Boolean);

  for (const value of profileUrlCandidates) {
    const profileMatch = value.match(/profile\/(\d+)\b/i);
    if (profileMatch) return { id: profileMatch[1], source: 'official_image_url' };
  }

  const directNumericCandidates = [
    wrestler?.profile_id,
    wrestler?.id,
  ].map((v) => String(v || '').trim()).filter(Boolean);

  for (const value of directNumericCandidates) {
    const numericOnly = value.match(/^\d+$/);
    if (numericOnly) return { id: numericOnly[0], source: 'profile_id_or_id' };
  }

  const externalDerived = extractProfileIdFromExternalId(wrestler?.external_id);
  if (externalDerived) return { id: externalDerived, source: 'external_id' };

  return { id: '', source: '' };
}

function normalizeLabel(label) {
  return String(label || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function pickField(fieldMap, patterns) {
  const entries = Object.entries(fieldMap);
  for (const [label, value] of entries) {
    if (!value) continue;
    if (patterns.some((rx) => rx.test(label))) return value;
  }
  return '';
}

function extractProfileFieldsFromHtml(html) {
  const $ = load(html);
  const fieldMap = {};

  $('tr').each((_, row) => {
    const label = normalizeLabel($(row).find('th').first().text());
    const value = toTrimmedString($(row).find('td').first().text().replace(/\s+/g, ' '));
    if (label && value) fieldMap[label] = value;
  });

  $('dt').each((_, dt) => {
    const label = normalizeLabel($(dt).text());
    const value = toTrimmedString($(dt).next('dd').text().replace(/\s+/g, ' '));
    if (label && value) fieldMap[label] = value;
  });

  return {
    real_name: pickField(fieldMap, [/^real name$/, /name/]),
    height: pickField(fieldMap, [/^height$/, /height/]),
    weight: pickField(fieldMap, [/^weight$/, /weight/]),
    birth_date: pickField(fieldMap, [/birth date/, /date of birth/]),
    birth_place: pickField(fieldMap, [/birth place/, /place of birth/]),
    debut: pickField(fieldMap, [/debut/, /initial ranking/]),
    highest_rank: pickField(fieldMap, [/highest rank/]),
  };
}

async function fetchJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    throw new Error(`Network error for ${url}: ${String(err?.message || err)}`);
  }

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${url} (status ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${String(data?.error || 'Unknown error')}`);
  }

  return data;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

async function downloadImage(url, rid) {
  if (DRY_RUN) {
    return { saved: false, file: '', error: '', wouldDownload: true };
  }

  const trimmed = toTrimmedString(url);
  if (!/^https?:\/\//i.test(trimmed)) {
    return { saved: false, file: '', error: 'No valid image URL', wouldDownload: false };
  }

  const response = await fetch(trimmed);
  if (!response.ok) {
    return { saved: false, file: '', error: `Image HTTP ${response.status}`, wouldDownload: false };
  }

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const arr = new Uint8Array(await response.arrayBuffer());
  const filePath = path.join(PUBLIC_WRESTLERS_DIR, `${rid}.${ext}`);
  await writeFile(filePath, arr);

  return { saved: true, file: `public/wrestlers/${rid}.${ext}`, error: '', wouldDownload: false };
}

function buildEnrichedPayload(wrestler, profileId, profileFields, imageResult) {
  const rid = toTrimmedString(wrestler?.rid);
  const stable = toTrimmedString(wrestler?.stable || wrestler?.heya?.name);
  const careerWins = toFiniteNumber(wrestler?.career_wins ?? wrestler?.records?.career_total?.wins);
  const careerLosses = toFiniteNumber(wrestler?.career_losses ?? wrestler?.records?.career_total?.losses);
  const fallbackWinPct = careerWins !== null && careerLosses !== null && careerWins + careerLosses > 0
    ? careerWins / (careerWins + careerLosses)
    : null;
  const careerWinPct = toFiniteNumber(wrestler?.career_win_pct ?? wrestler?.records?.career_total?.win_percentage) ?? fallbackWinPct;

  const yushoTopDiv = toFiniteNumber(wrestler?.yusho_top_div ?? wrestler?.titles?.yusho?.makuuchi);
  const specialPrizes = toFiniteNumber(wrestler?.special_prizes ?? wrestler?.titles?.special_prizes?.total);

  return {
    rid,
    profile_id: profileId || null,
    official_image_url: toTrimmedString(wrestler?.official_image_url) || null,
    local_image_path: imageResult.file || null,
    stable: stable || null,
    career_wins: careerWins,
    career_losses: careerLosses,
    career_win_pct: careerWinPct,
    yusho_top_div: yushoTopDiv,
    special_prizes: specialPrizes,
    real_name: profileFields.real_name || null,
    height: profileFields.height || null,
    weight: profileFields.weight || null,
    birth_date: profileFields.birth_date || null,
    birth_place: profileFields.birth_place || null,
    debut: profileFields.debut || null,
    highest_rank: profileFields.highest_rank || null,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  await mkdir(PUBLIC_WRESTLERS_DIR, { recursive: true });
  await mkdir(BACKUP_DIR, { recursive: true });

  console.log(`Fetching wrestlers: ${API_URL}`);
  const wrestlers = await fetchJson(API_URL);
  if (!Array.isArray(wrestlers)) {
    throw new Error('Wrestler API did not return an array');
  }

  const supabase = DRY_RUN
    ? null
    : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `wrestlers-enriched-backup-${timestamp}.json`);

  const enriched = [];
  let profileErrors = 0;
  let imageErrors = 0;

  for (let i = 0; i < wrestlers.length; i += 1) {
    const wrestler = wrestlers[i] || {};
    const rid = toTrimmedString(wrestler?.rid);

    if (!rid) {
      logProgress(i + 1, wrestlers.length, '-', 'skip: missing rid');
      continue;
    }

    const { id: profileId, source: profileIdSource } = extractProfileId(wrestler);
    let profileFields = {
      real_name: '',
      height: '',
      weight: '',
      birth_date: '',
      birth_place: '',
      debut: '',
      highest_rank: '',
    };

    if (profileId) {
      const profileUrl = `${PROFILE_BASE_URL}/${profileId}/`;
      try {
        const html = await fetchText(profileUrl);
        profileFields = extractProfileFieldsFromHtml(html);
        logProgress(i + 1, wrestlers.length, rid, `profile ok (${profileId}) via ${profileIdSource}`);
      } catch (err) {
        profileErrors += 1;
        logProgress(i + 1, wrestlers.length, rid, `profile missing (${profileId}) - ${String(err?.message || err)}`);
      }
      await sleep(DELAY_MS);
    } else {
      profileErrors += 1;
      logProgress(i + 1, wrestlers.length, rid, 'profile skipped: no profile id');
    }

    const imageResult = await downloadImage(wrestler?.official_image_url, rid);
    if (DRY_RUN && imageResult.wouldDownload) {
      logProgress(i + 1, wrestlers.length, rid, `dry-run image: would download ${toTrimmedString(wrestler?.official_image_url)}`);
    } else if (!imageResult.saved) {
      imageErrors += 1;
      logProgress(i + 1, wrestlers.length, rid, `image skip - ${imageResult.error}`);
    }
    await sleep(DELAY_MS);

    const payload = buildEnrichedPayload(wrestler, profileId, profileFields, imageResult);
    enriched.push(payload);

    if (enriched.length % BACKUP_EVERY === 0) {
      await writeFile(backupPath, JSON.stringify(enriched, null, 2), 'utf8');
      console.log(`Backup checkpoint saved: ${backupPath} (${enriched.length} rows)`);
    }
  }

  await writeFile(backupPath, JSON.stringify(enriched, null, 2), 'utf8');
  console.log(`Backup saved: ${backupPath} (${enriched.length} rows)`);

  let uploaded = 0;
  if (!DRY_RUN) {
    const chunkSize = 200;
    for (let i = 0; i < enriched.length; i += chunkSize) {
      const chunk = enriched.slice(i, i + chunkSize);
      const { error } = await supabase.from('wrestlers').upsert(chunk, { onConflict: 'rid' });
      if (error) {
        throw new Error(`Supabase upsert failed at chunk ${i / chunkSize + 1}: ${error.message}`);
      }
      uploaded += chunk.length;
      console.log(`Supabase upsert: ${uploaded}/${enriched.length}`);
    }
  } else {
    console.log(`DRY_RUN=true: skipping Supabase upsert of ${enriched.length} rows`);
  }

  console.log(JSON.stringify({
    ok: true,
    dryRun: DRY_RUN,
    totalFetched: wrestlers.length,
    totalEnriched: enriched.length,
    uploaded,
    profileErrors,
    imageErrors,
    backupPath,
  }, null, 2));
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
