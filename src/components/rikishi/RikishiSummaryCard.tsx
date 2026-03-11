import { useMemo } from 'react';
import type { CareerSummary, RankProgressionItem, TimelineItem } from '@/pages/rikishi/types';

type Props = {
  summary: CareerSummary;
  timeline: TimelineItem[];
  rankProgression: RankProgressionItem[];
};

function StatItem({
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
    <div
      className={`rounded-lg border p-3 transition-colors duration-200 ${
        highlight
          ? 'border-amber-700 bg-amber-950/20 hover:border-amber-600 hover:bg-amber-950/30'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
      }`}
    >
      <div className="text-xs text-zinc-400">{label}</div>
      <div className={`mt-1 font-semibold ${highlight ? 'text-amber-300' : 'text-zinc-100'}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export default function RikishiSummaryCard({ summary, timeline, rankProgression }: Props) {
  const stats = useMemo(() => {
    const totalBasho = new Set(timeline.map((t) => t.bashoId)).size;
    const wins = summary.careerRecord.totalWins;
    const losses = summary.careerRecord.totalLosses;
    const totalBouts = wins + losses;
    const winPct = totalBouts > 0 ? ((wins / totalBouts) * 100).toFixed(1) : '0.0';
    const yushoCount = rankProgression.filter((r) => r.yusho).length;
    return { totalBasho, wins, losses, winPct, yushoCount };
  }, [summary, timeline, rankProgression]);

  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="font-display text-xl font-bold tracking-tight text-white">Career Summary</h2>
      <p className="mt-0.5 text-xs text-zinc-500">{summary.heya || 'Unknown heya'}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 stagger-children">
        <StatItem label="Debut" value={summary.debutBasho} />
        <StatItem
          label="Highest Rank"
          value={summary.highestRank.rank}
          sub={`${summary.highestRank.division} (${summary.highestRank.bashoId})`}
        />
        <StatItem label="Career Wins" value={String(stats.wins)} />
        <StatItem label="Career Losses" value={String(stats.losses)} />
        <StatItem label="Win %" value={`${stats.winPct}%`} />
        <StatItem label="Total Basho" value={String(stats.totalBasho)} />
        {stats.yushoCount > 0 && (
          <StatItem label="Yusho" value={String(stats.yushoCount)} highlight />
        )}
      </div>
    </section>
  );
}
