import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { DivisionStandingRow } from '../../../shared/api/v1';
import { bashoTournamentName, parseBashoId } from '@/utils/basho';
import { PremiumSectionShell } from '@/components/ui/premium';
import AnalyticsTakeawayCard from '@/components/analytics/AnalyticsTakeawayCard';

type BashoData = {
  bashoId: string;
  rows: DivisionStandingRow[];
};

type Props = {
  bashoData: BashoData[];
};

type ChartPoint = {
  label: string;
  bashoId: string;
  avgWins: number;
  avgWinPct: number;
  wrestlers: number;
  topScore: number;
  competitiveness: number;
};

function ChartTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartPoint;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5 text-xs text-zinc-200 shadow-lg">
      <div className="font-semibold">{d.label}</div>
      <div className="mt-1 space-y-0.5">
        <div>Avg wins: <span className="text-red-400">{d.avgWins}</span></div>
        <div>Avg win%: <span className="text-amber-400">{d.avgWinPct}%</span></div>
        <div>Top score: <span className="text-emerald-400">{d.topScore}W</span></div>
        <div>Wrestlers: {d.wrestlers}</div>
        <div>Competitiveness: {d.competitiveness}</div>
      </div>
    </div>
  );
}

function DivisionStrengthChart({ bashoData }: Props) {
  const chartData = useMemo(() => {
    return bashoData
      .filter((b) => b.rows.length > 0)
      .map((b) => {
        const totalWins = b.rows.reduce((s, r) => s + r.wins, 0);
        const totalBouts = b.rows.reduce((s, r) => s + r.wins + r.losses, 0);
        const avgWins = Math.round((totalWins / b.rows.length) * 10) / 10;
        const avgWinPct = totalBouts > 0 ? Math.round((totalWins / totalBouts) * 1000) / 10 : 0;
        const sorted = [...b.rows].sort((a, bRow) => bRow.wins - a.wins);
        const topScore = sorted[0]?.wins ?? 0;
        const bottomScore = sorted[sorted.length - 1]?.wins ?? 0;
        const spread = topScore - bottomScore;
        const competitiveness = Math.round(Math.max(0, 100 - spread * 5));

        const tournament = bashoTournamentName(b.bashoId);
        const parsed = parseBashoId(b.bashoId);
        const label = `${tournament} ${parsed?.year ?? ''}`.trim();

        return {
          label,
          bashoId: b.bashoId,
          avgWins,
          avgWinPct,
          wrestlers: b.rows.length,
          topScore,
          competitiveness,
        } as ChartPoint;
      })
      .reverse(); // chronological
  }, [bashoData]);

  if (chartData.length < 2) return null;

  const mostCompetitive = [...chartData]
    .sort((a, b) => b.competitiveness - a.competitiveness || a.topScore - b.topScore)[0] ?? null;
  const highestTopScore = [...chartData]
    .sort((a, b) => b.topScore - a.topScore || b.avgWins - a.avgWins)[0] ?? null;
  const latestPoint = chartData[chartData.length - 1] ?? null;

  return (
    <PremiumSectionShell
      title="Division Strength Trends"
      subtitle={`Use this as a tournament-by-tournament read of how open or top-heavy the recent Makuuchi sample looks across the last ${chartData.length} basho. Start with the takeaway cards, then use the lines to see whether a sharp result is isolated or part of a longer pattern.`}
      trailing={(
        <Link
          to="/timeline"
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
        >
          Basho timeline
        </Link>
      )}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <AnalyticsTakeawayCard
          eyebrow="Most balanced basho"
          value={mostCompetitive ? String(mostCompetitive.competitiveness) : '—'}
          title={mostCompetitive ? mostCompetitive.label : 'No balance signal'}
          detail="This is the strongest balance signal in the current sample. Open the basho when you want to inspect whether the standings actually look crowded from top to bottom."
          variant="amber"
          to={mostCompetitive ? `/basho/${encodeURIComponent(mostCompetitive.bashoId)}` : undefined}
          cta={mostCompetitive ? 'Open basho overview' : undefined}
        />
        <AnalyticsTakeawayCard
          eyebrow="Strongest top score"
          value={highestTopScore ? `${highestTopScore.topScore}W` : '—'}
          title={highestTopScore ? highestTopScore.label : 'No standout leader'}
          detail="Read this as the tournament with the strongest single top-end score in the sample, not proof that the whole basho was dominant from start to finish."
          variant="green"
          to={highestTopScore ? `/basho/${encodeURIComponent(highestTopScore.bashoId)}` : undefined}
          cta={highestTopScore ? 'Open basho overview' : undefined}
        />
        <AnalyticsTakeawayCard
          eyebrow="Latest sampled basho"
          value={latestPoint ? latestPoint.label : '—'}
          title={latestPoint ? `${latestPoint.avgWins.toFixed(1)} avg wins, ${latestPoint.competitiveness} competitiveness` : 'No current sample'}
          detail="Use the latest point as your bridge from this trend view into the current tournament browse when you want named rikishi and standings context."
          variant="blue"
          to={latestPoint ? `/basho/${encodeURIComponent(latestPoint.bashoId)}` : '/basho'}
          cta="Open basho overview"
        />
      </div>

      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 20, left: 10, bottom: 8 }}>
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
            <YAxis
              yAxisId="left"
              stroke="#71717a"
              tick={{ fill: '#71717a', fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#71717a"
              tick={{ fill: '#71717a', fontSize: 11 }}
              domain={[0, 100]}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend
              verticalAlign="top"
              height={32}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avgWins"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3, fill: '#ef4444' }}
              activeDot={{ r: 5 }}
              name="Avg Wins"
              animationDuration={600}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="competitiveness"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#f59e0b' }}
              name="Competitiveness"
              animationDuration={600}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs leading-relaxed text-zinc-500">
        <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1">Avg wins tracks the overall scoring environment.</span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1">Competitiveness is a simple spread-based signal inside the sampled standings.</span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1">Both lines describe recent Makuuchi samples only.</span>
      </div>
    </PremiumSectionShell>
  );
}

export default memo(DivisionStrengthChart);
