import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 5173;
const BASE = `http://${HOST}:${PORT}`;
const API_PORT = 8787;
const API_BASE = `http://127.0.0.1:${API_PORT}/api`;
const API_HEALTH = `http://127.0.0.1:${API_PORT}/api/health`;
const BOOTSTRAP_CMD = 'npm run bootstrap';

const DEV_DB_PATH = new URL('../server/prisma/dev.db', import.meta.url);

const TIMEOUTS = {
  overallMs: 120_000,
  backendHealthMs: 20_000,
  viteReadyMs: 60_000,
  playwrightLaunchMs: 30_000,
  routeGotoMs: 30_000,
  portProbeMs: 800,
};

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

async function assertPortFree(host, port, label) {
  // If we can connect, something is already listening.
  // If we get ECONNREFUSED/timeout, we assume it's free.
  await withTimeout(`port:${label}`, TIMEOUTS.portProbeMs, async () => {
    await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const done = (err) => {
        socket.removeAllListeners();
        socket.destroy();
        if (err) reject(err);
        else resolve();
      };

      socket.once('connect', () => done(new Error(`port:${label} already in use (${host}:${port})`)));
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

function killProcessGroupBestEffort(child, name, logs) {
  if (!child || child.killed) return;
  const pid = child.pid;
  if (!pid) return;

  const tryKill = (targetPid, sig) => {
    try {
      process.kill(targetPid, sig);
      return true;
    } catch (e) {
      if (logs) logs.push(`${name}: kill ${sig} failed: ${String(e?.message || e)}`);
      return false;
    }
  };

  // Prefer killing the whole process group on unix.
  const killedGroup = tryKill(-pid, 'SIGTERM');
  if (!killedGroup) tryKill(pid, 'SIGTERM');
}

function startBackend() {
  const child = spawn('npm', ['--prefix', 'server', 'run', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(API_PORT) },
    detached: true,
  });

  const logs = [];
  const onLine = (line) => {
    logs.push(line);
  };

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (d) => d.split(/\r?\n/).filter(Boolean).forEach(onLine));
  child.stderr.on('data', (d) => d.split(/\r?\n/).filter(Boolean).forEach(onLine));

  return { child, logs };
}

async function waitForBackend(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetchWithTimeout(API_HEALTH, 1000);
      if (res.ok) return;
    } catch {
      // ignore
    }
    await delay(150);
  }
  throw new Error('Timed out waiting for backend to become ready');
}

async function requireDevData() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/auth/me`, 2000);
    if (res.ok) return;
  } catch {
    // ignore
  }
  const err = new Error(`MISSING_DEV_DATA: run ${BOOTSTRAP_CMD}`);
  // @ts-ignore
  err.code = 'MISSING_DEV_DATA';
  throw err;
}

function startVite() {
  const child = spawn('npm', ['run', 'dev', '--', '--host', HOST, '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    detached: true,
  });

  const logs = [];
  const onLine = (line) => {
    logs.push(line);
  };

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (d) => d.split(/\r?\n/).filter(Boolean).forEach(onLine));
  child.stderr.on('data', (d) => d.split(/\r?\n/).filter(Boolean).forEach(onLine));

  return { child, logs };
}

async function waitForServer(logs, timeoutMs = 20000) {
  const start = Date.now();
  let last = '';

  while (Date.now() - start < timeoutMs) {
    if (logs.some((l) => l.includes('Failed to resolve import'))) {
      const first = logs.find((l) => l.includes('Failed to resolve import'));
      throw new Error(`Vite import-resolution failure while starting: ${first}`);
    }

    try {
      const res = await fetchWithTimeout(`${BASE}/`, 1000);
      // Treat any HTTP response as "Vite reachable".
      last = `ok status=${res.status}`;
      return;
    } catch (e) {
      last = `err ${String(e?.message || e)}`;
    }

    await delay(250);
  }

  throw new Error(`Vite not reachable at ${BASE}/ within ${timeoutMs}ms (last=${last})`);
}

async function main() {
  if (!(await hasNonEmptyDevDb())) {
    process.stdout.write(`MISSING_DEV_DATA: run ${BOOTSTRAP_CMD}\n`);
    process.exitCode = 2;
    return;
  }

  await assertPortFree('127.0.0.1', API_PORT, 'backend');
  await assertPortFree(HOST, PORT, 'vite');

  const { child: backendChild, logs: backendLogs } = startBackend();
  const { child, logs: viteLogs } = startVite();
  const vitePollHistory = [];

  try {
    const run = async () => {
      await withTimeout('backendHealth', TIMEOUTS.backendHealthMs, async () => {
        await waitForBackend(TIMEOUTS.backendHealthMs);
      });

      await withTimeout('requireDevData', 10_000, async () => {
        await requireDevData();
      });

      await withTimeout('viteReady', TIMEOUTS.viteReadyMs, async () => {
        const start = Date.now();
        try {
          await waitForServer(viteLogs, TIMEOUTS.viteReadyMs);
          const elapsed = Date.now() - start;
          vitePollHistory.push(`reachable after ${elapsed}ms`);
        } catch (e) {
          vitePollHistory.push(String(e?.message || e));
          throw e;
        }
      });

      const browser = await withTimeout('playwrightLaunch', TIMEOUTS.playwrightLaunchMs, async () => {
        return await chromium.launch();
      });

      const page = await browser.newPage();

      const consoleLines = [];
      const pageErrors = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (msg.type() === 'error' || msg.type() === 'warning') consoleLines.push(text);
      });
      page.on('pageerror', (err) => {
        pageErrors.push(String(err));
      });

      // Visit a minimal set of routes that should exercise core data paths.
      const routes = ['/', '/tournaments', '/forum'];

      for (const route of routes) {
        await withTimeout(`route:${route}`, TIMEOUTS.routeGotoMs, async () => {
          await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.routeGotoMs });
        });
        await delay(1500);
      }

      await browser.close();

      const first20 = consoleLines.slice(0, 20);

      const result = {
        base: BASE,
        routesVisited: routes,
        consoleWarningsOrErrorsFirst20: first20,
        pageErrors,
      };

      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    };

    await withTimeout('overall', TIMEOUTS.overallMs, run);
  } catch (err) {
    const msg = String(err?.message || err);
    const lines = [];
    lines.push(`ERROR verify-runtime ${msg}`);

    lines.push('backendLogsLast50:');
    lines.push(...backendLogs.slice(-50));

    lines.push('viteLogsLast50:');
    lines.push(...viteLogs.slice(-50));

    if (msg.startsWith('phase:viteReady') || msg.includes('Vite not reachable')) {
      lines.push('vitePollHistoryLast10:');
      lines.push(...vitePollHistory.slice(-10));
    }
    process.stderr.write(`${lines.join('\n')}\n`);
    throw err;
  } finally {
    killProcessGroupBestEffort(child, 'vite', viteLogs);
    killProcessGroupBestEffort(backendChild, 'backend', backendLogs);
    await delay(250);

    // Escalate to SIGKILL best-effort.
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
    if (backendChild?.pid) {
      try {
        process.kill(-backendChild.pid, 'SIGKILL');
      } catch {
        try {
          backendChild.kill('SIGKILL');
        } catch {
          // ignore
        }
      }
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(String(err?.stack || err));
  process.exit(1);
});
