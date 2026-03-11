import { Link } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { trackGlobalStatsView } from '@/utils/analytics';
import { useQuery } from '@tanstack/react-query';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import { PremiumPageHeader } from '@/components/ui/premium';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { getRikishiDirectory, getCareerTimeline } from '@/pages/rikishi/api';
import { getDivisionStandings } from '@/pages/basho/api';
import { recentBashoIds, bashoTournamentName, bashoDisplayName, parseBashoId } from '@/utils/basho';
import DivisionStrengthChart from '@/components/analytics/DivisionStrengthChart';
import type { Division, DivisionStandingRow, TimelineItem } from '../../shared/api/v1';

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-amber-700 bg-amber-950/20' : 'border-white/[0.06] bg-white/[0.02]'}`}>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${highlight ? 'text-amber-300' : 'text-white'}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5 text-xs text-zinc-200 shadow-lg">
      <div className="font-semibold">{d.label}</div>
      <div>Avg wins: {d.avgWins}</div>
      <div>Wrestlers: {d.wrestlers}</div>
    </div>
  );
}

export default function GlobalStatsPage() {
  useEffect(() => { trackGlobalStatsView(); }, []);

  const recentIds = useMemo(() => recentBashoIds(12), []);

  const directoryQuery = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000,
  });

  const standingsQuery = useQuery({
    queryKey: ['global-stats-standings', recentIds.join(',')],
    queryFn: async () => {
      const responses = await Promise.all(
        recentIds.map((id) =>
          getDivisionStandings(id, 'makuuchi' as Division).catch(() => [] as DivisionStandingRow[])
        )
      );
      return recentIds.map((id, i) => ({ bashoId: id, rows: responses[i] }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const totalRikishi = directoryQuery.data?.length ?? 0;
    const bashoData = standingsQuery.data ?? [];
    const totalBasho = recentIds.length;

    let totalBouts = 0;
    let totalWins = 0;
    let totalWrestlerEntries = 0;
    const kimariteCounts = new Map<string, number>();

    // Per-basho metrics for advanced analytics
    const bashoMetrics: Array<{
      bashoId: string;
      rows: DivisionStandingRow[];
      avgWins: number;
      championWins: number;
      championShikona: string;
      upsetCount: number;
    }> = [];

    // Track per-wrestler stats across basho
    const wrestlerWins = new Map<string, { shikona: string; wins: number; losses: number; bashoCount: number; winPcts: number[] }>();

    for (const basho of bashoData) {
      let bashoTotalUpsets = 0;
      let bestWins = 0;
      let bestShikona = '';

      for (const row of basho.rows) {
        totalBouts += row.wins + row.losses;
        totalWins += row.wins;
        totalWrestlerEntries++;

        for (const kb of row.kimariteBreakdown) {
          kimariteCounts.set(kb.kimariteId, (kimariteCounts.get(kb.kimariteId) || 0) + kb.count);
        }

        // Track individual wrestler stats
        const existing = wrestlerWins.get(row.rikishiId) ?? { shikona: row.shikona, wins: 0, losses: 0, bashoCount: 0, winPcts: [] };
        existing.wins += row.wins;
        existing.losses += row.losses;
        existing.bashoCount++;
        const total = row.wins + row.losses;
        if (total > 0) existing.winPcts.push(row.wins / total);
        existing.shikona = row.shikona;
        wrestlerWins.set(row.rikishiId, existing);

        if (row.wins > bestWins) {
          bestWins = row.wins;
          bestShikona = row.shikona;
        }

        // Simple upset metric: kachi-koshi from bottom half of banzuke
        const banzukeIdx = basho.rows.indexOf(row);
        if (banzukeIdx >= basho.rows.length / 2 && row.wins > row.losses) {
          bashoTotalUpsets++;
        }
      }

      const avg = basho.rows.length > 0
        ? basho.rows.reduce((s, r) => s + r.wins, 0) / basho.rows.length
        : 0;

      bashoMetrics.push({
        bashoId: basho.bashoId,
        rows: basho.rows,
        avgWins: avg,
        championWins: bestWins,
        championShikona: bestShikona,
        upsetCount: bashoTotalUpsets,
      });
    }

    // Divide bouts by 2 since each bout is counted for both wrestlers
    const uniqueBouts = Math.round(totalBouts / 2);
    const avgWinsPerBasho = totalWrestlerEntries > 0
      ? (totalWins / totalWrestlerEntries).toFixed(1)
      : '0.0';

    const topKimarite = Array.from(kimariteCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const bashoChart = bashoData.map((b) => {
      const tournament = bashoTournamentName(b.bashoId);
      const parsed = parseBashoId(b.bashoId);
      const avg = b.rows.length > 0
        ? (b.rows.reduce((s, r) => s + r.wins, 0) / b.rows.length).toFixed(1)
        : '0';
      return {
        bashoId: b.bashoId,
        label: `${tournament} ${parsed?.year ?? ''}`.trim(),
        avgWins: Number(avg),
        wrestlers: b.rows.length,
      };
    }).reverse();

    // Top 10 most successful (highest win rate, min 3 basho)
    const topSuccessful = Array.from(wrestlerWins.entries())
      .filter(([, v]) => v.bashoCount >= 3 && (v.wins + v.losses) > 0)
      .map(([id, v]) => ({
        rikishiId: id,
        shikona: v.shikona,
        winRate: v.wins / (v.wins + v.losses),
        wins: v.wins,
        losses: v.losses,
        bashoCount: v.bashoCount,
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10);

    // Most volatile (highest stddev in win pcts, min 3 basho)
    const stddev = (arr: number[]) => {
      if (arr.length < 2) return 0;
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
    };

    const mostVolatile = Array.from(wrestlerWins.entries())
      .filter(([, v]) => v.bashoCount >= 3 && v.winPcts.length >= 3)
      .map(([id, v]) => ({
        rikishiId: id,
        shikona: v.shikona,
        volatility: stddev(v.winPcts),
        bashoCount: v.bashoCount,
      }))
      .sort((a, b) => b.volatility - a.volatility)
      .slice(0, 5);

    // Most dominant basho (highest champion win count)
    const mostDominant = [...bashoMetrics]
      .filter((b) => b.championWins > 0)
      .sort((a, b) => b.championWins - a.championWins)
      .slice(0, 5);

    // Upset-heavy tournaments
    const upsetHeavy = [...bashoMetrics]
      .filter((b) => b.upsetCount > 0)
      .sort((a, b) => b.upsetCount - a.upsetCount)
      .slice(0, 5);

    return { totalRikishi, totalBasho, uniqueBouts, avgWinsPerBasho, topKimarite, bashoChart, topSuccessful, mostVolatile, mostDominant, upsetHeavy };
  }, [directoryQuery.data, standingsQuery.data, recentIds]);

  const isLoading = directoryQuery.isLoading || standingsQuery.isLoading;

  if (directoryQuery.error || standingsQuery.error) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  return (
    <div data-testid="global-stats-page" className="stagger-children mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title="Sumo Sauce \u2014 Global Analytics"
        description="Overview statistics across the Sumo Sauce dataset \u2014 rikishi counts, bout totals, kimarite distribution, and average wins per basho."
      />

      <PremiumPageHeader
        accentLabel="GLOBAL ANALYTICS"
        title="Global Analytics"
        subtitle="Overview statistics across the Sumo Sauce dataset."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Analytics' },
        ]}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Rikishi" value={stats.totalRikishi.toLocaleString()} />
            <StatCard
              label="Recent Basho"
              value={String(stats.totalBasho)}
              sub="sampled for analytics"
            />
            <StatCard label="Est. Bouts (sampled)" value={stats.uniqueBouts.toLocaleString()} />
            <StatCard
              label="Avg Wins / Entry"
              value={stats.avgWinsPerBasho}
              sub="per wrestler per basho"
            />
          </section>

          {/* Most common kimarite */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="font-display text-xl font-bold tracking-tight text-white">Most Common Kimarite</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {stats.topKimarite.map(([name, count], idx) => (
                <div
                  key={name}
                  className={`rounded-lg border p-3 ${idx === 0 ? 'border-amber-700 bg-amber-950/20' : 'border-white/[0.06] bg-white/[0.02]'}`}
                >
                  <div className={`font-semibold ${idx === 0 ? 'text-amber-300' : 'text-zinc-100'}`}>
                    {name}
                  </div>
                  <div className="text-xs text-zinc-500">{count.toLocaleString()} uses</div>
                </div>
              ))}
            </div>
            <Link
              to="/analytics/kimarite"
              className="mt-3 inline-block text-sm text-red-400 hover:text-red-300"
            >
              View kimarite analytics →
            </Link>
          </section>

          {/* Average wins per basho chart */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="font-display text-xl font-bold tracking-tight text-white">Average Wins per Basho (Makuuchi)</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.bashoChart} margin={{ top: 8, right: 20, left: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="label"
                    stroke="#71717a"
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#71717a" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="avgWins" fill="#ef4444" radius={[4, 4, 0, 0]} animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Division Strength Trends */}
          {(standingsQuery.data ?? []).length >= 2 && (
            <DivisionStrengthChart bashoData={standingsQuery.data ?? []} />
          )}

          {/* Top 10 Most Successful */}
          {stats.topSuccessful.length > 0 && (
            <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h2 className="font-display text-xl font-bold tracking-tight text-white">Top 10 Most Successful</h2>
              <p className="mt-1 text-xs text-zinc-500">Highest win rate (min 3 sampled basho, Makuuchi)</p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm" aria-label="Top 10 most successful rikishi">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.03] text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      <th className="px-2 py-2" scope="col">#</th>
                      <th className="px-2 py-2" scope="col">Rikishi</th>
                      <th className="px-2 py-2" scope="col">Win Rate</th>
                      <th className="px-2 py-2" scope="col">W-L</th>
                      <th className="px-2 py-2" scope="col">Basho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topSuccessful.map((r, idx) => (
                      <tr key={r.rikishiId} className="border-b border-white/[0.04] text-zinc-200 transition-colors hover:bg-white/[0.04]">
                        <td className="px-2 py-2">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <Link to={`/rikishi/${encodeURIComponent(r.rikishiId)}`} className="text-red-300 hover:text-red-200">
                            {r.shikona}
                          </Link>
                        </td>
                        <td className="px-2 py-2 font-semibold text-emerald-400">{(r.winRate * 100).toFixed(1)}%</td>
                        <td className="px-2 py-2">{r.wins}-{r.losses}</td>
                        <td className="px-2 py-2">{r.bashoCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Most Volatile Performers */}
          {stats.mostVolatile.length > 0 && (
            <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h2 className="font-display text-xl font-bold tracking-tight text-white">Most Volatile Performers</h2>
              <p className="mt-1 text-xs text-zinc-500">Highest variation in win percentage across basho</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {stats.mostVolatile.map((r, idx) => (
                  <Link
                    key={r.rikishiId}
                    to={`/rikishi/${encodeURIComponent(r.rikishiId)}`}
                    className={`rounded-lg border p-3 transition-colors hover:border-amber-600 ${idx === 0 ? 'border-amber-700 bg-amber-950/20' : 'border-white/[0.06] bg-white/[0.02]'}`}
                  >
                    <div className={`font-semibold ${idx === 0 ? 'text-amber-300' : 'text-zinc-100'}`}>{r.shikona}</div>
                    <div className="text-xs text-zinc-500">σ = {(r.volatility * 100).toFixed(1)}%</div>
                    <div className="text-xs text-zinc-500">{r.bashoCount} basho</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Most Dominant Basho */}
          {stats.mostDominant.length > 0 && (
            <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h2 className="font-display text-xl font-bold tracking-tight text-white">Most Dominant Basho</h2>
              <p className="mt-1 text-xs text-zinc-500">Tournaments with the highest champion win count</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {stats.mostDominant.map((b, idx) => (
                  <Link
                    key={b.bashoId}
                    to={`/basho/${encodeURIComponent(b.bashoId)}`}
                    className={`rounded-lg border p-3 transition-colors hover:border-emerald-600 ${idx === 0 ? 'border-emerald-700 bg-emerald-950/20' : 'border-white/[0.06] bg-white/[0.02]'}`}
                  >
                    <div className={`font-semibold ${idx === 0 ? 'text-emerald-300' : 'text-zinc-100'}`}>
                      {bashoDisplayName(b.bashoId)}
                    </div>
                    <div className="text-xs text-zinc-500">{b.championShikona} — {b.championWins} wins</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Upset-Heavy Tournaments */}
          {stats.upsetHeavy.length > 0 && (
            <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h2 className="font-display text-xl font-bold tracking-tight text-white">Upset-Heavy Tournaments</h2>
              <p className="mt-1 text-xs text-zinc-500">Basho where lower-ranked wrestlers had the most kachi-koshi</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {stats.upsetHeavy.map((b, idx) => (
                  <Link
                    key={b.bashoId}
                    to={`/basho/${encodeURIComponent(b.bashoId)}`}
                    className={`rounded-lg border p-3 transition-colors hover:border-red-600 ${idx === 0 ? 'border-red-700 bg-red-950/20' : 'border-white/[0.06] bg-white/[0.02]'}`}
                  >
                    <div className={`font-semibold ${idx === 0 ? 'text-red-300' : 'text-zinc-100'}`}>
                      {bashoDisplayName(b.bashoId)}
                    </div>
                    <div className="text-xs text-zinc-500">{b.upsetCount} upsets</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
