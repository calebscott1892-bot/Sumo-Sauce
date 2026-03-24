import { Link } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { Compass, Search, Swords, TrendingUp } from 'lucide-react';
import { trackKimariteAnalyticsView } from '@/utils/analytics';
import { useQuery } from '@tanstack/react-query';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import { PremiumPageHeader, PremiumSectionShell } from '@/components/ui/premium';
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getDivisionStandings, getAvailableBashoIds } from '@/pages/basho/api';
import { bashoDisplayName } from '@/utils/basho';
import type { DivisionStandingRow } from '../../shared/api/v1';

const COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4',
];

function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5 text-xs text-zinc-200 shadow-lg">
      <div className="font-semibold">{d.name}</div>
      <div>Count: {d.count}</div>
      <div>Share: {d.pct}%</div>
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5 text-xs text-zinc-200 shadow-lg">
      <div className="font-semibold">{d.name}</div>
      <div>Count: {d.count}</div>
      <div>Share: {d.pct}%</div>
    </div>
  );
}

export default function KimariteAnalyticsPage() {
  useEffect(() => { trackKimariteAnalyticsView(); }, []);

  const availableQuery = useQuery({
    queryKey: ['available-basho-ids'],
    queryFn: () => getAvailableBashoIds(6),
    staleTime: 10 * 60 * 1000,
  });
  const recentIds = useMemo(() => availableQuery.data ?? [], [availableQuery.data]);

  const results = useQuery({
    queryKey: ['kimarite-analytics-aggregate', recentIds.join(',')],
    enabled: recentIds.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        recentIds.map((id) => getDivisionStandings(id, 'makuuchi').catch(() => [] as DivisionStandingRow[])),
      );
      return responses;
    },
    staleTime: 5 * 60 * 1000,
  });

  const kimariteData = useMemo(() => {
    if (!results.data) return { frequency: [], total: 0 };

    const counts = new Map<string, number>();
    let total = 0;

    for (const standings of results.data) {
      for (const row of standings) {
        for (const kb of row.kimariteBreakdown) {
          counts.set(kb.kimariteId, (counts.get(kb.kimariteId) || 0) + kb.count);
          total += kb.count;
        }
      }
    }

    const frequency = Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        pct: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.count - a.count);

    return { frequency, total };
  }, [results.data]);

  const topFrequency = kimariteData.frequency.slice(0, 15);
  const pieData = kimariteData.frequency.slice(0, 10);
  const topTechnique = kimariteData.frequency[0] ?? null;
  const topFiveShare = kimariteData.total > 0
    ? kimariteData.frequency.slice(0, 5).reduce((sum, row) => sum + row.count, 0) / kimariteData.total
    : 0;
  const topTenShare = kimariteData.total > 0
    ? kimariteData.frequency.slice(0, 10).reduce((sum, row) => sum + row.count, 0) / kimariteData.total
    : 0;
  const latestSampled = recentIds[0] ?? null;
  const oldestSampled = recentIds[recentIds.length - 1] ?? null;
  const sampleWindowLabel = latestSampled && oldestSampled
    ? `${bashoDisplayName(oldestSampled)} → ${bashoDisplayName(latestSampled)}`
    : 'Recent Makuuchi sample';

  if (results.error) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  return (
    <div data-testid="kimarite-analytics-page" className="stagger-children mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title="Sumo Sauce — Kimarite Analytics"
        description={`Guided kimarite analysis across the last ${recentIds.length} sampled Makuuchi tournaments on Sumo Sauce.`}
      />

      <PremiumPageHeader
        accentLabel="KIMARITE ANALYTICS"
        title="Kimarite Analytics"
        subtitle={`Use this page to understand how concentrated or varied the current winning-technique mix is across the last ${recentIds.length} sampled Makuuchi tournaments.`}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Analytics', to: '/analytics' },
          { label: 'Kimarite' },
        ]}
      >
        <AnalyticsNav current="kimarite" />

        {!results.isLoading && (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsTakeawayCard
              eyebrow="Sample window"
              value={String(recentIds.length)}
              title="Makuuchi basho in view"
              detail={`This page aggregates recorded winning techniques from ${sampleWindowLabel}. It is a recent-sample read, not an all-history technique census.`}
              variant="blue"
            />
            <AnalyticsTakeawayCard
              eyebrow="Most common finish"
              value={topTechnique?.name ?? '—'}
              title={topTechnique ? `${topTechnique.count.toLocaleString()} recorded wins` : 'No technique data yet'}
              detail="Start here if you want the simplest answer to what kind of winning technique dominates the current sample."
              variant="red"
            />
            <AnalyticsTakeawayCard
              eyebrow="Concentration"
              value={`${(topFiveShare * 100).toFixed(1)}%`}
              title="Top 5 techniques"
              detail="This tells you how much of the sample is carried by a small cluster of high-frequency winning techniques."
              variant="amber"
            />
            <AnalyticsTakeawayCard
              eyebrow="Tournament context"
              title={latestSampled ? bashoDisplayName(latestSampled) : 'Latest basho'}
              detail="Leave the aggregate layer and open a recent basho page when you want standings and wrestler context behind the technique mix."
              variant="green"
              to={latestSampled ? `/basho/${encodeURIComponent(latestSampled)}/makuuchi` : '/basho'}
              cta="Open latest Makuuchi"
            />
          </div>
        )}
      </PremiumPageHeader>

      {results.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      ) : (
        <>
          <PremiumSectionShell
            title="How To Read This Page"
            subtitle="Use the ranking chart for absolute volume, the pie for concentration, and the table for the long tail of less common techniques."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Recorded finishes</div>
                <div className="mt-2 text-2xl font-bold text-white">{kimariteData.total.toLocaleString()}</div>
                <div className="mt-1 text-xs text-zinc-500">Counted from the sampled Makuuchi standings rows.</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Unique kimarite</div>
                <div className="mt-2 text-2xl font-bold text-white">{kimariteData.frequency.length}</div>
                <div className="mt-1 text-xs text-zinc-500">Different winning techniques published in this sample.</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Top 10 share</div>
                <div className="mt-2 text-2xl font-bold text-amber-300">{(topTenShare * 100).toFixed(1)}%</div>
                <div className="mt-1 text-xs text-zinc-500">Share of the sample carried by the ten biggest techniques.</div>
              </div>
            </div>
          </PremiumSectionShell>

          <PremiumSectionShell
            title="Frequency Ranking"
            subtitle="Start here if you want to know which techniques dominate the sample in raw count."
            trailing={(
              <Link
                to="/analytics"
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
              >
                Back to global analytics
              </Link>
            )}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <AnalyticsTakeawayCard
                eyebrow="Leading technique"
                value={topTechnique?.name ?? '—'}
                title={topTechnique ? `${topTechnique.pct}% share of sampled finishes` : 'No lead technique yet'}
                detail="The lead technique is the fastest shorthand for the sample’s current technical center of gravity."
                variant="red"
              />
              <AnalyticsTakeawayCard
                eyebrow="What to compare"
                value={`${(topFiveShare * 100).toFixed(1)}%`}
                title="Top 5 combined share"
                detail="If this number is high, the current sample is concentrated in a narrow technique mix. If it falls, the sample is broadening."
                variant="amber"
              />
            </div>

            <div className="mt-5" style={{ height: Math.max(360, topFrequency.length * 28) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFrequency} layout="vertical" margin={{ top: 4, right: 20, left: 100, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                  <XAxis type="number" stroke="#71717a" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#71717a"
                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PremiumSectionShell>

          <PremiumSectionShell
            title="Technique Concentration"
            subtitle="Use the pie chart when you care more about share and concentration than raw count."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <AnalyticsTakeawayCard
                eyebrow="Interpretation"
                title="Read the center of the chart first"
                detail="If one or two slices dominate, the current sample leans heavily on a small set of finishes. If the top slices compress, the mix is more varied."
                variant="blue"
              />
              <AnalyticsTakeawayCard
                eyebrow="Go next"
                title={latestSampled ? bashoDisplayName(latestSampled) : 'Latest basho'}
                detail="Open the latest Makuuchi basho when you want to connect the technique mix back to actual standings and named rikishi."
                variant="green"
                to={latestSampled ? `/basho/${encodeURIComponent(latestSampled)}/makuuchi` : '/basho'}
                cta="Open basho"
              />
            </div>

            <div className="mt-5 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, pct }: any) => `${name} (${pct}%)`}
                    labelLine={{ stroke: '#71717a' }}
                    animationDuration={600}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value: string) => <span className="text-xs text-zinc-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </PremiumSectionShell>

          <PremiumSectionShell
            title="Long-Tail Technique Table"
            subtitle="Use the table when you need to inspect less common kimarite that disappear visually once the top few techniques dominate the charts."
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.03] text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Kimarite</th>
                    <th className="px-2 py-2">Count</th>
                    <th className="px-2 py-2">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {kimariteData.frequency.map((row, index) => (
                    <tr key={row.name} className="border-b border-white/[0.04] text-zinc-200">
                      <td className="px-2 py-2 text-zinc-500">{index + 1}</td>
                      <td className="px-2 py-2 font-medium">{row.name}</td>
                      <td className="px-2 py-2">{row.count.toLocaleString()}</td>
                      <td className="px-2 py-2">{row.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PremiumSectionShell>

          <PremiumSectionShell
            title="Go Next"
            subtitle="Pick the next surface that answers your real follow-up question."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <AnalyticsTakeawayCard
                eyebrow="Broader context"
                title="Global analytics"
                detail="Step back out when you want environment, tournament, and standout-rikishi framing around the technique mix."
                variant="blue"
                to="/analytics"
                cta="Open page"
                icon={<Compass className="h-4 w-4" />}
              />
              <AnalyticsTakeawayCard
                eyebrow="Profiles"
                title="Browse rikishi"
                detail="Move into wrestler pages when you want trust-aware profiles and individual context rather than aggregate technique counts."
                variant="green"
                to="/rikishi"
                cta="Open directory"
                icon={<Search className="h-4 w-4" />}
              />
              <AnalyticsTakeawayCard
                eyebrow="Basho context"
                title={latestSampled ? bashoDisplayName(latestSampled) : 'Latest Makuuchi'}
                detail="Use a tournament page when you need names, ranks, and standings behind the current technique sample."
                variant="red"
                to={latestSampled ? `/basho/${encodeURIComponent(latestSampled)}/makuuchi` : '/basho'}
                cta="Open basho"
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <AnalyticsTakeawayCard
                eyebrow="Head to head"
                title="Rivalry explorer"
                detail="Switch to rivalries when the next question is about matchups and series balance rather than technique prevalence."
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
