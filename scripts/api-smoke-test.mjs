#!/usr/bin/env node
import { spawn } from 'node:child_process';

const PORT = 8790;
const BASE = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await sleep(250);
  }
  throw new Error('Server did not become healthy in time');
}

async function isHealthy() {
  try {
    const res = await fetch(`${BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function getJsonWithHeaders(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertErrorShape(payload, expectedCode) {
  assert(payload && typeof payload === 'object', 'Expected JSON object payload');
  assert(payload.error && typeof payload.error === 'object', 'Expected payload.error object');
  assert(payload.error.code === expectedCode, `Expected error.code=${expectedCode}`);
  assert(typeof payload.error.message === 'string' && payload.error.message.length > 0, 'Expected error.message');
}

async function main() {
  let child = null;
  const runKey = `smoke-${process.pid}-${Date.now()}`;
  const baseHeaders = { 'x-rate-limit-key': `${runKey}:base` };
  const rateHeaders = { 'x-rate-limit-key': `${runKey}:rate` };

  if (!(await isHealthy())) {
    child = spawn('node', ['/Users/belacttocs/Downloads/SumoWatch/server/index.mjs'], {
      env: {
        ...process.env,
        PORT: String(PORT),
        ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'dev-token',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => process.stderr.write(String(chunk)));
    child.stderr.on('data', (chunk) => process.stderr.write(String(chunk)));
  }

  try {
    if (child) {
      const earlyExit = new Promise((_, reject) => {
        child.once('exit', (code, signal) => {
          reject(new Error(`Server exited before health check (code=${String(code)} signal=${String(signal)})`));
        });
      });
      await Promise.race([waitForHealth(), earlyExit]);
    } else {
      await waitForHealth();
    }

    const rikishi = await getJsonWithHeaders('/api/v1/rikishi/rks_0001', baseHeaders);
    assert(rikishi.status === 200, 'Expected valid rikishi endpoint to return 200');

    const invalidDivision = await getJsonWithHeaders('/api/v1/basho/202401/invaliddivision', baseHeaders);
    assert(invalidDivision.status === 400, 'Expected invalid division endpoint to return 400');
    assertErrorShape(invalidDivision.data, 'INVALID_PARAMETER');

    const unknownRikishi = await getJsonWithHeaders('/api/v1/rikishi/does_not_exist', baseHeaders);
    assert(unknownRikishi.status === 404, 'Expected unknown rikishi endpoint to return 404');
    assertErrorShape(unknownRikishi.data, 'RIKISHI_NOT_FOUND');

    const compare = await getJsonWithHeaders('/api/v1/compare/rks_0001/rks_0002', baseHeaders);
    assert(compare.status === 200, 'Expected compare endpoint to return 200');
    assert(compare.data && typeof compare.data === 'object', 'Expected compare payload object');
    assert(Object.prototype.hasOwnProperty.call(compare.data, 'rikishiA'), 'Expected compare payload.rikishiA');
    assert(Object.prototype.hasOwnProperty.call(compare.data, 'rikishiB'), 'Expected compare payload.rikishiB');
    assert(Object.prototype.hasOwnProperty.call(compare.data, 'headToHead'), 'Expected compare payload.headToHead');

    const burstRequests = [];
    for (let i = 0; i < 130; i += 1) {
      burstRequests.push(getJsonWithHeaders('/api/v1/rikishi/rks_0001', rateHeaders));
    }
    const burstResults = await Promise.all(burstRequests);
    const first429 = burstResults.find((item) => item.status === 429);
    assert(Boolean(first429), 'Expected at least one 429 from burst requests');
    assertErrorShape(first429?.data, 'RATE_LIMITED');
    assert(Number.isFinite(Number(first429?.data?.retryAfterSeconds)), 'Expected retryAfterSeconds number');

    console.log(
      JSON.stringify(
        {
          ok: true,
          checks: {
            health: true,
            valid200: true,
            invalidDivision400: true,
            unknownRikishi404: true,
            compare200: true,
            rateLimit429: true,
          },
        },
        null,
        2
      )
    );
  } finally {
    if (child) child.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
