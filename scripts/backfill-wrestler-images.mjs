#!/usr/bin/env node

const SERVER_URL = String(process.env.SERVER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const ADMIN_TOKEN = String(process.env.ADMIN_TOKEN || '').trim();

function isUsableHttpUrl(v) {
  if (typeof v !== 'string') return false;
  const trimmed = v.trim();
  if (!trimmed) return false;
  return /^https?:\/\//i.test(trimmed);
}

function getString(v) {
  return typeof v === 'string' ? v.trim() : '';
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
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON response from ${url} (status ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${String(data?.error || 'Unknown error')}`);
  }

  return data;
}

function buildBackfillCandidates(wrestlers) {
  const candidates = [];

  for (const row of wrestlers) {
    const rid = getString(row?.rid);
    if (!rid) continue;

    const officialImageUrl = getString(row?.official_image_url);
    const imageUrl = getString(row?.image?.url);

    // Only attempt inference if both destination fields are currently absent.
    if (isUsableHttpUrl(officialImageUrl) || isUsableHttpUrl(imageUrl)) {
      continue;
    }

    const inferredFromMedia = getString(row?.media?.official_image_url);
    if (!isUsableHttpUrl(inferredFromMedia)) {
      continue;
    }

    candidates.push({
      rid,
      shikona: getString(row?.shikona),
      official_image_url: inferredFromMedia,
    });
  }

  candidates.sort((a, b) => a.rid.localeCompare(b.rid));
  return candidates;
}

async function main() {
  if (!ADMIN_TOKEN) {
    console.error('ADMIN_TOKEN is required. Example: ADMIN_TOKEN=dev-token node scripts/backfill-wrestler-images.mjs');
    process.exit(1);
  }

  const wrestlers = await fetchJson(`${SERVER_URL}/api/entities/Wrestler?limit=5000`);
  if (!Array.isArray(wrestlers)) {
    throw new Error('Expected /api/entities/Wrestler to return a JSON array');
  }

  const candidates = buildBackfillCandidates(wrestlers);

  if (candidates.length === 0) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          server: SERVER_URL,
          scanned_count: wrestlers.length,
          changed_count: 0,
          import_result: null,
          patch_result: null,
          message: 'No wrestler image backfill changes required.',
        },
        null,
        2
      )
    );
    return;
  }

  // Keep compatibility with existing import flow; this remains insert-only-safe.
  const importPayload = candidates.map((c) => ({
    rid: c.rid,
    shikona: c.shikona || c.rid,
    official_image_url: c.official_image_url,
  }));

  const importResult = await fetchJson(`${SERVER_URL}/api/admin/import/wrestlers?dry_run=0`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
    },
    body: JSON.stringify(importPayload),
  });

  const patchPayload = candidates.map((c) => ({
    rid: c.rid,
    official_image_url: c.official_image_url,
  }));

  const patchResult = await fetchJson(`${SERVER_URL}/api/admin/patch-wrestler-images`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
    },
    body: JSON.stringify(patchPayload),
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        server: SERVER_URL,
        scanned_count: wrestlers.length,
        changed_count: candidates.length,
        import_result: importResult,
        patch_result: patchResult,
        sample_changed_rids: candidates.slice(0, 20).map((c) => c.rid),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
