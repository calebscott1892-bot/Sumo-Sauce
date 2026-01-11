import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 5173;
const BASE = `http://${HOST}:${PORT}`;
const API_PORT = 8787;
const API_HEALTH = `http://127.0.0.1:${API_PORT}/api/health`;

function startBackend() {
  const child = spawn('npm', ['--prefix', 'server', 'run', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(API_PORT) },
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
      const res = await fetch(API_HEALTH);
      if (res.ok) return;
    } catch {
      // ignore
    }
    await delay(150);
  }
  throw new Error('Timed out waiting for backend to become ready');
}

function startVite() {
  const child = spawn('npm', ['run', 'dev', '--', '--host', HOST, '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
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
  while (Date.now() - start < timeoutMs) {
    if (logs.some((l) => l.includes(`Local:`) && l.includes(BASE))) return;
    if (logs.some((l) => l.includes('Failed to resolve import'))) {
      const first = logs.find((l) => l.includes('Failed to resolve import'));
      throw new Error(`Vite import-resolution failure while starting: ${first}`);
    }
    await delay(100);
  }
  throw new Error('Timed out waiting for Vite to become ready');
}

async function main() {
  const { child: backendChild } = startBackend();
  const { child, logs: viteLogs } = startVite();

  try {
    await waitForBackend();
    await waitForServer(viteLogs);

    const browser = await chromium.launch();
    const page = await browser.newPage();

    const consoleLines = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[stub]')) consoleLines.push(text);
    });
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    // Visit a minimal set of routes that should exercise stub usage.
    const routes = ['/', '/tournaments', '/forum'];

    for (const route of routes) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await delay(1500);
    }

    // Pull in-memory stub logs if present.
    const windowLogs = await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      const arr = (window.__STUB_LOGS__ || []).slice();
      return arr;
    });

    await browser.close();

    const first20 = consoleLines.slice(0, 20);
    const first20Window = windowLogs.slice(0, 20).map((x) => x?.line).filter(Boolean);

    const result = {
      base: BASE,
      routesVisited: routes,
      stubConsoleLogsFirst20: first20,
      stubWindowLogsFirst20: first20Window,
      pageErrors,
    };

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    child.kill('SIGTERM');
    await delay(250);
    child.kill('SIGKILL');

    backendChild.kill('SIGTERM');
    await delay(250);
    backendChild.kill('SIGKILL');
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(String(err?.stack || err));
  process.exit(1);
});
