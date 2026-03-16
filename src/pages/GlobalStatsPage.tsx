import { Link } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { BarChart3, Compass, Swords, TrendingUp } from 'lucide-react';
import { trackGlobalStatsView } from '@/utils/analytics';
import { useQuery } from '@tanstack/react-query';
import DataUnavailableState from '@/components/ui/DataUnavailableState';
import PageMeta from '@/components/ui/PageMeta';
import { PremiumBadge, PremiumPageHeader, PremiumSectionShell } from '@/components/ui/premium';
import { getApiFailureMessage, isApiUnavailableError } from '@/utils/apiFailure';
import AnalyticsNav from '@/components/analytics/AnalyticsNav';
import AnalyticsTakeawayCard from '@/components/analytics/AnalyticsTakeawayCard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { getRikishiDirectory } from '@/pages/rikishi/api';
import { ApiError, getDivisionStandings } from '@/pages/basho/api';
import { recentBashoIds, bashoTournamentName, bashoDisplayName, parseBashoId, latestBashoId } from '@/utils/basho';
import DivisionStrengthChart from '@/components/analytics/DivisionStrengthChart';
import type { Division, DivisionStandingRow } from '../../shared/api/v1';

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-amber-700/30 bg-amber-950/15' : 'border-white/[0.06] bg-white/[0.02]'}`}>
      <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${highlight ? 'text-amber-300' : 'text-white'}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs leading-relaxed text-zinc-500">{sub}</div> : null}
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
      let unavailableFailures = 0;
      const responses = await Promise.all(
        recentIds.map(async (id) => {
          try {
            return await getDivisionStandings(id, 'makuuchi' as Division);
          } catch (error) {
            if (isApiUnavailableError(error)) {
              unavailableFailures += 1;
            }
            return [] as DivisionStandingRow[];
          }
        }),
      );
      if (unavailableFailures === recentIds.length) {
        throw new ApiError('Live analytics standings are unavailable right now.', 503, 'API_UNAVAILABLE');
      }
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
    let kimariteUsageTotal = 0;
    const kimariteCounts = new Map<string, number>();
    const bashoMetrics: Array<{
      bashoId: string;
      rows: DivisionStandingRow[];
      avgWins: number;
      championWins: number;
      championShikona: string;
      championRikishiId: string;
      upsetCount: number;
    }> = [];
    const wrestlerWins = new Map<string, {
      shikona: string;
      wins: number;
      losses: number;
      bashoCount: number;
      winPcts: number[];
    }>();
    const championCounts = new Map<string, {
      shikona: string;
      titles: number;
      totalChampionWins: number;
      bashoIds: string[];
    }>();

    for (const basho of bashoData) {
      let bashoTotalUpsets = 0;
      let bestWins = 0;
      let bestShikona = '';
      let bestRikishiId = '';

      for (const row of basho.rows) {
        totalBouts += row.wins + row.losses;
        totalWins += row.wins;
        totalWrestlerEntries += 1;

        for (const kb of row.kimariteBreakdown) {
          kimariteCounts.set(kb.kimariteId, (kimariteCounts.get(kb.kimariteId) || 0) + kb.count);
          kimariteUsageTotal += kb.count;
        }

        const existing = wrestlerWins.get(row.rikishiId) ?? {
          shikona: row.shikona,
          wins: 0,
          losses: 0,
          bashoCount: 0,
          winPcts: [],
        };

        existing.wins += row.wins;
        existing.losses += row.losses;
        existing.bashoCount += 1;
        const total = row.wins + row.losses;
        if (total > 0) existing.winPcts.push(row.wins / total);
        existing.shikona = row.shikona;
        wrestlerWins.set(row.rikishiId, existing);

        if (row.wins > bestWins) {
          bestWins = row.wins;
          bestShikona = row.shikona;
          bestRikishiId = row.rikishiId;
        }

        const banzukeIdx = basho.rows.indexOf(row);
        if (banzukeIdx >= basho.rows.length / 2 && row.wins > row.losses) {
          bashoTotalUpsets += 1;
        }
      }

      const avg = basho.rows.length > 0
        ? basho.rows.reduce((sum, row) => sum + row.wins, 0) / basho.rows.length
        : 0;

      bashoMetrics.push({
        bashoId: basho.bashoId,
        rows: basho.rows,
        avgWins: avg,
        championWins: bestWins,
        championShikona: bestShikona,
        championRikishiId: bestRikishiId,
        upsetCount: bashoTotalUpsets,
      });

      if (bestRikishiId) {
        const existingChampion = championCounts.get(bestRikishiId) ?? {
          shikona: bestShikona,
          titles: 0,
          totalChampionWins: 0,
          bashoIds: [],
        };
        existingChampion.shikona = bestShikona;
        existingChampion.titles += 1;
        existingChampion.totalChampionWins += bestWins;
        existingChampion.bashoIds.push(basho.bashoId);
        championCounts.set(bestRikishiId, existingChampion);
      }
    }

    const uniqueBouts = Math.round(totalBouts / 2);
    const avgWinsPerBasho = totalWrestlerEntries > 0 ? (totalWins / totalWrestlerEntries).toFixed(1) : '0.0';

    const topKimarite = Array.from(kimariteCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const bashoChart = bashoData.map((basho) => {
      const tournament = bashoTournamentName(basho.bashoId);
      const parsed = parseBashoId(basho.bashoId);
      const avg = basho.rows.length > 0
        ? (basho.rows.reduce((sum, row) => sum + row.wins, 0) / basho.rows.length).toFixed(1)
        : '0';
      return {
        bashoId: basho.bashoId,
        label: `${tournament} ${parsed?.year ?? ''}`.trim(),
        avgWins: Number(avg),
        wrestlers: basho.rows.length,
      };
    }).reverse();

    const topSuccessful = Array.from(wrestlerWins.entries())
      .filter(([, value]) => value.bashoCount >= 3 && (value.wins + value.losses) > 0)
      .map(([id, value]) => ({
        rikishiId: id,
        shikona: value.shikona,
        winRate: value.wins / (value.wins + value.losses),
        wins: value.wins,
        losses: value.losses,
        bashoCount: value.bashoCount,
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10);

    const stddev = (arr: number[]) => {
      if (arr.length < 2) return 0;
      const mean = arr.reduce((sum, value) => sum + value, 0) / arr.length;
      return Math.sqrt(arr.reduce((sum, value) => sum + (value - mean) ** 2, 0) / arr.length);
    };

    const mostVolatile = Array.from(wrestlerWins.entries())
      .filter(([, value]) => value.bashoCount >= 3 && value.winPcts.length >= 3)
      .map(([id, value]) => ({
        rikishiId: id,
        shikona: value.shikona,
        volatility: stddev(value.winPcts),
        bashoCount: value.bashoCount,
      }))
      .sort((a, b) => b.volatility - a.volatility)
      .slice(0, 5);

    const mostDominant = [...bashoMetrics]
      .filter((basho) => basho.championWins > 0 && basho.championRikishiId)
      .sort((a, b) => b.championWins - a.championWins)
      .slice(0, 5);

    const upsetHeavy = [...bashoMetrics]
      .filter((basho) => basho.upsetCount > 0)
      .sort((a, b) => b.upsetCount - a.upsetCount)
      .slice(0, 5);

    const highestAvgBasho = [...bashoChart].sort((a, b) => b.avgWins - a.avgWins)[0] ?? null;
    const lowestAvgBasho = [...bashoChart].sort((a, b) => a.avgWins - b.avgWins)[0] ?? null;
    const championTrail = [...bashoMetrics]
      .filter((basho) => basho.championWins > 0 && basho.championRikishiId)
      .sort((a, b) => b.bashoId.localeCompare(a.bashoId))
      .slice(0, 6);
    const sampleTitleLeaders = Array.from(championCounts.entries())
      .map(([rikishiId, value]) => ({
        rikishiId,
        shikona: value.shikona,
        titles: value.titles,
        totalChampionWins: value.totalChampionWins,
        latestBashoId: [...value.bashoIds].sort().at(-1) ?? null,
      }))
      .sort((a, b) =>
        b.titles - a.titles ||
        b.totalChampionWins - a.totalChampionWins ||
        a.shikona.localeCompare(b.shikona),
      )
      .slice(0, 5);

    return {
      totalRikishi,
      totalBasho,
      uniqueBouts,
      avgWinsPerBasho,
      kimariteUsageTotal,
      topKimarite,
      bashoChart,
      topSuccessful,
      mostVolatile,
      mostDominant,
      upsetHeavy,
      highestAvgBasho,
      lowestAvgBasho,
      championTrail,
      sampleTitleLeaders,
    };
  }, [directoryQuery.data, standingsQuery.data, recentIds]);

  const isLoading = directoryQuery.isLoading || standingsQuery.isLoading;
  const latestSampled = recentIds[0] ?? latestBashoId() ?? null;
  const oldestSampled = recentIds[recentIds.length - 1] ?? null;
  const sampleWindowLabel = latestSampled && oldestSampled
    ? `${bashoDisplayName(oldestSampled)} → ${bashoDisplayName(latestSampled)}`
    : 'Recent Makuuchi sample';
  const topTechnique = stats.topKimarite[0] ?? null;
  const topPerformer = stats.topSuccessful[0] ?? null;
  const dominantBasho = stats.mostDominant[0] ?? null;
  const upsetBasho = stats.upsetHeavy[0] ?? null;
  const sampleTitleLeader = stats.sampleTitleLeaders[0] ?? null;
  const latestChampion = stats.championTrail[0] ?? null;

  if (directoryQuery.error || standingsQuery.error) {
    const error = directoryQuery.error || standingsQuery.error;

    return (
      <div data-testid="global-stats-page" className="stagger-children mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
        <PageMeta
          title="Sumo Sauce — Global Analytics"
          description="Guided overview of recent Makuuchi analytics on Sumo Sauce."
        />

        <PremiumPageHeader
          accentLabel="GLOBAL ANALYTICS"
          title="Global Analytics"
          subtitle="This page needs live directory and standings data. The analytics route is available, but the backend sample could not be loaded."
          breadcrumbs={[
            { label: 'Home', to: '/' },
            { label: 'Analytics' },
          ]}
        >
          <AnalyticsNav current="global" />
        </PremiumPageHeader>

        <PremiumSectionShell
          title="Live analytics sample is unavailable"
          subtitle="This surface depends on recent Makuuchi standings and the routeable directory, so it should not pretend empty charts mean empty data."
        >
          <DataUnavailableState
            title="Recent analytics could not load"
            description={getApiFailureMessage(error, 'The live analytics service is unavailable right now.')}
            detail="Treat this as a backend outage rather than a real zero-data sample. Once the hosted API is connected again, the charts and takeaways should repopulate."
            actions={[
              { label: 'Browse basho', to: '/basho' },
              { label: 'Browse rikishi', to: '/rikishi' },
              { label: 'Open leaderboard', to: '/leaderboard' },
            ]}
          />
        </PremiumSectionShell>
      </div>
    );
  }

  return (
    <div data-testid="global-stats-page" className="stagger-children mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title="SumoWatch — Global Analytics"
        description="Guided overview of recent Makuuchi analytics on SumoWatch — sample scope, technique baseline, standout rikishi, and tournament volatility."
      />

      <PremiumPageHeader
        accentLabel="GLOBAL ANALYTICS"
        title="Global Analytics"
        subtitle="Start here when you want a high-level read on the recent Makuuchi sample before diving deeper into kimarite, eras, or tournament browsing."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Analytics' },
        ]}
      >
        <AnalyticsNav current="global" />

        {!isLoading && (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsTakeawayCard
              eyebrow="Sample scope"
              value={String(stats.totalBasho)}
              title="Recent Makuuchi basho in view"
              detail={`This page summarizes a recent Makuuchi sample spanning ${sampleWindowLabel}. Use it as a directional surface, not a complete all-eras census.`}
              variant="blue"
            />
            <AnalyticsTakeawayCard
              eyebrow="Technique baseline"
              value={topTechnique?.[0] ?? '—'}
              title={topTechnique ? `${topTechnique[1].toLocaleString()} recorded uses` : 'No technique data loaded'}
              detail="This is the fastest route into the sample’s most common winning technique pattern."
              variant="red"
              to="/analytics/kimarite"
              cta="Open kimarite analytics"
            />
            <AnalyticsTakeawayCard
              eyebrow="Sample standout"
              value={topPerformer?.shikona ?? '—'}
              title={topPerformer ? `${(topPerformer.winRate * 100).toFixed(1)}% win rate` : 'No qualifying rikishi yet'}
              detail="Highest sampled win rate among rikishi with at least three basho in the loaded Makuuchi window."
              variant="green"
              to={topPerformer ? `/rikishi/${encodeURIComponent(topPerformer.rikishiId)}` : undefined}
              cta={topPerformer ? 'Open profile' : undefined}
            />
            <AnalyticsTakeawayCard
              eyebrow="Tournament to inspect"
              value={upsetBasho ? String(upsetBasho.upsetCount) : '—'}
              title={upsetBasho ? `${bashoDisplayName(upsetBasho.bashoId)} upset signal` : 'No upset-heavy basho yet'}
              detail="Use the tournament page when you want to move from aggregate patterns into one basho that looks unusually chaotic."
              variant="amber"
              to={upsetBasho ? `/basho/${encodeURIComponent(upsetBasho.bashoId)}` : undefined}
              cta={upsetBasho ? 'Open basho overview' : undefined}
            />
          </div>
        )}
      </PremiumPageHeader>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      ) : (
        <>
          <section id="sample-overview" className="scroll-mt-24">
            <PremiumSectionShell
              title="Current Sample At A Glance"
              subtitle="These summary cards tell you how large the loaded sample is before you interpret any leaderboard or chart as a broader statement about all of sumo."
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Directory size" value={stats.totalRikishi.toLocaleString()} sub="current rikishi directory entries" />
                <StatCard label="Sampled basho" value={String(stats.totalBasho)} sub={sampleWindowLabel} />
                <StatCard label="Estimated bouts" value={stats.uniqueBouts.toLocaleString()} sub="counted from sampled Makuuchi entries" />
                <StatCard
                  label="Avg wins per entry"
                  value={stats.avgWinsPerBasho}
                  sub="average wins per rikishi per sampled basho"
                  highlight
                />
              </div>
            </PremiumSectionShell>
          </section>

          <PremiumSectionShell
            title="Technique Baseline"
            subtitle="Read this before the other charts if you want the simplest answer to what kind of wins define the current sample."
            trailing={(
              <Link
                to="/analytics/kimarite"
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
              >
                Full kimarite page
              </Link>
            )}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {stats.topKimarite.map(([name, count], index) => (
                <div
                  key={name}
                  className={`rounded-xl border p-4 ${index === 0 ? 'border-amber-700/30 bg-amber-950/15' : 'border-white/[0.06] bg-white/[0.02]'}`}
                >
                  <div className={`text-lg font-semibold ${index === 0 ? 'text-amber-300' : 'text-zinc-100'}`}>
                    {name}
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">{count.toLocaleString()} recorded wins</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {stats.kimariteUsageTotal > 0 ? `${((count / stats.kimariteUsageTotal) * 100).toFixed(1)}% of sampled uses` : 'No share available'}
                  </div>
                </div>
              ))}
            </div>
          </PremiumSectionShell>

          <PremiumSectionShell
            title="Recent Makuuchi Scoring Environment"
            subtitle="Use this chart to see whether the recent sample looks easier or harder to score wins in at the division level, then jump into a specific basho when one point stands out."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <AnalyticsTakeawayCard
                eyebrow="Highest average"
                value={stats.highestAvgBasho ? stats.highestAvgBasho.avgWins.toFixed(1) : '—'}
                title={stats.highestAvgBasho ? stats.highestAvgBasho.label : 'No peak basho'}
                detail="This is the strongest average-win environment in the current sample."
                variant="green"
                to={stats.highestAvgBasho ? `/basho/${encodeURIComponent(stats.highestAvgBasho.bashoId)}` : undefined}
                cta={stats.highestAvgBasho ? 'Open basho overview' : undefined}
              />
              <AnalyticsTakeawayCard
                eyebrow="Lowest average"
                value={stats.lowestAvgBasho ? stats.lowestAvgBasho.avgWins.toFixed(1) : '—'}
                title={stats.lowestAvgBasho ? stats.lowestAvgBasho.label : 'No low-point basho'}
                detail="This is the tightest scoring environment in the current sample."
                variant="amber"
                to={stats.lowestAvgBasho ? `/basho/${encodeURIComponent(stats.lowestAvgBasho.bashoId)}` : undefined}
                cta={stats.lowestAvgBasho ? 'Open basho overview' : undefined}
              />
            </div>

            <div className="mt-5 h-64">
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
          </PremiumSectionShell>

          {(standingsQuery.data ?? []).length >= 2 && (
            <DivisionStrengthChart bashoData={standingsQuery.data ?? []} />
          )}

          <section id="championship-trail" className="scroll-mt-24">
            <PremiumSectionShell
              title="Championship Trail In The Sample"
              subtitle="Use this when you want to browse recent title signals directly: who lifted the most recent yusho, who keeps reappearing, and which basho are worth opening next."
            >
            <div className="grid gap-3 md:grid-cols-3">
              <AnalyticsTakeawayCard
                eyebrow="Sample title leader"
                value={sampleTitleLeader?.shikona ?? '—'}
                title={sampleTitleLeader ? `${sampleTitleLeader.titles} sampled championships` : 'No repeat champion yet'}
                detail="This counts only the recent Makuuchi champions in the loaded analytics sample, not an all-career title table."
                variant="amber"
                to={sampleTitleLeader ? `/rikishi/${encodeURIComponent(sampleTitleLeader.rikishiId)}#records` : undefined}
                cta={sampleTitleLeader ? 'Open records' : undefined}
              />
              <AnalyticsTakeawayCard
                eyebrow="Latest champion"
                value={latestChampion?.championShikona ?? '—'}
                title={latestChampion ? `${latestChampion.championWins} wins in ${bashoDisplayName(latestChampion.bashoId)}` : 'No latest champion loaded'}
                detail="This is the most recent championship result visible in the current analytics sample."
                variant="green"
                to={latestChampion ? `/basho/${encodeURIComponent(latestChampion.bashoId)}` : undefined}
                cta={latestChampion ? 'Open basho overview' : undefined}
              />
              <AnalyticsTakeawayCard
                eyebrow="Broader achievements"
                value="Leaderboard"
                title="Browse imported yusho and prize context"
                detail="When you want legacy entity counts like top-division yusho and special prizes, use the leaderboard as a browse surface rather than assuming that data exists in every modern profile feed."
                variant="blue"
                to="/leaderboard"
                cta="Open leaderboard"
              />
            </div>

            {stats.sampleTitleLeaders.length > 0 ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {stats.sampleTitleLeaders.map((leader, index) => (
                  <div
                    key={leader.rikishiId}
                    className={`rounded-xl border p-4 ${index === 0 ? 'border-amber-700/30 bg-amber-950/15' : 'border-white/[0.06] bg-white/[0.02]'}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <PremiumBadge variant={index === 0 ? 'amber' : 'zinc'}>#{index + 1}</PremiumBadge>
                      <PremiumBadge variant="zinc">{leader.titles} titles</PremiumBadge>
                    </div>
                    <div className="mt-3 font-semibold text-white">
                      <Link
                        to={`/rikishi/${encodeURIComponent(leader.rikishiId)}#records`}
                        className="transition-colors hover:text-red-300"
                      >
                        {leader.shikona}
                      </Link>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                      {leader.latestBashoId
                        ? `Latest sampled title came at ${bashoDisplayName(leader.latestBashoId)}.`
                        : 'Repeated title signal in the current sample.'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <Link
                        to={`/rikishi/${encodeURIComponent(leader.rikishiId)}#records`}
                        className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                      >
                        Wrestler records
                      </Link>
                      {leader.latestBashoId ? (
                        <Link
                          to={`/basho/${encodeURIComponent(leader.latestBashoId)}`}
                          className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                        >
                          Latest basho
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {stats.championTrail.length === 0 ? (
              <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm leading-relaxed text-zinc-400">
                No championship trail is available in the currently loaded analytics sample yet.
              </div>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {stats.championTrail.map((basho) => (
                  <div
                    key={basho.bashoId}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <PremiumBadge variant="amber">Yusho</PremiumBadge>
                      <PremiumBadge variant="zinc">{bashoDisplayName(basho.bashoId)}</PremiumBadge>
                    </div>
                    <div className="mt-3 font-semibold text-white">
                      <Link
                        to={`/rikishi/${encodeURIComponent(basho.championRikishiId)}#records`}
                        className="transition-colors hover:text-red-300"
                      >
                        {basho.championShikona}
                      </Link>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                      Won the sampled Makuuchi basho with {basho.championWins} wins.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <Link
                        to={`/rikishi/${encodeURIComponent(basho.championRikishiId)}#records`}
                        className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                      >
                        Wrestler records
                      </Link>
                      <Link
                        to={`/basho/${encodeURIComponent(basho.bashoId)}`}
                        className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                      >
                        Basho overview
                      </Link>
                      <Link
                        to={`/basho/${encodeURIComponent(basho.bashoId)}/makuuchi`}
                        className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                      >
                        Division page
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </PremiumSectionShell>
          </section>

          <section id="standout-rikishi" className="scroll-mt-24">
            <PremiumSectionShell
              title="Standout Rikishi In The Sample"
              subtitle="These rankings help you move from aggregate environment reads into individual rikishi pages that deserve a closer look."
            >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div>
                <div className="mb-3 text-sm font-semibold text-white">Most successful sampled rikishi</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm" aria-label="Top 10 most successful rikishi">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.03] text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        <th className="px-2 py-2" scope="col">#</th>
                        <th className="px-2 py-2" scope="col">Rikishi</th>
                        <th className="px-2 py-2" scope="col">Win rate</th>
                        <th className="px-2 py-2" scope="col">W-L</th>
                        <th className="px-2 py-2" scope="col">Basho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topSuccessful.map((rikishi, index) => (
                        <tr key={rikishi.rikishiId} className="border-b border-white/[0.04] text-zinc-200 transition-colors hover:bg-white/[0.04]">
                          <td className="px-2 py-2">{index + 1}</td>
                          <td className="px-2 py-2">
                            <Link to={`/rikishi/${encodeURIComponent(rikishi.rikishiId)}`} className="text-red-300 hover:text-red-200">
                              {rikishi.shikona}
                            </Link>
                          </td>
                          <td className="px-2 py-2 font-semibold text-emerald-400">{(rikishi.winRate * 100).toFixed(1)}%</td>
                          <td className="px-2 py-2">{rikishi.wins}-{rikishi.losses}</td>
                          <td className="px-2 py-2">{rikishi.bashoCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="mb-3 text-sm font-semibold text-white">Most volatile performers</div>
                <div className="space-y-2">
                  {stats.mostVolatile.map((rikishi, index) => (
                    <Link
                      key={rikishi.rikishiId}
                      to={`/rikishi/${encodeURIComponent(rikishi.rikishiId)}`}
                      className={`block rounded-xl border p-4 transition-colors hover:border-amber-600/40 ${index === 0 ? 'border-amber-700/30 bg-amber-950/15' : 'border-white/[0.06] bg-white/[0.02]'}`}
                    >
                      <div className={`font-semibold ${index === 0 ? 'text-amber-300' : 'text-zinc-100'}`}>{rikishi.shikona}</div>
                      <div className="mt-1 text-sm text-zinc-400">Volatility score: {(rikishi.volatility * 100).toFixed(1)}%</div>
                      <div className="mt-1 text-xs text-zinc-500">{rikishi.bashoCount} sampled basho</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            </PremiumSectionShell>
          </section>

          <PremiumSectionShell
            title="Tournament Extremes"
            subtitle="Use these basho shortcuts when you want to leave the aggregate view and inspect the sample’s cleanest runaway performance or its messiest tournament."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Most dominant basho
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {stats.mostDominant.map((basho, index) => (
                    <Link
                      key={basho.bashoId}
                      to={`/basho/${encodeURIComponent(basho.bashoId)}`}
                      className={`rounded-xl border p-4 transition-colors hover:border-emerald-600/40 ${index === 0 ? 'border-emerald-700/30 bg-emerald-950/15' : 'border-white/[0.06] bg-white/[0.02]'}`}
                    >
                      <div className={`font-semibold ${index === 0 ? 'text-emerald-300' : 'text-zinc-100'}`}>
                        {bashoDisplayName(basho.bashoId)}
                      </div>
                      <div className="mt-1 text-sm text-zinc-400">{basho.championShikona} finished with {basho.championWins} wins.</div>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <BarChart3 className="h-4 w-4 text-red-400" />
                  Upset-heavy basho
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {stats.upsetHeavy.map((basho, index) => (
                    <Link
                      key={basho.bashoId}
                      to={`/basho/${encodeURIComponent(basho.bashoId)}`}
                      className={`rounded-xl border p-4 transition-colors hover:border-red-600/40 ${index === 0 ? 'border-red-700/30 bg-red-950/15' : 'border-white/[0.06] bg-white/[0.02]'}`}
                    >
                      <div className={`font-semibold ${index === 0 ? 'text-red-300' : 'text-zinc-100'}`}>
                        {bashoDisplayName(basho.bashoId)}
                      </div>
                      <div className="mt-1 text-sm text-zinc-400">{basho.upsetCount} lower-half kachi-koshi results in the sampled standings.</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </PremiumSectionShell>

          <PremiumSectionShell
            title="Go Next"
            subtitle="Use the next page that matches the question you actually have now."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <AnalyticsTakeawayCard
                eyebrow="Technique detail"
                title="Kimarite analytics"
                detail="Open the full technique page when you want frequency ranking, share concentration, and the long-tail view."
                variant="red"
                to="/analytics/kimarite"
                cta="Open page"
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <AnalyticsTakeawayCard
                eyebrow="Historical lens"
                title="Era analytics"
                detail="Switch to decade-level storytelling when you want sampled historical participation and performer context."
                variant="blue"
                to="/analytics/eras"
                cta="Open page"
                icon={<Compass className="h-4 w-4" />}
              />
              <AnalyticsTakeawayCard
                eyebrow="Tournament browse"
                title={dominantBasho ? bashoDisplayName(dominantBasho.bashoId) : 'Latest basho'}
                detail="Leave the aggregate layer and inspect one tournament directly when you need standings, leaders, and divisional context."
                variant="green"
                to={dominantBasho ? `/basho/${encodeURIComponent(dominantBasho.bashoId)}` : '/basho'}
                cta="Open basho"
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <AnalyticsTakeawayCard
                eyebrow="Head to head"
                title="Rivalry explorer"
                detail="Move from broad performance signals into a comparison flow when the next question is about matchups rather than environment."
                variant="amber"
                to="/rivalries"
                cta="Open rivalries"
                icon={<Swords className="h-4 w-4" />}
              />
            </div>
          </PremiumSectionShell>
        </>
      )}
    </div>
  );
}
