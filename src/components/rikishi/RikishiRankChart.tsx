import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { RankProgressionItem } from '@/pages/rikishi/types';

type Props = {
  points: RankProgressionItem[];
};

function rankValueFromRank(rank: string): number {
  const m = String(rank).match(/\d+/);
  return m ? Number(m[0]) : 999;
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const color = payload.yusho
    ? '#f59e0b'
    : payload.kachiKoshi
      ? '#10b981'
      : payload.makeKoshi
        ? '#ef4444'
        : '#a1a1aa';
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="none" />;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-xs text-zinc-200 shadow-lg">
      <div className="font-semibold">{d.bashoId}</div>
      <div>
        {d.division} — {d.rank}
      </div>
      <div>
        Record: {d.wins}-{d.losses}
      </div>
      {d.yusho && <div className="text-amber-400">🏆 Yusho</div>}
    </div>
  );
}

export default function RikishiRankChart({ points }: Props) {
  const data = useMemo(() => {
    return points.map((p) => ({
      bashoId: p.bashoId,
      division: p.division,
      rank: p.rank,
      rankValue: rankValueFromRank(p.rank),
      wins: p.wins,
      losses: p.losses,
      yusho: p.yusho,
      kachiKoshi: p.kachiKoshi,
      makeKoshi: p.makeKoshi,
    }));
  }, [points]);

  if (!points.length) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-bold text-white">Rank Progression</h2>
        <div className="mt-3 text-sm text-zinc-400">No data.</div>
      </section>
    );
  }

  const maxRankValue = Math.max(...data.map((d) => d.rankValue));

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-xl font-bold text-white">Rank Progression</h2>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 20, left: 10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              dataKey="bashoId"
              stroke="#71717a"
              tick={{ fill: '#71717a', fontSize: 10 }}
              interval={Math.max(0, Math.floor(data.length / 8))}
            />
            <YAxis
              reversed
              domain={[1, maxRankValue]}
              stroke="#71717a"
              tick={{ fill: '#71717a', fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="rankValue"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 6, stroke: '#f43f5e', fill: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-300">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          kachi-koshi
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          make-koshi
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          yusho
        </span>
      </div>
    </section>
  );
}
