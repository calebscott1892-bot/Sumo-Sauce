import { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trackEraAnalyticsView } from '@/utils/analytics';
import { useQuery } from '@tanstack/react-query';
import { Clock, TrendingUp, Award, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { getRikishiDirectory, getCareerTimeline } from '@/pages/rikishi/api';
import { parseBashoId, bashoLabel } from '@/utils/basho';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import type { TimelineItem } from '../../shared/api/v1';

type EraData = {
  decade: string;
  bashoCount: number;
  uniqueRikishi: number;
  avgWinRate: number;
  topPerformers: { id: string; shikona: string; winRate: number; bouts: number }[];
};

function getDecade(bashoId: string): string {
  const parsed = parseBashoId(bashoId);
  if (!parsed) return 'Unknown';
  const decadeStart = Math.floor(parsed.year / 10) * 10;
  return `${decadeStart}s`;
}

export default function EraAnalyticsPage() {
  useEffect(() => { trackEraAnalyticsView(); }, []);

  const directoryQuery = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000,
  });

  // Sample top rikishi for era analysis
  const sampleIds = useMemo(() => {
    if (!directoryQuery.data?.length) return [];
    return directoryQuery.data.slice(0, 50);
  }, [directoryQuery.data]);

  const timelinesQuery = useQuery({
    queryKey: ['era-timelines', sampleIds.map((s) => s.rikishiId).join(',')],
    enabled: sampleIds.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const results: { id: string; shikona: string; timeline: TimelineItem[] }[] = [];
      const batchSize = 10;
      for (let i = 0; i < sampleIds.length; i += batchSize) {
        const batch = sampleIds.slice(i, i + batchSize);
        const batchData = await Promise.all(
          batch.map(async (entry) => {
            try {
              const tl = await getCareerTimeline(entry.rikishiId);
              return { id: entry.rikishiId, shikona: entry.shikona, timeline: tl };
            } catch {
              return { id: entry.rikishiId, shikona: entry.shikona, timeline: [] };
            }
          }),
        );
        results.push(...batchData);
      }
      return results;
    },
  });

  const eraData = useMemo((): EraData[] => {
    if (!timelinesQuery.data) return [];

    const byDecade = new Map<string, {
      bashoIds: Set<string>;
      rikishiIds: Set<string>;
      totalWins: number;
      totalBouts: number;
      performers: Map<string, { shikona: string; wins: number; bouts: number }>;
    }>();

    for (const rikishi of timelinesQuery.data) {
      for (const entry of rikishi.timeline) {
        const decade = getDecade(entry.bashoId);
        if (decade === 'Unknown') continue;

        if (!byDecade.has(decade)) {
          byDecade.set(decade, {
            bashoIds: new Set(),
            rikishiIds: new Set(),
            totalWins: 0,
            totalBouts: 0,
            performers: new Map(),
          });
        }
        const d = byDecade.get(decade)!;
        d.bashoIds.add(entry.bashoId);
        d.rikishiIds.add(rikishi.id);
        const bouts = entry.wins + entry.losses;
        d.totalWins += entry.wins;
        d.totalBouts += bouts;

        const existing = d.performers.get(rikishi.id) ?? { shikona: rikishi.shikona, wins: 0, bouts: 0 };
        existing.wins += entry.wins;
        existing.bouts += bouts;
        d.performers.set(rikishi.id, existing);
      }
    }

    return Array.from(byDecade.entries())
      .map(([decade, data]) => {
        const topPerformers = Array.from(data.performers.entries())
          .map(([id, perf]) => ({
            id,
            shikona: perf.shikona,
            winRate: perf.bouts > 0 ? perf.wins / perf.bouts : 0,
            bouts: perf.bouts,
          }))
          .filter((p) => p.bouts >= 30)
          .sort((a, b) => b.winRate - a.winRate)
          .slice(0, 5);

        return {
          decade,
          bashoCount: data.bashoIds.size,
          uniqueRikishi: data.rikishiIds.size,
          avgWinRate: data.totalBouts > 0 ? data.totalWins / data.totalBouts : 0,
          topPerformers,
        };
      })
      .sort((a, b) => a.decade.localeCompare(b.decade));
  }, [timelinesQuery.data]);

  const chartData = useMemo(() => {
    return eraData.map((era) => ({
      decade: era.decade,
      wrestlers: era.uniqueRikishi,
      basho: era.bashoCount,
      winRate: Number((era.avgWinRate * 100).toFixed(1)),
    }));
  }, [eraData]);

  const isLoading = directoryQuery.isLoading || timelinesQuery.isLoading;

  if (directoryQuery.error || timelinesQuery.error) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title="Sumo Sauce — Era Analytics"
        description="Explore sumo performance across decades — win rates, top performers, and historical trends."
      />

      <nav className="mb-2 flex items-center gap-1 text-sm text-zinc-400">
        <Link className="text-red-400 hover:text-red-300" to="/">Home</Link>
        <span>/</span>
        <Link className="text-red-400 hover:text-red-300" to="/analytics">Analytics</Link>
        <span>/</span>
        <span className="text-zinc-200">Eras</span>
      </nav>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex items-center gap-3">
          <Clock className="h-7 w-7 text-amber-500" />
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">ERA ANALYTICS</span>
            <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl">Era Analytics</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Performance trends and top performers across decades of professional sumo.
            </p>
          </div>
        </div>
      </section>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      )}

      {!isLoading && eraData.length > 0 && (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
              <div className="text-2xl font-bold text-white">{eraData.length}</div>
              <div className="text-xs text-zinc-500">Decades</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">
                {eraData.reduce((s, e) => s + e.bashoCount, 0)}
              </div>
              <div className="text-xs text-zinc-500">Tournaments</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">
                {new Set(eraData.flatMap((e) => e.topPerformers.map((p) => p.id))).size}
              </div>
              <div className="text-xs text-zinc-500">Top Performers</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
              <div className="text-2xl font-bold text-red-400">
                {eraData.length > 0
                  ? `${(eraData[eraData.length - 1].avgWinRate * 100).toFixed(0)}%`
                  : '—'}
              </div>
              <div className="text-xs text-zinc-500">Latest Win Rate</div>
            </div>
          </div>

          {/* Participation chart */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Participation by Era
            </h2>
            <p className="mt-1 text-xs text-zinc-500">Unique rikishi and tournaments per decade.</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="decade" stroke="#a1a1aa" fontSize={12} />
                  <YAxis stroke="#a1a1aa" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                    labelStyle={{ color: '#f4f4f5' }}
                  />
                  <Bar dataKey="wrestlers" fill="#ef4444" name="Wrestlers" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="basho" fill="#3b82f6" name="Tournaments" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Win rate trend */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Win Rate Trend
            </h2>
            <p className="mt-1 text-xs text-zinc-500">Average win rate of top performers across decades.</p>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="decade" stroke="#a1a1aa" fontSize={12} />
                  <YAxis stroke="#a1a1aa" fontSize={12} domain={[40, 60]} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                    labelStyle={{ color: '#f4f4f5' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="winRate"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="Avg Win %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Era breakdowns */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              Top Performers by Era
            </h2>
            {eraData.map((era) => (
              <div
                key={era.decade}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors duration-150 hover:border-white/[0.12]"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold text-white">{era.decade}</h3>
                  <div className="flex gap-4 text-xs text-zinc-500">
                    <span>{era.bashoCount} basho</span>
                    <span>{era.uniqueRikishi} rikishi</span>
                    <span>{(era.avgWinRate * 100).toFixed(1)}% avg</span>
                  </div>
                </div>
                {era.topPerformers.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {era.topPerformers.map((perf, idx) => (
                      <Link
                        key={perf.id}
                        to={`/rikishi/${encodeURIComponent(perf.id)}`}
                        className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-colors hover:border-red-600"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-600 w-5 text-right">#{idx + 1}</span>
                          <span className="font-medium text-zinc-100">{perf.shikona}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-emerald-400 font-medium">{(perf.winRate * 100).toFixed(1)}%</span>
                          <span className="ml-2 text-xs text-zinc-500">{perf.bouts} bouts</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">No qualifying performers in this era.</p>
                )}
              </div>
            ))}
          </section>
        </>
      )}

      {!isLoading && eraData.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <Clock className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">No era data available.</p>
        </div>
      )}
    </div>
  );
}
