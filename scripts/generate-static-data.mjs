#!/usr/bin/env node
/**
 * generate-static-data.mjs
 * ========================
 * Reads the loaded SQLite database (via Prisma) and generates static JSON files
 * in public/data/ for offline-first fallback. These files mirror the V1 API
 * response shapes exactly, so the frontend can seamlessly fall back to them
 * when the server is unavailable.
 *
 * Generated files:
 *   public/data/basho-index.json           — array of basho IDs (descending)
 *   public/data/rikishi-directory.json      — array of all rikishi basics
 *   public/data/standings/{bashoId}/{Div}.json — per-division standings
 *   public/data/bouts/{bashoId}/{Div}.json  — per-division bout results
 *   public/data/meta.json                   — generation metadata
 *
 * Usage:
 *   node scripts/generate-static-data.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SERVER_DIR = path.join(ROOT, 'server');
const OUTPUT_DIR = path.join(ROOT, 'public', 'data');

// Division names exactly as stored in SQLite (lowercase)
const DIVISIONS = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];
// Title-cased for file paths (matches how pages pass them to the API)
const DIVISION_DISPLAY = {
  makuuchi: 'Makuuchi', juryo: 'Juryo', makushita: 'Makushita',
  sandanme: 'Sandanme', jonidan: 'Jonidan', jonokuchi: 'Jonokuchi',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function loadEnv(filePath) {
  try {
    const text = readFileSync(filePath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch { /* ignore */ }
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, JSON.stringify(data), 'utf8');
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv(path.join(ROOT, '.env'));
  loadEnv(path.join(SERVER_DIR, '.env'));

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = `file:${path.join(SERVER_DIR, 'prisma', 'dev.db')}`;
  }

  console.log('🏗️  Generating static data from SQLite...');
  console.log(`   Output directory: ${OUTPUT_DIR}`);

  const mod = await import(
    path.join(SERVER_DIR, 'node_modules', '@prisma', 'client', 'index.js')
  );
  const prisma = new mod.PrismaClient();

  try {
    // ── 1. Basho Index ────────────────────────────────────────────────────
    const bashoRows = await prisma.basho.findMany({
      select: { bashoId: true },
      orderBy: { bashoId: 'desc' },
    });
    const bashoIds = bashoRows.map(b => b.bashoId);
    writeJson(path.join(OUTPUT_DIR, 'basho-index.json'), bashoIds);
    console.log(`   ✅ basho-index.json — ${bashoIds.length} basho`);

    // ── 2. Rikishi Directory ──────────────────────────────────────────────
    const rikishiRows = await prisma.rikishi.findMany({
      select: {
        rikishiId: true, shikona: true, heya: true,
        heightCm: true, weightKg: true, nationality: true,
      },
      orderBy: { shikona: 'asc' },
    });

    const rikishiDirectory = [];
    for (const r of rikishiRows) {
      const latestEntry = await prisma.banzukeEntry.findFirst({
        where: { rikishiId: r.rikishiId },
        orderBy: { bashoId: 'desc' },
        select: { bashoId: true, division: true, rankLabel: true, rankValue: true, side: true },
      });
      rikishiDirectory.push({
        rikishiId: r.rikishiId,
        shikona: r.shikona,
        heya: r.heya,
        heightCm: r.heightCm,
        weightKg: r.weightKg,
        nationality: r.nationality,
        currentRank: latestEntry?.rankLabel || (latestEntry ? `${latestEntry.division} ${latestEntry.rankValue}` : null),
        currentDivision: latestEntry?.division ?? null,
        lastBasho: latestEntry?.bashoId ?? null,
      });
    }
    writeJson(path.join(OUTPUT_DIR, 'rikishi-directory.json'), rikishiDirectory);
    console.log(`   ✅ rikishi-directory.json — ${rikishiDirectory.length} rikishi`);

    // ── 3. Per-Division Standings + Bouts ─────────────────────────────────
    let standingsCount = 0;
    let boutsCount = 0;

    for (const bashoId of bashoIds) {
      for (const division of DIVISIONS) {
        const entries = await prisma.banzukeEntry.findMany({
          where: { bashoId, division },
          include: { rikishi: { select: { shikona: true, heya: true } } },
        });
        if (entries.length === 0) continue;

        const bouts = await prisma.bout.findMany({
          where: { bashoId, division },
        });

        // Kimarite breakdown per winner
        const kimariteByRikishi = {};
        for (const bout of bouts) {
          if (!bout.winnerRikishiId) continue;
          if (!kimariteByRikishi[bout.winnerRikishiId]) kimariteByRikishi[bout.winnerRikishiId] = {};
          const kim = bout.kimariteId || 'unknown';
          kimariteByRikishi[bout.winnerRikishiId][kim] = (kimariteByRikishi[bout.winnerRikishiId][kim] || 0) + 1;
        }

        // Win/loss per rikishi
        const winsLosses = {};
        for (const bout of bouts) {
          const { eastRikishiId, westRikishiId, winnerRikishiId } = bout;
          if (!winsLosses[eastRikishiId]) winsLosses[eastRikishiId] = { wins: 0, losses: 0 };
          if (!winsLosses[westRikishiId]) winsLosses[westRikishiId] = { wins: 0, losses: 0 };
          if (winnerRikishiId === eastRikishiId) {
            winsLosses[eastRikishiId].wins++;
            winsLosses[westRikishiId].losses++;
          } else if (winnerRikishiId === westRikishiId) {
            winsLosses[westRikishiId].wins++;
            winsLosses[eastRikishiId].losses++;
          }
        }

        // Build standings array (mirrors V1 API response shape)
        const standings = entries.map(entry => {
          const rec = winsLosses[entry.rikishiId] || { wins: 0, losses: 0 };
          const total = rec.wins + rec.losses;
          const kimBreak = kimariteByRikishi[entry.rikishiId] || {};
          return {
            rikishiId: entry.rikishiId,
            shikona: entry.rikishi?.shikona || entry.rikishiId,
            rank: entry.rankLabel || `${entry.division} ${entry.rankValue}`,
            wins: rec.wins,
            losses: rec.losses,
            winPercentage: total > 0 ? +(rec.wins / total).toFixed(4) : 0,
            kimariteBreakdown: Object.entries(kimBreak)
              .map(([kimariteId, count]) => ({ kimariteId, count }))
              .sort((a, b) => b.count - a.count),
          };
        }).sort((a, b) => b.wins - a.wins || a.losses - b.losses);

        const displayDiv = DIVISION_DISPLAY[division];
        writeJson(path.join(OUTPUT_DIR, 'standings', bashoId, `${displayDiv}.json`), standings);
        standingsCount++;

        // Bout results
        const boutResults = bouts.map(b => ({
          boutId: b.boutId,
          bashoId: b.bashoId,
          division: b.division,
          day: b.day,
          eastId: b.eastRikishiId,
          westId: b.westRikishiId,
          winnerId: b.winnerRikishiId,
          kimariteId: b.kimariteId,
        }));

        if (boutResults.length > 0) {
          writeJson(path.join(OUTPUT_DIR, 'bouts', bashoId, `${displayDiv}.json`), boutResults);
          boutsCount++;
        }
      }
    }
    console.log(`   ✅ standings/ — ${standingsCount} division files`);
    console.log(`   ✅ bouts/ — ${boutsCount} division files`);

    // ── 4. Top Rivalries (head-to-head for Makuuchi/Juryo wrestlers) ─────
    console.log('   ⏳ Computing top rivalries...');
    const topDivisionRikishi = rikishiDirectory.filter(
      r => r.currentDivision === 'makuuchi' || r.currentDivision === 'juryo'
    );
    // Build H2H data from Bout table for all top-division pairs
    const h2hMap = new Map(); // key = "a::b" (sorted), value = { a, b, aWins, bWins, total, lastBasho }
    const topIds = new Set(topDivisionRikishi.map(r => r.rikishiId));
    const shikonaMap = new Map(rikishiDirectory.map(r => [r.rikishiId, r.shikona]));
    const heyaMap = new Map(rikishiDirectory.map(r => [r.rikishiId, r.heya]));

    // Query all bouts involving top-division rikishi
    const topBouts = await prisma.bout.findMany({
      where: {
        OR: [
          { eastRikishiId: { in: [...topIds] } },
          { westRikishiId: { in: [...topIds] } },
        ],
      },
      select: {
        eastRikishiId: true,
        westRikishiId: true,
        winnerRikishiId: true,
        bashoId: true,
      },
    });

    for (const bout of topBouts) {
      const { eastRikishiId: e, westRikishiId: w, winnerRikishiId: winner, bashoId } = bout;
      if (!topIds.has(e) || !topIds.has(w)) continue;
      const [a, b] = e < w ? [e, w] : [w, e];
      const key = `${a}::${b}`;
      let rec = h2hMap.get(key);
      if (!rec) {
        rec = { a, b, aWins: 0, bWins: 0, total: 0, lastBasho: '' };
        h2hMap.set(key, rec);
      }
      rec.total++;
      if (winner === a) rec.aWins++;
      else if (winner === b) rec.bWins++;
      if (bashoId > rec.lastBasho) rec.lastBasho = bashoId;
    }

    // Write top rivalries (pairs with >= 3 bouts, sorted by total desc)
    const rivalries = [...h2hMap.values()]
      .filter(r => r.total >= 3)
      .sort((a, b) => b.total - a.total)
      .slice(0, 500)
      .map(r => ({
        rikishiA: r.a,
        shikonaA: shikonaMap.get(r.a) || r.a,
        heyaA: heyaMap.get(r.a) || null,
        rikishiB: r.b,
        shikonaB: shikonaMap.get(r.b) || r.b,
        heyaB: heyaMap.get(r.b) || null,
        totalMatches: r.total,
        aWins: r.aWins,
        bWins: r.bWins,
        closeness: r.total > 0 ? +(1 - Math.abs(r.aWins - r.bWins) / r.total).toFixed(4) : 0,
        lastBasho: r.lastBasho,
      }));
    writeJson(path.join(OUTPUT_DIR, 'rivalries.json'), rivalries);
    console.log(`   ✅ rivalries.json — ${rivalries.length} rivalry pairs`);

    // Also write individual H2H files for the top pairs
    let h2hFileCount = 0;
    for (const r of rivalries.slice(0, 200)) {
      const [lo, hi] = r.rikishiA < r.rikishiB ? [r.rikishiA, r.rikishiB] : [r.rikishiB, r.rikishiA];
      writeJson(path.join(OUTPUT_DIR, 'head-to-head', `${lo}_${hi}.json`), {
        rikishiA: lo,
        rikishiB: hi,
        totalMatches: r.totalMatches,
        rikishiAWins: lo === r.rikishiA ? r.aWins : r.bWins,
        rikishiBWins: lo === r.rikishiA ? r.bWins : r.aWins,
        lastMatch: r.lastBasho ? { bashoId: r.lastBasho } : null,
      });
      h2hFileCount++;
    }
    console.log(`   ✅ head-to-head/ — ${h2hFileCount} pair files`);

    // ── 5. Leaderboard data (per-basho, per-division standings) ──────────
    // Generate a leaderboard index from the most recent basho standings
    // This replaces the legacy EntityRecord-based leaderboard
    const recentBashoIds = bashoIds.slice(0, 6); // last 6 tournaments
    const leaderboardBasho = [];
    for (const bid of recentBashoIds) {
      const divEntries = {};
      for (const division of ['makuuchi', 'juryo']) {
        const displayDiv = DIVISION_DISPLAY[division];
        const standingsPath = path.join(OUTPUT_DIR, 'standings', bid, `${displayDiv}.json`);
        try {
          const data = JSON.parse(readFileSync(standingsPath, 'utf8'));
          divEntries[displayDiv] = data;
        } catch { /* file may not exist for this basho/division */ }
      }
      if (Object.keys(divEntries).length > 0) {
        leaderboardBasho.push({ bashoId: bid, divisions: divEntries });
      }
    }
    writeJson(path.join(OUTPUT_DIR, 'leaderboard.json'), leaderboardBasho);
    console.log(`   ✅ leaderboard.json — ${leaderboardBasho.length} basho × Makuuchi+Juryo`);

    // ── 6. Metadata ───────────────────────────────────────────────────────
    writeJson(path.join(OUTPUT_DIR, 'meta.json'), {
      generatedAt: new Date().toISOString(),
      bashoCount: bashoIds.length,
      rikishiCount: rikishiDirectory.length,
      standingsFiles: standingsCount,
      boutsFiles: boutsCount,
      rivalryCount: rivalries.length,
      h2hFiles: h2hFileCount,
      leaderboardBasho: leaderboardBasho.length,
      divisions: DIVISIONS,
      dataSource: 'pipeline-build-canonical',
    });
    console.log(`   ✅ meta.json`);
    console.log(`\n🎉 Static data generation complete!`);
    console.log(`   Total files: ${2 + standingsCount + boutsCount + 1 + 1 + h2hFileCount + 1}`);

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('❌ Static data generation failed:', err);
  process.exit(1);
});
