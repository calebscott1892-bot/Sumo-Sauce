import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { DivisionStandingRow } from '../../../shared/api/v1';

type Props = {
  rows: DivisionStandingRow[];
  /** Max bars to display. Defaults to 20. */
  limit?: number;
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5 text-xs text-zinc-200 shadow-lg">
      <div className="font-semibold">{d.shikona}</div>
      <div>Rank: {d.rank}</div>
      <div>Record: {d.wins}-{d.losses}</div>
      <div>Win%: {d.pct}%</div>
    </div>
  );
}

/**
 * Horizontal bar chart showing win totals per wrestler, sorted descending.
 * Highlights the top performer in amber.
 */
export default function BashoPerformanceChart({ rows, limit = 20 }: Props) {
  const data = useMemo(() => {
    return [...rows]
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
      .slice(0, limit)
      .map((r) => ({
        shikona: r.shikona,
        rikishiId: r.rikishiId,
        rank: r.rank,
        wins: r.wins,
        losses: r.losses,
        pct: r.wins + r.losses > 0
          ? ((r.wins / (r.wins + r.losses)) * 100).toFixed(1)
          : '0.0',
      }));
  }, [rows, limit]);

  if (!data.length) {
    return (
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="font-display text-xl font-bold tracking-tight text-white">Performance Chart</h2>
        <div className="mt-3 text-sm text-zinc-400">No standings data available.</div>
      </section>
    );
  }

  const maxWins = data[0]?.wins ?? 0;

  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="font-display text-xl font-bold tracking-tight text-white">Makuuchi Performance</h2>
      <p className="mt-1 text-xs text-zinc-500">Win totals sorted by performance</p>
      <div className="mt-4" style={{ height: Math.max(300, data.length * 28) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 80, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
            <XAxis
              type="number"
              stroke="#71717a"
              tick={{ fill: '#71717a', fontSize: 11 }}
              domain={[0, 'auto']}
            />
            <YAxis
              type="category"
              dataKey="shikona"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="wins" radius={[0, 4, 4, 0]} animationDuration={600}>
              {data.map((entry) => (
                <Cell
                  key={entry.rikishiId}
                  fill={entry.wins === maxWins ? '#f59e0b' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
