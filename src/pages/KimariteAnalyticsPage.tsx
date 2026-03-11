import { Link } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { trackKimariteAnalyticsView } from '@/utils/analytics';
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getDivisionStandings } from '@/pages/basho/api';
import { recentBashoIds } from '@/utils/basho';
import type { Division, DivisionStandingRow } from '../../shared/api/v1';

const COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
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

  // Fetch recent basho makuuchi standings to aggregate kimarite data
  const recentIds = useMemo(() => recentBashoIds(6), []);

  const queries = recentIds.map((bashoId) => ({
    queryKey: ['basho-division-standings', bashoId, 'makuuchi' as Division],
    queryFn: () => getDivisionStandings(bashoId, 'makuuchi'),
    staleTime: 5 * 60 * 1000,
  }));

  const results = useQuery({
    queryKey: ['kimarite-analytics-aggregate', recentIds.join(',')],
    queryFn: async () => {
      const responses = await Promise.all(
        recentIds.map((id) => getDivisionStandings(id, 'makuuchi').catch(() => [] as DivisionStandingRow[]))
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

  if (results.error) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  return (
    <div data-testid="kimarite-analytics-page" className="stagger-children mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title="Sumo Sauce \u2014 Kimarite Analytics"
        description={`Win technique distribution across the last ${recentIds.length} makuuchi tournaments \u2014 frequency charts, pie distribution, and full technique table.`}
      />

      <PremiumPageHeader
        accentLabel="KIMARITE ANALYTICS"
        title="Kimarite Analytics"
        subtitle={`Win technique distribution across the last ${recentIds.length} makuuchi tournaments.`}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Analytics', to: '/analytics' },
          { label: 'Kimarite' },
        ]}
      />

      {results.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-xs text-zinc-400">Total Techniques Recorded</div>
              <div className="mt-1 text-2xl font-bold text-white">{kimariteData.total.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-xs text-zinc-400">Unique Kimarite</div>
              <div className="mt-1 text-2xl font-bold text-white">{kimariteData.frequency.length}</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-xs text-zinc-400">Most Common</div>
              <div className="mt-1 text-2xl font-bold text-amber-300">
                {kimariteData.frequency[0]?.name ?? '—'}
              </div>
              <div className="text-xs text-zinc-500">
                {kimariteData.frequency[0]?.count.toLocaleString()} uses ({kimariteData.frequency[0]?.pct}%)
              </div>
            </div>
          </section>

          {/* Bar chart — Top 15 */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="font-display text-xl font-bold tracking-tight text-white">Top 15 Kimarite by Frequency</h2>
            <div className="mt-4" style={{ height: Math.max(360, topFrequency.length * 28) }}>
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
          </section>

          {/* Pie chart — Top 10 distribution */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="font-display text-xl font-bold tracking-tight text-white">Technique Distribution (Top 10)</h2>
            <div className="mt-4 h-80">
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
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
          </section>

          {/* Full table */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="font-display text-xl font-bold tracking-tight text-white">All Kimarite</h2>
            <div className="mt-3 overflow-x-auto">
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
                  {kimariteData.frequency.map((row, idx) => (
                    <tr key={row.name} className="border-b border-white/[0.04] text-zinc-200">
                      <td className="px-2 py-2 text-zinc-500">{idx + 1}</td>
                      <td className="px-2 py-2 font-medium">{row.name}</td>
                      <td className="px-2 py-2">{row.count.toLocaleString()}</td>
                      <td className="px-2 py-2">{row.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
