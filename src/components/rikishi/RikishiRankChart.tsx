import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ArrowUpRight, LineChart as LineChartIcon } from 'lucide-react';
import { bashoLabel, divisionLabel } from '@/utils/basho';
import { describeCareerMovement, rankNumberFromRank, sortCareerRowsChronologically } from '@/utils/careerProgression';
import type { RankProgressionItem } from '@/pages/rikishi/types';
import { PremiumBadge } from '@/components/ui/premium';

type Props = {
  points: RankProgressionItem[];
};

function CustomDot(props: { cx?: number; cy?: number; payload?: RankProgressionItem }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  const color = payload.yusho
    ? '#f59e0b'
    : payload.kachiKoshi
      ? '#10b981'
      : payload.makeKoshi
        ? '#ef4444'
        : '#a1a1aa';
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="none" />;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: any }> }) {
  if (!active || !payload?.length) return null;
  const current = payload[0].payload as RankProgressionItem & { previous?: RankProgressionItem | null };
  const movement = describeCareerMovement(current.previous ?? null, current);

  return (
    <div className="max-w-xs rounded-lg border border-white/[0.08] bg-[#121212] p-3 text-xs text-zinc-200 shadow-lg">
      <div className="font-semibold text-white">{bashoLabel(current.bashoId)}</div>
      <div className="mt-1">
        {divisionLabel(current.division)} — {current.rank}
      </div>
      <div className="text-zinc-400">
        Record: {current.wins}-{current.losses}
      </div>
      <div className="mt-2 text-zinc-400">{movement.detail}</div>
      {current.yusho ? <div className="mt-2 text-amber-400">Championship marker published</div> : null}
    </div>
  );
}

export default function RikishiRankChart({ points }: Props) {
  const sortedPoints = useMemo(() => sortCareerRowsChronologically(points), [points]);
  const data = useMemo(() => {
    return sortedPoints.map((point, index) => ({
      ...point,
      rankValue: rankNumberFromRank(point.rank),
      previous: index > 0 ? sortedPoints[index - 1] : null,
    }));
  }, [sortedPoints]);

  const latest = data.at(-1) ?? null;
  const previous = data.at(-2) ?? null;
  const best = useMemo(() => {
    if (!sortedPoints.length) return null;
    return [...sortedPoints].sort((a, b) => {
      const divisionDelta = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'].indexOf(a.division)
        - ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'].indexOf(b.division);
      if (divisionDelta !== 0) return divisionDelta;
      return rankNumberFromRank(a.rank) - rankNumberFromRank(b.rank) || a.bashoId.localeCompare(b.bashoId);
    })[0];
  }, [sortedPoints]);

  if (!points.length || !latest || !best) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.015] p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold tracking-tight text-white">Rank Progression</h2>
        <div className="mt-3 text-sm text-zinc-400">No rank progression data is published for this rikishi yet.</div>
      </section>
    );
  }

  const latestMovement = describeCareerMovement(previous ?? null, latest);
  const maxRankValue = Math.max(...data.map((item) => item.rankValue), 1);

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.015] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-red-500" />
            <h2 className="font-display text-xl font-bold tracking-tight text-white">Rank Progression</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-500">
            Lower points represent a stronger numbered rank inside the current division. Start with the latest marker, then scan for sharp climbs, drops, and yusho highlights.
          </p>
        </div>
        <LinkHint bashoId={latest.bashoId} division={latest.division} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Current line</div>
          <div className="mt-2 font-display text-lg font-bold tracking-tight text-white">
            {divisionLabel(latest.division)} {latest.rank}
          </div>
          <p className="mt-1 text-sm text-zinc-500">{bashoLabel(latest.bashoId)}</p>
        </div>

        <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-amber-400">Best published slot</div>
          <div className="mt-2 font-display text-lg font-bold tracking-tight text-amber-200">
            {divisionLabel(best.division)} {best.rank}
          </div>
          <p className="mt-1 text-sm text-amber-300/70">{bashoLabel(best.bashoId)}</p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
            Recent movement
            <PremiumBadge variant={latestMovement.variant}>{latestMovement.label}</PremiumBadge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{latestMovement.detail}</p>
        </div>
      </div>

      <div className="mt-5 h-72 w-full">
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

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-300">
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
          yusho marker
        </span>
      </div>
    </section>
  );
}

function LinkHint({ bashoId, division }: { bashoId: string; division: string }) {
  return (
    <Link
      to={`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(division)}`}
      className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
    >
      Open latest division page
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}
