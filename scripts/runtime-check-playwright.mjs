import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const base = 'https://sumo-sauce.vercel.app';
const routes = [
  '/',
  '/rikishi/12451',
  '/rikishi/3842',
  '/basho/202603',
  '/basho/202603/makuuchi',
  '/leaderboard',
  '/rivalries',
  '/analytics',
  '/stables',
  '/stables/isegahama',
];

const outDir = path.resolve('docs', 'live-audit', 'runtime-check');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const results = {};

for (const route of routes) {
  const full = base + route;
  results[route] = { url: full, requests: [], console: [], errors: [] };

  page.removeAllListeners();

  const reqs = [];

  page.on('console', (msg) => {
    results[route].console.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    results[route].errors.push({ type: 'pageerror', message: String(err?.message || err) });
  });
  page.on('request', (request) => {
    reqs.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), timestamp: Date.now(), status: null });
  });
  page.on('response', async (response) => {
    try {
      const url = response.request().url();
      const status = response.status();
      // link to the most recent matching request entry without status
      for (let i = reqs.length - 1; i >= 0; i--) {
        if (reqs[i].url === url && reqs[i].status === null) {
          reqs[i].status = status;
          reqs[i].statusText = response.statusText();
          break;
        }
      }
    } catch (e) {
      // ignore
    }
  });

  try {
    await page.goto(full, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
  } catch (e) {
    results[route].errors.push({ type: 'navigation', message: String(e?.message || e) });
  }

  // capture additional XHR/fetch that finish shortly after
  await page.waitForTimeout(1500);

  // filter requests of interest
  const interesting = reqs.filter(r => /\/api\//i.test(r.url) || /onrender\.com/i.test(r.url));
  results[route].requests = interesting.map(r => ({ url: r.url, method: r.method, status: r.status, statusText: r.statusText || null, resourceType: r.resourceType }));

  const safeName = route === '/' ? 'home' : route.replace(/[^a-z0-9_-]/gi, '_').replace(/^_+/, '');
  const shotPath = path.join(outDir, `${safeName}.png`);
  try {
    await page.screenshot({ path: shotPath, fullPage: true });
    results[route].screenshot = shotPath;
  } catch (e) {
    results[route].screenshot = null;
  }
}

await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
await browser.close();
console.log('Runtime check complete. Results written to', outDir);