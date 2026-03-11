import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { DivisionStandingRow } from '../../../shared/api/v1';

type Props = {
  rows: DivisionStandingRow[];
  bashoId: string;
};

type Upset = {
  rikishiId: string;
  shikona: string;
  rank: string;
  wins: number;
  losses: number;
  expectedRankOrder: number;
  actualRankOrder: number;
  upsetMagnitude: number;
};

/**
 * Parse a rank string into a numeric order (lower = higher rank).
 * Examples: "Yokozuna 1 East" → ~1, "Maegashira 15 West" → ~45
 */
function rankToOrder(rank: string): number {
  const r = rank.toLowerCase();

  // Named ranks
  if (r.includes('yokozuna')) return 1;
  if (r.includes('ozeki')) return 5;
  if (r.includes('sekiwake')) return 10;
  if (r.includes('komusubi')) return 14;

  // Maegashira — extract number
  const mMatch = r.match(/maegashira\s*(\d+)/);
  if (mMatch) {
    const num = parseInt(mMatch[1], 10);
    const side = r.includes('west') ? 0.5 : 0;
    return 18 + num * 2 + side;
  }

  // Juryo style
  const jMatch = r.match(/juryo\s*(\d+)/);
  if (jMatch) {
    return 60 + parseInt(jMatch[1], 10) * 2;
  }

  // Fallback: use string position as rough ordering
  return 100;
}

export default function UpsetList({ rows, bashoId }: Props) {
  const upsets = useMemo(() => {
    if (rows.length < 5) return [];

    // Sort by rank (expected order)
    const ranked = rows.map((row, idx) => ({
      ...row,
      rankOrder: rankToOrder(row.rank),
      originalIndex: idx,
    }));

    ranked.sort((a, b) => a.rankOrder - b.rankOrder);

    // Sort by wins (actual performance)
    const byWins = [...ranked].sort((a, b) => b.wins - a.wins || a.rankOrder - b.rankOrder);

    const results: Upset[] = [];

    for (let perfIdx = 0; perfIdx < byWins.length; perfIdx++) {
      const wrestler = byWins[perfIdx];
      // Find their expected rank position
      const expectedIdx = ranked.findIndex((r) => r.rikishiId === wrestler.rikishiId);

      // An "upset" is when a lower-ranked wrestler finished significantly higher
      const magnitude = expectedIdx - perfIdx;
      if (magnitude >= 5 && wrestler.wins >= 8) {
        results.push({
          rikishiId: wrestler.rikishiId,
          shikona: wrestler.shikona,
          rank: wrestler.rank,
          wins: wrestler.wins,
          losses: wrestler.losses,
          expectedRankOrder: expectedIdx + 1,
          actualRankOrder: perfIdx + 1,
          upsetMagnitude: magnitude,
        });
      }
    }

    return results
      .sort((a, b) => b.upsetMagnitude - a.upsetMagnitude)
      .slice(0, 8);
  }, [rows]);

  if (!upsets.length) return null;

  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="font-display text-xl font-bold tracking-tight text-white">🔥 Notable Upsets</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        Lower-ranked wrestlers who significantly outperformed expectations.
      </p>

      <div className="mt-3 space-y-2">
        {upsets.map((upset) => (
          <Link
            key={upset.rikishiId}
            to={`/rikishi/${encodeURIComponent(upset.rikishiId)}`}
            className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-red-600"
          >
            <div>
              <div className="font-semibold text-zinc-100">{upset.shikona}</div>
              <div className="text-xs text-zinc-500">{upset.rank}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-emerald-400">{upset.wins}-{upset.losses}</div>
              <div className="text-xs text-zinc-500">
                Ranked #{upset.expectedRankOrder} → Finished #{upset.actualRankOrder}
                <span className="ml-1 text-amber-400">▲{upset.upsetMagnitude}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
