import { memo, useMemo } from 'react';
import type { TimelineItem } from '@/pages/rikishi/types';
import { parseBashoId, bashoTournamentName } from '@/utils/basho';

type Props = {
  timeline: TimelineItem[];
};

/** Map wins to a heat color (darker = fewer wins, brighter = more wins). */
function winsToColor(wins: number, maxWins: number): string {
  if (maxWins === 0) return '#27272a'; // zinc-800
  const ratio = wins / maxWins;
  if (ratio >= 0.85) return '#dc2626'; // red-600 — dominant
  if (ratio >= 0.7) return '#ef4444';  // red-500
  if (ratio >= 0.55) return '#f97316'; // orange-500
  if (ratio >= 0.4) return '#eab308';  // yellow-500
  if (ratio >= 0.25) return '#22c55e'; // green-500 — moderate
  return '#3f3f46'; // zinc-700 — low
}

type CellData = {
  bashoId: string;
  month: number;
  year: number;
  wins: number;
  losses: number;
  division: string;
  rank: string;
};

const MONTH_LABELS: Record<number, string> = {
  1: 'Jan', 3: 'Mar', 5: 'May', 7: 'Jul', 9: 'Sep', 11: 'Nov',
};

function CareerHeatmap({ timeline }: Props) {
  const { cells, years, maxWins } = useMemo(() => {
    if (!timeline.length) return { cells: [] as CellData[], years: [] as number[], maxWins: 0 };

    // Group by bashoId — take highest division entry per basho
    const byBasho = new Map<string, TimelineItem>();
    for (const item of timeline) {
      const existing = byBasho.get(item.bashoId);
      if (!existing || item.division < existing.division) {
        byBasho.set(item.bashoId, item);
      }
    }

    const parsed: CellData[] = [];
    let mx = 0;
    for (const [bashoId, item] of byBasho) {
      const p = parseBashoId(bashoId);
      if (!p) continue;
      parsed.push({
        bashoId,
        month: p.month,
        year: p.year,
        wins: item.wins,
        losses: item.losses,
        division: item.division,
        rank: item.rank,
      });
      if (item.wins > mx) mx = item.wins;
    }

    parsed.sort((a, b) => a.year - b.year || a.month - b.month);

    const allYears = Array.from(new Set(parsed.map((c) => c.year))).sort((a, b) => a - b);

    return { cells: parsed, years: allYears, maxWins: mx };
  }, [timeline]);

  if (!cells.length) {
    return null;
  }

  const months = [1, 3, 5, 7, 9, 11];
  const cellSize = 28;
  const gap = 3;
  const labelWidth = 48;
  const headerHeight = 28;
  const totalWidth = labelWidth + months.length * (cellSize + gap);
  const totalHeight = headerHeight + years.length * (cellSize + gap);

  // Build a lookup map for fast cell access
  const cellMap = new Map<string, CellData>();
  for (const c of cells) {
    cellMap.set(`${c.year}-${c.month}`, c);
  }

  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="font-display text-xl font-bold tracking-tight text-white">Career Performance Heatmap</h2>
      <p className="mt-1 text-xs text-zinc-500">Each cell shows wins per basho. Brighter = more wins.</p>

      <div className="mt-4 overflow-x-auto">
        <svg
          width={totalWidth}
          height={totalHeight}
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="text-zinc-400"
          role="img"
          aria-label="Career performance heatmap"
        >
          {/* Month headers */}
          {months.map((m, i) => (
            <text
              key={m}
              x={labelWidth + i * (cellSize + gap) + cellSize / 2}
              y={headerHeight - 8}
              textAnchor="middle"
              className="fill-zinc-500"
              fontSize={10}
            >
              {MONTH_LABELS[m]}
            </text>
          ))}

          {/* Rows (years) */}
          {years.map((year, rowIdx) => (
            <g key={year}>
              {/* Year label */}
              <text
                x={labelWidth - 8}
                y={headerHeight + rowIdx * (cellSize + gap) + cellSize / 2 + 4}
                textAnchor="end"
                className="fill-zinc-500"
                fontSize={10}
              >
                {year}
              </text>

              {/* Cells for each month */}
              {months.map((month, colIdx) => {
                const cell = cellMap.get(`${year}-${month}`);
                const x = labelWidth + colIdx * (cellSize + gap);
                const y = headerHeight + rowIdx * (cellSize + gap);

                if (!cell) {
                  return (
                    <rect
                      key={`${year}-${month}`}
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      rx={4}
                      fill="#18181b"
                      stroke="#27272a"
                      strokeWidth={1}
                    />
                  );
                }

                return (
                  <g key={`${year}-${month}`}>
                    <rect
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      rx={4}
                      fill={winsToColor(cell.wins, maxWins)}
                      className="transition-opacity hover:opacity-80"
                    >
                      <title>
                        {bashoTournamentName(cell.bashoId)} {year} — {cell.wins}W-{cell.losses}L ({cell.division}, {cell.rank})
                      </title>
                    </rect>
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 4}
                      textAnchor="middle"
                      fontSize={10}
                      className="fill-white font-medium pointer-events-none"
                      style={{ fontWeight: 600 }}
                    >
                      {cell.wins}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
        <span>Less</span>
        {['#3f3f46', '#22c55e', '#eab308', '#f97316', '#ef4444', '#dc2626'].map((c) => (
          <div
            key={c}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: c }}
          />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}

export default memo(CareerHeatmap);
