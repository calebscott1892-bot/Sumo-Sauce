#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const BACKEND_PORT = 8790;
function parsePortArg(argv) {
  const portFlagIndex = argv.indexOf('--port');
  if (portFlagIndex >= 0) {
    const value = Number.parseInt(argv[portFlagIndex + 1] || '', 10);
    if (Number.isInteger(value) && value > 0) return value;
  }

  const positional = Number.parseInt(argv[2] || '', 10);
  if (Number.isInteger(positional) && positional > 0) return positional;

  return 5173;
}

const FRONTEND_PORT = parsePortArg(process.argv);
const BACKEND_BASE = `http://127.0.0.1:${BACKEND_PORT}`;
const FRONTEND_BASE = `http://127.0.0.1:${FRONTEND_PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeoutMs = 2000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function isUp(url) {
  try {
    const res = await fetchWithTimeout(url, 2000);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitUntilUp(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isUp(url)) return true;
    await sleep(250);
  }
  return false;
}

function spawnLogged(cmd, args, options = {}) {
  const child = spawn(cmd, args, {
    ...options,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk) => process.stderr.write(String(chunk)));
  child.stderr?.on('data', (chunk) => process.stderr.write(String(chunk)));
  return child;
}

async function main() {
  let backendChild = null;
  let frontendChild = null;

  const checks = {
    backendHealth: false,
    frontendUp: false,
    page200: false,
    markers: false,
    comparePage200: false,
    compareMarkers: false,
  };

  try {
    const backendHealthUrl = `${BACKEND_BASE}/api/health`;
    const frontendHealthUrl = `${FRONTEND_BASE}/`;

    const backendAlreadyUp = await isUp(backendHealthUrl);
    if (!backendAlreadyUp) {
      backendChild = spawnLogged('npm', ['run', 'api:dev'], {
        cwd: '/Users/belacttocs/Downloads/SumoWatch',
        env: {
          ...process.env,
          PORT: String(BACKEND_PORT),
          ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'dev-token',
        },
      });
    }

    checks.backendHealth = await waitUntilUp(backendHealthUrl, 30000);
    if (!checks.backendHealth) {
      throw new Error('Backend did not become healthy');
    }

    const frontendAlreadyUp = await isUp(frontendHealthUrl);
    if (!frontendAlreadyUp) {
      frontendChild = spawnLogged('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(FRONTEND_PORT), '--strictPort'], {
        cwd: '/Users/belacttocs/Downloads/SumoWatch',
        env: {
          ...process.env,
        },
      });
    }

    checks.frontendUp = await waitUntilUp(frontendHealthUrl, 45000);
    if (!checks.frontendUp) {
      throw new Error('Frontend did not become healthy');
    }

    if (!(await isUp(backendHealthUrl))) {
      if (!backendChild) {
        backendChild = spawnLogged('npm', ['run', 'api:dev'], {
          cwd: '/Users/belacttocs/Downloads/SumoWatch',
          env: {
            ...process.env,
            PORT: String(BACKEND_PORT),
            ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'dev-token',
          },
        });
      }
      checks.backendHealth = await waitUntilUp(backendHealthUrl, 30000);
      if (!checks.backendHealth) {
        throw new Error('Backend became unavailable before browser checks');
      }
    }

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      if (!(await isUp(backendHealthUrl))) {
        if (!backendChild) {
          backendChild = spawnLogged('npm', ['run', 'api:dev'], {
            cwd: '/Users/belacttocs/Downloads/SumoWatch',
            env: {
              ...process.env,
              PORT: String(BACKEND_PORT),
              ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'dev-token',
            },
          });
        }
        checks.backendHealth = await waitUntilUp(backendHealthUrl, 30000);
        if (!checks.backendHealth) throw new Error('Backend unavailable for rikishi page checks');
      }

      const response = await page.goto(`${FRONTEND_BASE}/rikishi/rks_0001`, {
        waitUntil: 'domcontentloaded',
      });

      checks.page200 = response?.status() === 200;
      if (!checks.page200) {
        throw new Error('Page did not return HTTP 200');
      }

      const markers = [
        'data-testid="rikishi-page"',
        'data-testid="profile-header"',
        'data-testid="rank-progression"',
        'data-testid="career-table"',
        'data-testid="kimarite-chart"',
      ];

      await page.waitForSelector('[data-testid="rikishi-page"]', { timeout: 20000 });
      const html = await page.content();
      checks.markers = markers.every((marker) => html.includes(marker));
      if (!checks.markers) {
        throw new Error('Expected stable HTML markers were not found');
      }

      if (!(await isUp(backendHealthUrl))) {
        if (!backendChild) {
          backendChild = spawnLogged('npm', ['run', 'api:dev'], {
            cwd: '/Users/belacttocs/Downloads/SumoWatch',
            env: {
              ...process.env,
              PORT: String(BACKEND_PORT),
              ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'dev-token',
            },
          });
        }
        checks.backendHealth = await waitUntilUp(backendHealthUrl, 30000);
        if (!checks.backendHealth) throw new Error('Backend unavailable for compare page checks');
      }

      const compareResponse = await page.goto(`${FRONTEND_BASE}/compare/rks_0001/rks_0002`, {
        waitUntil: 'domcontentloaded',
      });

      checks.comparePage200 = compareResponse?.status() === 200;
      if (!checks.comparePage200) {
        throw new Error('Compare page did not return HTTP 200');
      }

      await page.waitForSelector('text=Kimarite', { timeout: 20000 });
      const compareHtml = (await page.content()).toLowerCase();
      const compareMarkers = ['Head-to-head', 'Recent form', 'Kimarite'];
      checks.compareMarkers = compareMarkers.every((marker) => compareHtml.includes(marker.toLowerCase()));
      if (!checks.compareMarkers) {
        throw new Error('Expected compare page markers were not found');
      }
    } finally {
      await browser.close();
    }

    process.stdout.write(`${JSON.stringify({ ok: true, checks })}\n`);
  } catch (err) {
    if (err && typeof err === 'object') {
      err.checks = checks;
    }
    throw err;
  } finally {
    if (frontendChild) frontendChild.kill('SIGTERM');
    if (backendChild) backendChild.kill('SIGTERM');
  }

  return checks;
}

main().catch((err) => {
  const checks = err?.checks && typeof err.checks === 'object'
    ? {
        backendHealth: Boolean(err.checks.backendHealth),
        frontendUp: Boolean(err.checks.frontendUp),
        page200: Boolean(err.checks.page200),
        markers: Boolean(err.checks.markers),
        comparePage200: Boolean(err.checks.comparePage200),
        compareMarkers: Boolean(err.checks.compareMarkers),
      }
    : {
        backendHealth: false,
        frontendUp: false,
        page200: false,
        markers: false,
        comparePage200: false,
        compareMarkers: false,
      };
  process.stdout.write(`${JSON.stringify({ ok: false, checks })}\n`);
  process.exit(1);
});
