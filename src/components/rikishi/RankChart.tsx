import { useMemo } from 'react';
import type { RankProgressionItem } from '@/pages/rikishi/types';

type Props = {
  points: RankProgressionItem[];
};

function rankValueFromRank(rank: string): number {
  const m = String(rank).match(/\d+/);
  return m ? Number(m[0]) : 999;
}

export default function RankChart({ points }: Props) {
  const plotted = useMemo(() => {
    const clean = points.map((p) => ({ ...p, rankValue: rankValueFromRank(p.rank) }));
    const minRank = Math.min(...clean.map((c) => c.rankValue), 1);
    const maxRank = Math.max(...clean.map((c) => c.rankValue), 1);
    const width = 900;
    const height = 240;
    const leftPad = 48;
    const topPad = 16;
    const plotW = width - leftPad - 12;
    const plotH = height - topPad - 36;

    const mapX = (idx: number) => (clean.length <= 1 ? leftPad : leftPad + (idx * plotW) / (clean.length - 1));
    const mapY = (rankValue: number) => {
      if (maxRank === minRank) return topPad + plotH / 2;
      const t = (rankValue - minRank) / (maxRank - minRank);
      return topPad + t * plotH;
    };

    return {
      width,
      height,
      minRank,
      maxRank,
      line: clean.map((c, idx) => `${mapX(idx)},${mapY(c.rankValue)}`).join(' '),
      points: clean.map((c, idx) => ({ ...c, x: mapX(idx), y: mapY(c.rankValue) })),
    };
  }, [points]);

  if (!points.length) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-bold text-white">Rank Progression</h2>
        <div className="mt-3 text-sm text-zinc-400">No data.</div>
      </section>
    );
  }

  return (
    <section data-testid="rank-progression" className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-xl font-bold text-white">Rank Progression</h2>
      <svg viewBox={`0 0 ${plotted.width} ${plotted.height}`} className="mt-4 w-full" role="img" aria-label="Rank progression chart">
        <line x1="48" y1="16" x2="48" y2="204" stroke="#3f3f46" strokeWidth="1" />
        <line x1="48" y1="204" x2="888" y2="204" stroke="#3f3f46" strokeWidth="1" />

        <polyline fill="none" stroke="#f43f5e" strokeWidth="2" points={plotted.line} />

        {plotted.points.map((p) => {
          const color = p.yusho ? '#f59e0b' : p.kachiKoshi ? '#10b981' : p.makeKoshi ? '#ef4444' : '#a1a1aa';
          return <circle key={`${p.bashoId}-${p.division}`} cx={p.x} cy={p.y} r="4" fill={color} />;
        })}

        <text x="10" y="24" fill="#a1a1aa" fontSize="10">{plotted.minRank}</text>
        <text x="10" y="204" fill="#a1a1aa" fontSize="10">{plotted.maxRank}</text>

        {plotted.points.filter((_, i) => i % Math.ceil(plotted.points.length / 6) === 0 || i === plotted.points.length - 1).map((p) => (
          <text key={`x-${p.bashoId}-${p.division}`} x={p.x} y="222" fill="#71717a" fontSize="10" textAnchor="middle">
            {p.bashoId}
          </text>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-300">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />kachi-koshi</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />make-koshi</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />yusho</span>
      </div>
    </section>
  );
}
