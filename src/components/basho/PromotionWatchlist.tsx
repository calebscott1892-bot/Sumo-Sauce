import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import PromotionPredictionBadge from '@/components/basho/PromotionPredictionBadge';
import type { DivisionStandingRow } from '../../../shared/api/v1';

type Props = {
  rows: DivisionStandingRow[];
  bashoId: string;
  /** Max wrestlers per section */
  limit?: number;
};

type WatchlistEntry = {
  rikishiId: string;
  shikona: string;
  rank: string;
  wins: number;
  losses: number;
  category: 'strong-promotion' | 'mild-promotion' | 'demotion';
};

/**
 * Promotion / demotion watchlist for basho overview pages.
 * Uses the existing promotion heuristic (10+ wins = strong, 8-9 = mild, ≤6 = demotion).
 */
export default function PromotionWatchlist({ rows, bashoId, limit = 8 }: Props) {
  const { promotions, demotions } = useMemo(() => {
    const promo: WatchlistEntry[] = [];
    const demo: WatchlistEntry[] = [];

    for (const row of rows) {
      const total = row.wins + row.losses;
      if (total === 0) continue;

      if (row.wins >= 10) {
        promo.push({
          rikishiId: row.rikishiId,
          shikona: row.shikona,
          rank: row.rank,
          wins: row.wins,
          losses: row.losses,
          category: 'strong-promotion',
        });
      } else if (row.wins >= 8) {
        promo.push({
          rikishiId: row.rikishiId,
          shikona: row.shikona,
          rank: row.rank,
          wins: row.wins,
          losses: row.losses,
          category: 'mild-promotion',
        });
      }

      if (row.wins <= 6 && total >= 10) {
        demo.push({
          rikishiId: row.rikishiId,
          shikona: row.shikona,
          rank: row.rank,
          wins: row.wins,
          losses: row.losses,
          category: 'demotion',
        });
      }
    }

    // Sort: promotions by wins desc, demotions by wins asc
    promo.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
    demo.sort((a, b) => a.wins - b.wins || b.losses - a.losses);

    return {
      promotions: promo.slice(0, limit),
      demotions: demo.slice(0, limit),
    };
  }, [rows, limit]);

  if (promotions.length === 0 && demotions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="mb-4 text-xl font-bold text-white">Promotion & Demotion Watchlist</h2>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Promotion candidates */}
        {promotions.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              Promotion Candidates
            </div>
            <div className="space-y-1.5">
              {promotions.map((entry) => (
                <Link
                  key={entry.rikishiId}
                  to={`/rikishi/${encodeURIComponent(entry.rikishiId)}`}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-colors hover:border-emerald-700 hover:bg-emerald-950/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{entry.rank}</span>
                    <span className="font-medium text-zinc-100">{entry.shikona}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-300">
                      {entry.wins}-{entry.losses}
                    </span>
                    <PromotionPredictionBadge wins={entry.wins} losses={entry.losses} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Demotion risks */}
        {demotions.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-400">
              <TrendingDown className="h-4 w-4" />
              Demotion Risk
            </div>
            <div className="space-y-1.5">
              {demotions.map((entry) => (
                <Link
                  key={entry.rikishiId}
                  to={`/rikishi/${encodeURIComponent(entry.rikishiId)}`}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-colors hover:border-red-700 hover:bg-red-950/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{entry.rank}</span>
                    <span className="font-medium text-zinc-100">{entry.shikona}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-300">
                      {entry.wins}-{entry.losses}
                    </span>
                    <PromotionPredictionBadge wins={entry.wins} losses={entry.losses} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
