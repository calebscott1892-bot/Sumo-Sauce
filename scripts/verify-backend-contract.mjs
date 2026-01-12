import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const SERVER_PORT = 8787;
const BASE = `http://127.0.0.1:${SERVER_PORT}/api`;
const BOOTSTRAP_CMD = 'npm run bootstrap';

const TIMEOUTS = {
  overallMs: 90_000,
  healthMs: 20_000,
  fetchMs: 1_000,
  portProbeMs: 800,
};

const DEV_DB_PATH = new URL('../server/prisma/dev.db', import.meta.url);

async function hasNonEmptyDevDb() {
  try {
    const s = await stat(DEV_DB_PATH);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}

async function withTimeout(label, ms, fn) {
  return await Promise.race([
    fn(),
    delay(ms).then(() => {
      throw new Error(`phase:${label} timed out after ${ms}ms`);
    }),
  ]);
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(new Error(`fetch timed out after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function assertPortFree(host, port) {
  await withTimeout('portProbe', TIMEOUTS.portProbeMs, async () => {
    await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const done = (err) => {
        socket.removeAllListeners();
        socket.destroy();
        if (err) reject(err);
        else resolve();
      };

      socket.once('connect', () => done(new Error(`port already in use (${host}:${port})`)));
      socket.once('error', (err) => {
        if (err && (err.code === 'ECONNREFUSED' || err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH')) {
          done(null);
          return;
        }
        done(err);
      });
      socket.setTimeout(TIMEOUTS.portProbeMs, () => done(null));
      socket.connect(port, host);
    });
  });
}

function killProcessGroupBestEffort(child) {
  if (!child || child.killed) return;
  const pid = child.pid;
  if (!pid) return;
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
}

function startServer() {
  const child = spawn('npm', ['--prefix', 'server', 'run', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(SERVER_PORT) },
    detached: true,
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
      const res = await fetchWithTimeout(`${BASE}/health`, TIMEOUTS.fetchMs);
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

async function main() {
  if (!(await hasNonEmptyDevDb())) {
    process.stdout.write(`MISSING_DEV_DATA: run ${BOOTSTRAP_CMD}\n`);
    process.exitCode = 2;
    return;
  }

  await assertPortFree('127.0.0.1', SERVER_PORT);

  const { child } = startServer();

  try {
    await withTimeout('overall', TIMEOUTS.overallMs, async () => {
      await withTimeout('health', TIMEOUTS.healthMs, async () => {
        await waitForHealth(TIMEOUTS.healthMs);
      });

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
    });
  } catch (err) {
    if (err && (err.code === 'MISSING_DEV_DATA' || String(err.message || '').startsWith('MISSING_DEV_DATA:'))) {
      process.stdout.write(`${String(err.message || err)}\n`);
      process.exitCode = 2;
      return;
    }
    throw err;
  } finally {
    killProcessGroupBestEffort(child);
    await delay(300);

    if (child?.pid) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
      }
    }
  }
}

main()
  .then(() => {
    process.exit(process.exitCode ?? 0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(String(err?.stack || err));
    process.exit(1);
  });
