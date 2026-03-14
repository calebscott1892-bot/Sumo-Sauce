import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarRange, TrendingDown, TrendingUp } from 'lucide-react';
import type { TimelineItem } from '@/pages/rikishi/types';
import { bashoLabel, divisionLabel } from '@/utils/basho';
import { describeCareerMovement, sortCareerRowsChronologically } from '@/utils/careerProgression';
import { PremiumBadge } from '@/components/ui/premium';

type Props = {
  rows: TimelineItem[];
};

type TimelineLedgerItem = {
  row: TimelineItem;
  movement: ReturnType<typeof describeCareerMovement>;
};

function resultVariant(wins: number, losses: number): 'green' | 'red' | 'zinc' {
  if (wins > losses) return 'green';
  if (wins < losses) return 'red';
  return 'zinc';
}

export default function CareerTable({ rows }: Props) {
  const items = useMemo<TimelineLedgerItem[]>(() => {
    const sorted = sortCareerRowsChronologically(rows);
    return sorted.map((row, index) => ({
      row,
      movement: describeCareerMovement(index > 0 ? sorted[index - 1] : null, row),
    })).reverse();
  }, [rows]);

  const groups = useMemo(() => {
    const byYear = new Map<string, TimelineLedgerItem[]>();
    for (const item of items) {
      const year = item.row.bashoId.slice(0, 4);
      const existing = byYear.get(year) ?? [];
      existing.push(item);
      byYear.set(year, existing);
    }
    return [...byYear.entries()];
  }, [items]);

  if (!rows.length) {
    return (
      <section data-testid="career-table" className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.015] p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold tracking-tight text-white">Career Ledger</h2>
        <div className="mt-3 text-sm text-zinc-400">No basho-by-basho timeline is published for this rikishi yet.</div>
      </section>
    );
  }

  return (
    <section data-testid="career-table" className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.015] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-red-500" />
            <h2 className="font-display text-xl font-bold tracking-tight text-white">Career Ledger</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-500">
            Scan basho by basho, starting from the newest result. Each card links into the full tournament and the exact division page for that appearance.
          </p>
        </div>
        <Link
          to="/timeline"
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
        >
          Global basho timeline
        </Link>
      </div>

      <div className="mt-5 space-y-6">
        {groups.map(([year, yearItems]) => (
          <section key={year} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold tracking-tight text-white">{year}</h3>
              <span className="text-xs text-zinc-500">{yearItems.length} basho appearances</span>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {yearItems.map(({ row, movement }) => (
                <div
                  key={`${row.bashoId}-${row.division}-${row.rank}`}
                  className="rounded-xl border border-white/[0.06] bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="font-semibold text-red-400 transition-colors hover:text-red-300"
                          to={`/basho/${encodeURIComponent(row.bashoId)}`}
                        >
                          {bashoLabel(row.bashoId)}
                        </Link>
                        <PremiumBadge variant={resultVariant(row.wins, row.losses)}>
                          {row.wins}-{row.losses}
                        </PremiumBadge>
                        <PremiumBadge variant="zinc">{divisionLabel(row.division)}</PremiumBadge>
                      </div>
                      <div className="mt-2 text-sm text-zinc-300">
                        Rank <span className="font-semibold text-white">{row.rank}</span>
                      </div>
                    </div>

                    <Link
                      to={`/basho/${encodeURIComponent(row.bashoId)}/${encodeURIComponent(row.division)}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-red-300"
                    >
                      Division page
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-zinc-400">
                    {movement.state === 'promotion' ? (
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    ) : movement.state === 'demotion' ? (
                      <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    ) : (
                      <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-zinc-500" />
                    )}
                    <div>
                      <div className="font-medium text-white">{movement.label}</div>
                      <p className="mt-1 leading-relaxed text-zinc-500">{movement.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
