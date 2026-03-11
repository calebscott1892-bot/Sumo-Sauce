import { Link, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { getDivisionStandings } from '@/pages/basho/api';
import DivisionGrid from '@/components/basho/DivisionGrid';
import PromotionWatchlist from '@/components/basho/PromotionWatchlist';
import BashoDifficultyCard from '@/components/basho/BashoDifficultyCard';
import BashoStorylines from '@/components/basho/BashoStorylines';
import UpsetList from '@/components/basho/UpsetList';
import BashoNav from '@/components/navigation/BashoNav';
import { bashoDisplayName, bashoTournamentName, bashoLabel, parseBashoId } from '@/utils/basho';
import { isValidBashoId } from '@/utils/security';
import { trackBashoPageView } from '@/utils/analytics';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import CopyLinkButton from '@/components/ui/CopyLinkButton';
import { isFavoriteBasho, toggleFavoriteBasho } from '@/utils/favorites';
import { trackBashoView } from '@/utils/recentlyViewed';
import type { Division, DivisionStandingRow } from '../../shared/api/v1';

const BashoPerformanceChart = lazy(() => import('@/components/basho/BashoPerformanceChart'));

const DIVISIONS: Division[] = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];

/**
 * Detect the yusho winner from a set of standings rows.
 * The champion is the wrestler with the most wins.
 * Tiebreak: lower banzuke index (i.e. higher rank → earlier in the array).
 */
function detectChampion(rows: DivisionStandingRow[]): { rikishiId: string; shikona: string; wins: number; losses: number } | null {
  if (!rows.length) return null;
  let best = rows[0];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].wins > best.wins) {
      best = rows[i];
    }
  }
  return { rikishiId: best.rikishiId, shikona: best.shikona, wins: best.wins, losses: best.losses };
}

export default function BashoOverviewPage() {
  const params = useParams();
  const bashoId = String(params.bashoId || '').trim();

  const isValid = isValidBashoId(bashoId);
  const parsed = parseBashoId(bashoId);

  // Fetch standings for all 6 divisions in parallel
  const queries = useQueries({
    queries: DIVISIONS.map((div) => ({
      queryKey: ['basho-division-standings', bashoId, div],
      queryFn: () => getDivisionStandings(bashoId, div),
      enabled: isValid,
      retry: 1,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const allSettled = queries.every((q) => !q.isLoading);

  const divisionData = useMemo(() => {
    return DIVISIONS.map((div, i) => {
      const q = queries[i];
      const rows = q.data ?? [];
      const champion = rows.length > 0 ? detectChampion(rows) : null;
      return {
        division: div,
        champion,
        wrestlerCount: rows.length,
        loaded: !q.isLoading,
        error: q.error,
        rows,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bashoId, ...queries.map((q) => q.dataUpdatedAt), ...queries.map((q) => q.isLoading)]);

  // Total stats
  const totalWrestlers = divisionData.reduce((sum, d) => sum + d.wrestlerCount, 0);
  const divisionsWithData = divisionData.filter((d) => d.wrestlerCount > 0).length;

  useEffect(() => {
    if (isValid) {
      trackBashoPageView(bashoId, 'overview');
      trackBashoView(bashoId, bashoDisplayName(bashoId));
    }
  }, [bashoId, isValid]);

  if (!isValid) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-zinc-400">
            Invalid basho ID. Expected format: <span className="font-mono text-zinc-300">YYYYMM</span> (e.g. 202401).
          </div>
          <Link className="mt-2 inline-block text-red-400 hover:text-red-300" to="/">← Home</Link>
        </div>
      </div>
    );
  }

  if (queries.some((q) => q.error)) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  const tournamentName = bashoTournamentName(bashoId);
  const label = bashoLabel(bashoId);
  const [isFav, setIsFav] = useState(() => isFavoriteBasho(bashoId));

  return (
    <div data-testid="basho-overview-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      {/* Breadcrumbs */}
      <nav data-testid="breadcrumbs" className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-zinc-400">
          <Link className="text-red-400 hover:text-red-300" to="/">Home</Link>
          <span>/</span>
          <Link className="text-red-400 hover:text-red-300" to="/basho">Basho</Link>
          <span>/</span>
          <span className="text-zinc-200">{bashoId}</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyLinkButton />
          <button
            type="button"
            onClick={() => { toggleFavoriteBasho(bashoId); setIsFav(!isFav); }}
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 transition-colors hover:border-red-600"
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`h-4 w-4 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-zinc-400'}`} />
          </button>
        </div>
      </nav>

      <PageMeta
        title={`SumoWatch \u2014 ${bashoDisplayName(bashoId)}`}
        description={`${tournamentName} ${parsed?.year} basho overview \u2014 champions, division standings, performance charts, and promotion watchlist.`}
      />

      {/* Hero */}
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">BASHO OVERVIEW</span>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl">
            {tournamentName} {parsed?.year}
          </h1>
          <span className="text-sm text-zinc-500">{label}</span>
        </div>
        {allSettled && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-400">
            <span>{totalWrestlers} wrestlers across {divisionsWithData} divisions</span>
          </div>
        )}
      </section>

      {/* Navigation */}
      <BashoNav bashoId={bashoId} division="makuuchi" />

      {/* Basho Difficulty Index */}
      {divisionData[0]?.rows.length > 0 && (
        <BashoDifficultyCard rows={divisionData[0].rows} bashoId={bashoId} />
      )}

      {/* Storylines */}
      {divisionData[0]?.rows.length > 0 && (
        <BashoStorylines rows={divisionData[0].rows} bashoId={bashoId} />
      )}

      {/* Division Grid with champion detection */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-white">Divisions</h2>
        {isLoading && divisionData.every((d) => !d.loaded) ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
            ))}
          </div>
        ) : (
          <DivisionGrid bashoId={bashoId} divisions={divisionData} />
        )}
      </section>

      {/* Makuuchi leaderboard preview */}
      {divisionData[0]?.rows.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Makuuchi Top 10</h2>
            <Link
              to={`/basho/${encodeURIComponent(bashoId)}/makuuchi`}
              className="text-sm text-red-400 hover:text-red-300"
            >
              View full standings →
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm" aria-label="Makuuchi top 10 standings">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-400">
                  <th className="px-2 py-2" scope="col">#</th>
                  <th className="px-2 py-2" scope="col">Rank</th>
                  <th className="px-2 py-2" scope="col">Shikona</th>
                  <th className="px-2 py-2" scope="col">W</th>
                  <th className="px-2 py-2" scope="col">L</th>
                  <th className="px-2 py-2" scope="col">Win %</th>
                </tr>
              </thead>
              <tbody>
                {[...divisionData[0].rows]
                  .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
                  .slice(0, 10)
                  .map((row, idx) => {
                    const pct = row.wins + row.losses > 0
                      ? ((row.wins / (row.wins + row.losses)) * 100).toFixed(1)
                      : '0.0';
                    const isChampion = divisionData[0].champion?.rikishiId === row.rikishiId;
                    return (
                      <tr
                        key={row.rikishiId}
                        className={`border-b border-zinc-800/70 transition-colors duration-150 ${isChampion ? 'bg-amber-950/20 text-amber-200' : 'text-zinc-200 hover:bg-zinc-800/40'}`}
                      >
                        <td className="px-2 py-2">{idx + 1}</td>
                        <td className="px-2 py-2">{row.rank}</td>
                        <td className="whitespace-nowrap px-2 py-2">
                          <Link
                            className={`hover:text-red-200 ${isChampion ? 'text-amber-300 font-semibold' : 'text-red-300'}`}
                            to={`/rikishi/${encodeURIComponent(row.rikishiId)}`}
                          >
                            {row.shikona} {isChampion ? '🏆' : ''}
                          </Link>
                        </td>
                        <td className="px-2 py-2">{row.wins}</td>
                        <td className="px-2 py-2">{row.losses}</td>
                        <td className="px-2 py-2">{pct}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Basho performance chart */}
      {divisionData[0]?.rows.length > 0 && (
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />}>
          <BashoPerformanceChart rows={divisionData[0].rows} limit={20} />
        </Suspense>
      )}

      {/* Promotion / Demotion watchlist */}
      {divisionData[0]?.rows.length > 0 && (
        <PromotionWatchlist rows={divisionData[0].rows} bashoId={bashoId} />
      )}

      {/* Notable upsets */}
      {divisionData[0]?.rows.length > 0 && (
        <UpsetList rows={divisionData[0].rows} bashoId={bashoId} />
      )}

      {/* Data integrity indicator */}
      {allSettled && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-sm">
            {divisionsWithData === 6 ? (
              <>
                <span className="text-emerald-400">✔</span>
                <span className="text-zinc-300">Complete data — all 6 divisions loaded</span>
              </>
            ) : (
              <>
                <span className="text-amber-400">⚠</span>
                <span className="text-zinc-300">
                  Partial data — {divisionsWithData}/6 divisions have standings
                </span>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
