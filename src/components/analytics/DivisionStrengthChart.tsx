import { memo, useMemo } from 'react';
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
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-xs text-zinc-200 shadow-lg">
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

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-xl font-bold text-white">Division Strength Trends</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Average wins and competitiveness per basho for Makuuchi over the last {chartData.length} tournaments.
      </p>

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
    </section>
  );
}

export default memo(DivisionStrengthChart);
