import { useMemo } from 'react';
import type { KimariteStats } from '@/pages/rikishi/types';

type Props = {
  stats: KimariteStats;
};

function TopBars({ title, rows }: { title: string; rows: Array<{ kimariteId: string; count: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div>
      <h4 className="text-sm font-semibold text-zinc-200">{title}</h4>
      <div className="mt-2 space-y-2">
        {rows.map((row) => (
          <div key={row.kimariteId}>
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span>{row.kimariteId}</span>
              <span>{row.count}</span>
            </div>
            <div className="mt-1 h-2 w-full rounded bg-zinc-800">
              <div className="h-2 rounded bg-red-500" style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {!rows.length && <div className="text-xs text-zinc-500">No data.</div>}
      </div>
    </div>
  );
}

export default function KimariteChart({ stats }: Props) {
  const topWins = useMemo(() => stats.winKimarite.slice(0, 5), [stats.winKimarite]);
  const topLosses = useMemo(() => stats.lossKimarite.slice(0, 5), [stats.lossKimarite]);

  return (
    <section data-testid="kimarite-chart" className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-xl font-bold text-white">Kimarite Breakdown</h2>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-zinc-400">Total wins</div>
          <div className="font-semibold text-zinc-100">{stats.totalWins}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-zinc-400">Total losses</div>
          <div className="font-semibold text-zinc-100">{stats.totalLosses}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-zinc-400">Most used kimarite</div>
          <div className="font-semibold text-zinc-100">{stats.mostUsedKimarite || '—'}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
        <TopBars title="Top 5 win kimarite" rows={topWins} />
        <TopBars title="Top 5 loss kimarite" rows={topLosses} />
      </div>
    </section>
  );
}
