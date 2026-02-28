#!/usr/bin/env node
import { spawn } from 'node:child_process';

const DEFAULT_BASE_URL = process.env.DOMAIN_API_BASE_URL || 'http://127.0.0.1:8787';
const VERIFY_PORT = Number.parseInt(process.env.DOMAIN_API_VERIFY_PORT || '8791', 10);

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function isHealthy(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForHealthy(baseUrl, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isHealthy(baseUrl)) return true;
    await sleep(300);
  }
  return false;
}

async function hasDomainRoute(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/domain/rikishi?limit=1`);
    return res.status !== 404;
  } catch {
    return false;
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) ${url}\n${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  let serverProcess = null;
  let baseUrl = DEFAULT_BASE_URL;

  try {
    let healthy = await isHealthy(baseUrl);
    let hasRoute = healthy ? await hasDomainRoute(baseUrl) : false;

    if (!healthy || !hasRoute) {
      baseUrl = `http://127.0.0.1:${VERIFY_PORT}`;
      serverProcess = spawn('npm', ['--prefix', 'server', 'run', 'dev'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'dev-token',
          PORT: String(VERIFY_PORT),
        },
      });

      serverProcess.stdout.on('data', (chunk) => {
        process.stdout.write(`[server] ${String(chunk)}`);
      });
      serverProcess.stderr.on('data', (chunk) => {
        process.stderr.write(`[server] ${String(chunk)}`);
      });

      healthy = await waitForHealthy(baseUrl, 12000);
      if (!healthy) {
        throw new Error('Server did not become healthy in time');
      }

      hasRoute = await hasDomainRoute(baseUrl);
      if (!hasRoute) {
        throw new Error('Domain route is unavailable on verification server');
      }
    }

    const list = await fetchJson(`${baseUrl}/api/domain/rikishi?limit=5`);
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('Expected non-empty array from /api/domain/rikishi?limit=5');
    }

    const firstId = String(list[0]?.rikishiId || '').trim();
    if (!firstId) {
      throw new Error('First rikishi row is missing rikishiId');
    }

    const detail = await fetchJson(`${baseUrl}/api/domain/rikishi/${encodeURIComponent(firstId)}`);

    process.stdout.write(`${JSON.stringify({
      ok: true,
      baseUrl,
      firstId,
      listCount: list.length,
      detail,
    }, null, 2)}\n`);
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  process.stderr.write(`${String(err?.stack || err)}\n`);
  process.exit(1);
});
