#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.vite']);
const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.pdf', '.zip', '.gz', '.db', '.lock', '.map',
]);

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(abs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (SKIP_EXT.has(path.extname(entry.name).toLowerCase())) continue;
    out.push(abs);
  }
  return out;
}

function countMatches(text, regex) {
  const m = text.match(regex);
  return m ? m.length : 0;
}

async function detectDbProvider() {
  const schemaPath = path.join(ROOT, 'server', 'prisma', 'schema.prisma');
  try {
    const src = await readFile(schemaPath, 'utf8');
    const datasourceBlock = src.match(/datasource\s+db\s*\{[\s\S]*?\}/m)?.[0] || src;
    const provider = datasourceBlock.match(/provider\s*=\s*"([^"]+)"/m)?.[1];
    return provider || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function main() {
  const files = await walk(ROOT);

  const patterns = {
    base44: /base44/gi,
    wix: /\bwix\b/gi,
    frogWixCom: /frog\.wix\.com/gi,
  };

  const counts = {
    base44: 0,
    wix: 0,
    frogWixCom: 0,
  };

  for (const abs of files) {
    let text = '';
    try {
      text = await readFile(abs, 'utf8');
    } catch {
      continue;
    }

    counts.base44 += countMatches(text, patterns.base44);
    counts.wix += countMatches(text, patterns.wix);
    counts.frogWixCom += countMatches(text, patterns.frogWixCom);
  }

  const dbProvider = await detectDbProvider();

  console.log(`node_version=${process.version}`);
  console.log(`db_provider=${dbProvider}`);
  console.log(`occurrences.base44=${counts.base44}`);
  console.log(`occurrences.wix=${counts.wix}`);
  console.log(`occurrences.frog.wix.com=${counts.frogWixCom}`);
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
