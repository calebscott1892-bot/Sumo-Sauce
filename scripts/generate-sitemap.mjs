#!/usr/bin/env node
/**
 * generate-sitemap.mjs
 *
 * Generates a static sitemap.xml for SumoWatch.
 * Run after build: node scripts/generate-sitemap.mjs
 *
 * Reads wrestler + basho data to enumerate all indexable routes.
 * Output: dist/sitemap.xml (or public/sitemap.xml for dev).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SITE_URL = process.env.SITE_URL || 'https://sumosauce.app';

// Static routes with their priorities and change frequencies
const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/basho', priority: '0.9', changefreq: 'daily' },
  { path: '/rikishi', priority: '0.9', changefreq: 'daily' },
  { path: '/analytics', priority: '0.8', changefreq: 'weekly' },
  { path: '/analytics/kimarite', priority: '0.7', changefreq: 'weekly' },
  { path: '/analytics/eras', priority: '0.7', changefreq: 'weekly' },
  { path: '/rivalries', priority: '0.8', changefreq: 'weekly' },
  { path: '/leaderboard', priority: '0.7', changefreq: 'daily' },
  { path: '/timeline', priority: '0.6', changefreq: 'monthly' },
  { path: '/search', priority: '0.5', changefreq: 'weekly' },
];

function loadJson(relPath) {
  const absPath = resolve(ROOT, relPath);
  if (!existsSync(absPath)) return [];
  try {
    return JSON.parse(readFileSync(absPath, 'utf-8'));
  } catch {
    console.warn(`[sitemap] Could not parse ${relPath}`);
    return [];
  }
}

function xmlEscape(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urlEntry(loc, priority = '0.5', changefreq = 'weekly') {
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function generate() {
  const entries = [];

  // Static routes
  for (const route of STATIC_ROUTES) {
    entries.push(urlEntry(`${SITE_URL}${route.path}`, route.priority, route.changefreq));
  }

  // Dynamic rikishi routes
  const wrestlers = loadJson('src/data/wrestlers.json');
  if (Array.isArray(wrestlers)) {
    for (const w of wrestlers) {
      const id = w.id || w.rikishiId;
      if (id) {
        entries.push(urlEntry(`${SITE_URL}/rikishi/${encodeURIComponent(id)}`, '0.6', 'weekly'));
      }
    }
  }

  // Dynamic basho routes
  const bashoRecords = loadJson('src/data/basho_records.json');
  const bashoIds = new Set();
  if (Array.isArray(bashoRecords)) {
    for (const b of bashoRecords) {
      const id = b.bashoId || b.id;
      if (id && !bashoIds.has(id)) {
        bashoIds.add(id);
        entries.push(urlEntry(`${SITE_URL}/basho/${encodeURIComponent(id)}`, '0.6', 'monthly'));
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  // Write to dist/ if it exists (post-build), otherwise public/
  const distDir = resolve(ROOT, 'dist');
  const outDir = existsSync(distDir) ? distDir : resolve(ROOT, 'public');
  const outPath = resolve(outDir, 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`[sitemap] Generated ${entries.length} URLs → ${outPath}`);
}

generate();
