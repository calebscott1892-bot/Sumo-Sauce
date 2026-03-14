import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TimelineItem } from '../../../shared/api/v1';
import type { DivisionStandingRow } from '../../../shared/api/v1';

type Props = {
  timeline: TimelineItem[];
  standingsMap: Map<string, DivisionStandingRow[]>;
  rikishiId: string;
};

function MetricCard({
  label,
  rikishiVal,
  fieldVal,
  format = 'number',
}: {
  label: string;
  rikishiVal: number;
  fieldVal: number;
  format?: 'number' | 'pct';
}) {
  const diff = rikishiVal - fieldVal;
  const positive = diff > 0;
  const neutral = Math.abs(diff) < 0.01;

  const fmt = (v: number) =>
    format === 'pct' ? `${(v * 100).toFixed(1)}%` : v.toFixed(1);

  return (
    <div className="hover-lift rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-all">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-bold text-white">{fmt(rikishiVal)}</span>
        <span className="text-xs text-zinc-500">vs {fmt(fieldVal)}</span>
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs">
        {neutral ? (
          <>
            <Minus className="h-3 w-3 text-zinc-500" />
            <span className="text-zinc-500">On par</span>
          </>
        ) : positive ? (
          <>
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-400">+{fmt(Math.abs(diff))} above</span>
          </>
        ) : (
          <>
            <TrendingDown className="h-3 w-3 text-red-400" />
            <span className="text-red-400">{fmt(Math.abs(diff))} below</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function PerformanceVsField({ timeline, standingsMap, rikishiId }: Props) {
  const stats = useMemo(() => {
    // Get recent basho entries (last 6)
    const recent = [...timeline].sort((a, b) => b.bashoId.localeCompare(a.bashoId)).slice(0, 6);

    if (!recent.length) return null;

    let rikishiTotalWins = 0;
    let rikishiTotalLosses = 0;
    let fieldTotalWins = 0;
    let fieldTotalLosses = 0;
    let fieldWrestlerCount = 0;
    let bashoWithData = 0;

    // Track win percentages per basho for consistency
    const rikishiWinPcts: number[] = [];
    const fieldWinPcts: number[] = [];

    for (const entry of recent) {
      const key = `${entry.bashoId}::${entry.division}`;
      const standings = standingsMap.get(key);
      if (!standings || standings.length === 0) continue;

      bashoWithData++;
      rikishiTotalWins += entry.wins;
      rikishiTotalLosses += entry.losses;

      const total = entry.wins + entry.losses;
      if (total > 0) {
        rikishiWinPcts.push(entry.wins / total);
      }

      // Compute field averages (all wrestlers in same division/basho)
      let fWins = 0;
      let fLosses = 0;
      let fCount = 0;
      for (const row of standings) {
        if (row.rikishiId === rikishiId) continue;
        fWins += row.wins;
        fLosses += row.losses;
        fCount++;
      }

      fieldTotalWins += fWins;
      fieldTotalLosses += fLosses;
      fieldWrestlerCount += fCount;

      const fTotal = fWins + fLosses;
      if (fTotal > 0) {
        fieldWinPcts.push(fWins / fTotal);
      }
    }

    if (bashoWithData === 0) return null;

    const rikishiAvgWins = rikishiTotalWins / bashoWithData;
    const fieldAvgWins = fieldWrestlerCount > 0 ? fieldTotalWins / fieldWrestlerCount : 0;

    const rikishiTotal = rikishiTotalWins + rikishiTotalLosses;
    const fieldTotal = fieldTotalWins + fieldTotalLosses;
    const rikishiWinRate = rikishiTotal > 0 ? rikishiTotalWins / rikishiTotal : 0;
    const fieldWinRate = fieldTotal > 0 ? fieldTotalWins / fieldTotal : 0;

    // Consistency (standard deviation of win pct)
    const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const stddev = (arr: number[]) => {
      if (arr.length < 2) return 0;
      const m = mean(arr);
      const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
      return Math.sqrt(variance);
    };

    const rikishiConsistency = 1 - stddev(rikishiWinPcts);
    const fieldConsistency = 1 - stddev(fieldWinPcts);

    return {
      rikishiAvgWins,
      fieldAvgWins,
      rikishiWinRate,
      fieldWinRate,
      rikishiConsistency,
      fieldConsistency,
      bashoWithData,
    };
  }, [timeline, standingsMap, rikishiId]);

  if (!stats) return null;

  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="font-display text-xl font-bold tracking-tight text-white">Performance vs Division</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Comparing against {stats.bashoWithData} recent basho division averages.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Avg Wins / Basho"
          rikishiVal={stats.rikishiAvgWins}
          fieldVal={stats.fieldAvgWins}
        />
        <MetricCard
          label="Win Rate"
          rikishiVal={stats.rikishiWinRate}
          fieldVal={stats.fieldWinRate}
          format="pct"
        />
        <MetricCard
          label="Consistency"
          rikishiVal={stats.rikishiConsistency}
          fieldVal={stats.fieldConsistency}
          format="pct"
        />
      </div>
    </section>
  );
}
