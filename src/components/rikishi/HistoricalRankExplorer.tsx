import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Layers, Award } from 'lucide-react';
import type { RankProgressionItem, TimelineItem } from '@/pages/rikishi/types';
import { divisionLabel, bashoLabel } from '@/utils/basho';
import type { Division } from '../../../shared/api/v1';

type Props = {
  timeline: TimelineItem[];
  rankProgression: RankProgressionItem[];
  highestRank: {
    division: Division;
    rank: string;
    bashoId: string;
  };
};

const DIVISION_ORDER: Division[] = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];

const DIVISION_COLORS: Record<Division, string> = {
  makuuchi: 'bg-red-500',
  juryo: 'bg-amber-500',
  makushita: 'bg-emerald-500',
  sandanme: 'bg-blue-500',
  jonidan: 'bg-violet-500',
  jonokuchi: 'bg-zinc-500',
};

/**
 * Historical rank explorer — shows divisions competed in,
 * basho count per division, highest rank achieved, and a visual summary.
 */
export default function HistoricalRankExplorer({ timeline, rankProgression, highestRank }: Props) {
  const divisionStats = useMemo(() => {
    const counts = new Map<string, number>();
    const uniqueBasho = new Map<string, Set<string>>();

    for (const item of timeline) {
      const div = item.division;
      counts.set(div, (counts.get(div) ?? 0) + 1);
      if (!uniqueBasho.has(div)) uniqueBasho.set(div, new Set());
      uniqueBasho.get(div)!.add(item.bashoId);
    }

    return DIVISION_ORDER
      .filter((d) => counts.has(d))
      .map((d) => ({
        division: d,
        entries: counts.get(d) ?? 0,
        bashoCount: uniqueBasho.get(d)?.size ?? 0,
      }));
  }, [timeline]);

  const totalBasho = useMemo(() => {
    const set = new Set(timeline.map((t) => t.bashoId));
    return set.size;
  }, [timeline]);

  const yushoCount = useMemo(() => {
    return rankProgression.filter((r) => r.yusho).length;
  }, [rankProgression]);

  const maxEntries = Math.max(...divisionStats.map((d) => d.bashoCount), 1);

  if (divisionStats.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-5 w-5 text-red-500" />
        <h2 className="text-xl font-bold text-white">Historical Rank Explorer</h2>
      </div>

      {/* Key stats row */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-3">
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <Award className="h-3 w-3" />
            Highest Rank
          </div>
          <div className="mt-1 font-bold text-amber-200">{highestRank.rank}</div>
          <div className="text-[10px] text-amber-400/70">
            {divisionLabel(highestRank.division)} · {bashoLabel(highestRank.bashoId)}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-xs text-zinc-400">Total Basho</div>
          <div className="mt-1 font-bold text-zinc-100">{totalBasho}</div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-xs text-zinc-400">Divisions</div>
          <div className="mt-1 font-bold text-zinc-100">{divisionStats.length}</div>
        </div>

        {yushoCount > 0 && (
          <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-3">
            <div className="text-xs text-amber-400">Yusho</div>
            <div className="mt-1 font-bold text-amber-200">{yushoCount}</div>
          </div>
        )}
      </div>

      {/* Division breakdown with visual bars */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <TrendingUp className="h-3 w-3" />
          Basho per division
        </div>
        {divisionStats.map((d) => {
          const pct = (d.bashoCount / maxEntries) * 100;
          return (
            <div key={d.division} className="group">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-200">{divisionLabel(d.division)}</span>
                <span className="text-zinc-500">{d.bashoCount} basho</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-2 rounded-full transition-all ${DIVISION_COLORS[d.division]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
