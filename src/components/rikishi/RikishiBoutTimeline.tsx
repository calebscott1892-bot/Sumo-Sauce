import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { bashoLabel } from '@/utils/basho';
import type { TimelineItem } from '@/pages/rikishi/types';

type Props = {
  timeline: TimelineItem[];
  /** Maximum number of recent basho entries to show. Defaults to 20. */
  limit?: number;
};

/**
 * Visual timeline of a rikishi's most recent basho performances.
 * Shows a vertical timeline with color-coded results (kachi-koshi / make-koshi).
 */
export default function RikishiBoutTimeline({ timeline, limit = 20 }: Props) {
  const recent = [...timeline].reverse().slice(0, limit);

  return (
    <section data-testid="bout-timeline" className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-red-500" />
        <h2 className="font-display text-xl font-bold tracking-tight text-white">Recent Performance Timeline</h2>
      </div>
      <p className="mt-1 text-xs text-zinc-500">Last {Math.min(limit, recent.length)} basho entries</p>

      {recent.length === 0 ? (
        <div className="mt-3 text-sm text-zinc-400">No timeline data available.</div>
      ) : (
        <div className="relative mt-4 ml-3">
          {/* Vertical line */}
          <div className="absolute left-2.5 top-0 bottom-0 w-px bg-white/[0.08]" />

          <div className="space-y-3">
            {recent.map((entry, idx) => {
              const isKK = entry.wins > entry.losses;
              const isMK = entry.losses > entry.wins;
              const isEven = entry.wins === entry.losses;
              const total = entry.wins + entry.losses;
              const pct = total > 0 ? ((entry.wins / total) * 100).toFixed(0) : '0';

              const dotColor = isKK
                ? 'bg-emerald-400 ring-emerald-400/30'
                : isMK
                  ? 'bg-red-400 ring-red-400/30'
                  : 'bg-zinc-400 ring-zinc-400/30';

              const borderColor = isKK
                ? 'border-emerald-800/50'
                : isMK
                  ? 'border-red-800/50'
                  : 'border-white/[0.06]';

              return (
                <div key={`${entry.bashoId}-${entry.division}`} className="relative pl-8">
                  {/* Dot */}
                  <div
                    className={`absolute left-0 top-3 h-5 w-5 rounded-full ring-2 ${dotColor} flex items-center justify-center`}
                  >
                    {idx === 0 && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Card */}
                  <div className={`rounded-lg border ${borderColor} bg-white/[0.02] p-3`}>
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/basho/${encodeURIComponent(entry.bashoId)}/${encodeURIComponent(entry.division)}`}
                        className="text-sm font-semibold text-red-300 hover:text-red-200"
                      >
                        {bashoLabel(entry.bashoId)}
                      </Link>
                      <span className="text-xs text-zinc-500">{entry.division}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-sm text-zinc-300">
                        <span className="font-mono">{entry.rank}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100">
                          {entry.wins}-{entry.losses}
                        </span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                            isKK
                              ? 'bg-emerald-900/40 text-emerald-300'
                              : isMK
                                ? 'bg-red-900/40 text-red-300'
                                : 'bg-white/[0.04] text-zinc-400'
                          }`}
                        >
                          {isKK ? 'KK' : isMK ? 'MK' : 'Even'}
                        </span>
                      </div>
                    </div>

                    {/* Mini win-rate bar */}
                    <div className="mt-2 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-1 rounded-full ${isKK ? 'bg-emerald-500' : isMK ? 'bg-red-500' : 'bg-zinc-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
