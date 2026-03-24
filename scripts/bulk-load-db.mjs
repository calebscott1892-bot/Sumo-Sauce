#!/usr/bin/env node
/**
 * Fast bulk loader: reads canonical JSONL from the latest build and
 * loads directly into SQLite via raw SQL (bypassing Prisma transactions).
 *
 * Usage: node --experimental-strip-types scripts/bulk-load-db.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { writeFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DB_PATH = path.join(ROOT, 'server', 'prisma', 'dev.db');
const BUILDS_DIR = path.join(ROOT, 'data', 'builds');

function findLatestBuild() {
  const dirs = readdirSync(BUILDS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(path.join(BUILDS_DIR, d.name, 'canonical', 'bouts.jsonl')))
    .map(d => d.name);
  if (!dirs.length) throw new Error('No builds found');
  // Use the one with the most bouts
  let best = dirs[0];
  let bestCount = 0;
  for (const d of dirs) {
    const boutsPath = path.join(BUILDS_DIR, d, 'canonical', 'bouts.jsonl');
    const count = readFileSync(boutsPath, 'utf8').split('\n').filter(Boolean).length;
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return { buildId: best, boutCount: bestCount };
}

function parseJsonl(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
}

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

function sql(db, query) {
  execSync(`sqlite3 "${db}" "${query.replace(/"/g, '\\"')}"`, { encoding: 'utf8' });
}

function sqlFile(db, filePath) {
  execSync(`sqlite3 "${db}" < "${filePath}"`, { encoding: 'utf8', shell: '/bin/bash' });
}

const { buildId, boutCount } = findLatestBuild();
const canonDir = path.join(BUILDS_DIR, buildId, 'canonical');
console.log(`Build: ${buildId}`);
console.log(`Canonical dir: ${canonDir}`);

// Parse all canonical data
console.log('Parsing canonical data...');
const rikishi = parseJsonl(path.join(canonDir, 'rikishi.jsonl'));
const basho = parseJsonl(path.join(canonDir, 'basho.jsonl'));
const banzuke = parseJsonl(path.join(canonDir, 'banzuke_entries.jsonl'));
const bouts = parseJsonl(path.join(canonDir, 'bouts.jsonl'));
const kimarite = parseJsonl(path.join(canonDir, 'kimarite.jsonl'));

console.log(`Rikishi: ${rikishi.length}`);
console.log(`Basho: ${basho.length}`);
console.log(`Banzuke: ${banzuke.length}`);
console.log(`Bouts: ${bouts.length}`);
console.log(`Kimarite: ${kimarite.length}`);

// Generate SQL
console.log('Generating bulk SQL...');
const sqlStatements = [];
sqlStatements.push('PRAGMA journal_mode=WAL;');
sqlStatements.push('PRAGMA synchronous=NORMAL;');
sqlStatements.push('BEGIN TRANSACTION;');

// Clear existing data
sqlStatements.push('DELETE FROM SourceRef;');
sqlStatements.push('DELETE FROM Bout;');
sqlStatements.push('DELETE FROM BanzukeEntry;');
sqlStatements.push('DELETE FROM Kimarite;');
sqlStatements.push('DELETE FROM Basho;');
sqlStatements.push('DELETE FROM Rikishi;');
sqlStatements.push('DELETE FROM BuildSnapshot;');
sqlStatements.push('DELETE FROM Build;');

// Insert Build record
sqlStatements.push(`INSERT INTO Build (buildId, schemaVersion, pipelineVersion, manifestSha256, status, createdAt) VALUES (${esc(buildId)}, '0.4.0', '0.4.0', ${esc(buildId)}, 'SUCCESS', datetime('now'));`);

// Insert rikishi
for (const r of rikishi) {
  sqlStatements.push(`INSERT OR REPLACE INTO Rikishi (rikishiId, shikona, heya, birthDate, heightCm, weightKg, nationality, officialImageUrl, imageUrl, updatedBuildId) VALUES (${esc(r.rikishiId)}, ${esc(r.shikona)}, ${esc(r.heya || null)}, ${esc(r.birthDate || null)}, ${r.heightCm != null ? r.heightCm : 'NULL'}, ${r.weightKg != null ? r.weightKg : 'NULL'}, ${esc(r.nationality || null)}, ${esc(r.officialImageUrl || null)}, ${esc(r.imageUrl || null)}, ${esc(buildId)});`);
}

// Insert basho
for (const b of basho) {
  sqlStatements.push(`INSERT OR REPLACE INTO Basho (bashoId, label, updatedBuildId) VALUES (${esc(b.bashoId)}, ${esc(b.label || null)}, ${esc(buildId)});`);
}

// Insert kimarite
for (const k of kimarite) {
  sqlStatements.push(`INSERT OR REPLACE INTO Kimarite (kimariteId, label, updatedBuildId) VALUES (${esc(k.kimariteId)}, ${esc(k.label || null)}, ${esc(buildId)});`);
}

// Helper for banzuke synthetic ID
function banzukeSyntheticId(entityId) {
  return 'bzk_' + createHash('sha256').update(entityId).digest('hex').slice(0, 24);
}

// Insert banzuke entries
for (const be of banzuke) {
  const entityId = `${be.bashoId}:${be.division}:${be.rikishiId}`;
  const id = banzukeSyntheticId(entityId);
  sqlStatements.push(`INSERT OR REPLACE INTO BanzukeEntry (id, bashoId, division, rankValue, side, rikishiId, rankLabel, updatedBuildId) VALUES (${esc(id)}, ${esc(be.bashoId)}, ${esc((be.division || '').toLowerCase())}, ${be.rankValue != null ? be.rankValue : 0}, ${esc((be.side || '').toLowerCase())}, ${esc(be.rikishiId)}, ${esc(be.rankLabel || null)}, ${esc(buildId)});`);
}

// Insert bouts
for (const b of bouts) {
  sqlStatements.push(`INSERT OR REPLACE INTO Bout (boutId, bashoId, division, day, boutNo, eastRikishiId, westRikishiId, winnerRikishiId, kimariteId, updatedBuildId) VALUES (${esc(b.boutId)}, ${esc(b.bashoId)}, ${esc((b.division || '').toLowerCase())}, ${b.day}, ${b.boutNo}, ${esc(b.eastRikishiId)}, ${esc(b.westRikishiId)}, ${esc(b.winnerRikishiId || null)}, ${esc(b.kimariteId || null)}, ${esc(buildId)});`);
}

sqlStatements.push('COMMIT;');

// Write to temp file and execute
const tmpFile = path.join(ROOT, '.bulk-load.sql');
console.log(`Writing ${sqlStatements.length} SQL statements to ${tmpFile}...`);
writeFileSync(tmpFile, sqlStatements.join('\n'), 'utf8');

console.log('Executing bulk load...');
try {
  execSync(`sqlite3 "${DB_PATH}" < "${tmpFile}"`, { encoding: 'utf8', shell: '/bin/bash', maxBuffer: 50 * 1024 * 1024 });
  console.log('Bulk load complete!');
} finally {
  unlinkSync(tmpFile);
}

// Verify
const verifyCount = execSync(`sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM Bout"`, { encoding: 'utf8' }).trim();
const dayDist = execSync(`sqlite3 "${DB_PATH}" "SELECT day, COUNT(*) FROM Bout GROUP BY day ORDER BY day"`, { encoding: 'utf8' }).trim();
console.log(`\nVerification:`);
console.log(`Total bouts in DB: ${verifyCount}`);
console.log(`Day distribution:\n${dayDist}`);
