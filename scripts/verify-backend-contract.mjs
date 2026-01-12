import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const SERVER_PORT = 8787;
const BASE = `http://127.0.0.1:${SERVER_PORT}/api`;
const BOOTSTRAP_CMD = 'npm run bootstrap';

function startServer() {
  const child = spawn('npm', ['--prefix', 'server', 'run', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(SERVER_PORT) },
  });

  const logs = [];
  const onLine = (line) => logs.push(line);

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (d) => d.split(/\r?\n/).filter(Boolean).forEach(onLine));
  child.stderr.on('data', (d) => d.split(/\r?\n/).filter(Boolean).forEach(onLine));

  return { child, logs };
}

async function waitForHealth(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      // ignore
    }
    await delay(150);
  }
  throw new Error('Timed out waiting for backend /api/health');
}

async function json(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body == null ? undefined : { 'Content-Type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${text || res.statusText}`);
  return text ? JSON.parse(text) : null;
}

async function requireDevData() {
  const res = await fetch(`${BASE}/auth/me`);
  if (res.ok) return;
  const err = new Error(`MISSING_DEV_DATA: run ${BOOTSTRAP_CMD}`);
  // @ts-ignore
  err.code = 'MISSING_DEV_DATA';
  throw err;
}

async function main() {
  const { child } = startServer();

  try {
    await waitForHealth();

    await requireDevData();

    // 1) auth.me() returns stable demo user
    const me = await json('GET', '/auth/me');
    assert.equal(me.id, 'user_1');
    assert.equal(me.email, 'demo@sumowatch.local');

    // 2) list sorting works for rank and -rank
    const wrestlersAsc = await json('GET', '/entities/Wrestler?sort=rank&limit=500');
    assert.ok(Array.isArray(wrestlersAsc));
    assert.ok(wrestlersAsc.length >= 5);
    assert.equal(wrestlersAsc[0].rank, 1);
    assert.equal(wrestlersAsc[0].shikona, 'Hakuho');

    const wrestlersDesc = await json('GET', '/entities/Wrestler?sort=-rank&limit=500');
    assert.ok(Array.isArray(wrestlersDesc));
    assert.ok(wrestlersDesc.length >= 5);
    assert.equal(wrestlersDesc[0].rank, 5);

    // 3) update merges patch and returns updated record
    const updated = await json('PATCH', '/entities/Wrestler/wrestler_1', { country: 'Testland' });
    assert.equal(updated.id, 'wrestler_1');
    assert.equal(updated.country, 'Testland');

    const wrestlersAfter = await json('GET', '/entities/Wrestler?sort=-rank&limit=500');
    const w1 = wrestlersAfter.find((w) => w.id === 'wrestler_1');
    assert.equal(w1.country, 'Testland');

    // 4) bulkCreate supported where enabled
    const beforeRecords = await json('GET', '/entities/BashoRecord?sort=-created_date&limit=9999');
    const bulk = await json('POST', '/entities/BashoRecord/bulk', [
      { basho: '2099-01', rid: 'R001', shikona: 'Hakuho', created_date: new Date().toISOString() },
      { basho: '2099-01', rid: 'R002', shikona: 'Terunofuji', created_date: new Date().toISOString() },
    ]);
    assert.equal(bulk.created, 2);
    assert.ok(Array.isArray(bulk.items));
    assert.equal(bulk.items.length, 2);

    const afterRecords = await json('GET', '/entities/BashoRecord?sort=-created_date&limit=9999');
    assert.equal(afterRecords.length, beforeRecords.length + 2);

    // 5) updateMe merges and persists into User table
    const me2 = await json('PATCH', '/auth/me', { full_name: 'Changed Name' });
    assert.equal(me2.full_name, 'Changed Name');

    const users = await json('GET', '/entities/User?sort=-created_date&limit=500');
    assert.ok(users.some((u) => u.id === 'user_1' && u.full_name === 'Changed Name'));

    process.stdout.write('OK verify-backend-contract\n');
  } catch (err) {
    if (err && (err.code === 'MISSING_DEV_DATA' || String(err.message || '').startsWith('MISSING_DEV_DATA:'))) {
      process.stdout.write(`${String(err.message || err)}\n`);
      process.exitCode = 2;
      return;
    }
    throw err;
  } finally {
    child.kill('SIGTERM');
    await delay(250);
    child.kill('SIGKILL');
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(String(err?.stack || err));
  process.exit(1);
});
