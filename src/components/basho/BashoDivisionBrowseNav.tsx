import { Link } from 'react-router-dom';
import { Layers3, Compass } from 'lucide-react';
import { divisionLabel, latestBashoId, bashoLabel } from '@/utils/basho';
import { PremiumBadge } from '@/components/ui/premium';
import type { Division } from '../../../shared/api/v1';

const DIVISIONS: readonly Division[] = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];

type Props = {
  bashoId: string;
  active: 'overview' | Division;
  counts?: Partial<Record<Division, number>>;
  className?: string;
};

const DIVISION_NOTES: Record<Division, string> = {
  makuuchi: 'Top-division headline race and detailed analytics.',
  juryo: 'Second-division promotion pressure and title race.',
  makushita: 'Promotion ladder depth and rising prospects.',
  sandanme: 'Developmental standings and mid-ladder movement.',
  jonidan: 'Broad field results and early-career progress.',
  jonokuchi: 'Entry division starting point for new careers.',
};

export default function BashoDivisionBrowseNav({ bashoId, active, counts, className = '' }: Props) {
  const currentLatest = latestBashoId();
  const isLatest = currentLatest === bashoId;

  return (
    <section
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 ${className}`.trim()}
      aria-label="Basho division navigation"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-red-400" />
            <h2 className="font-display text-lg font-bold tracking-tight text-white">Browse this basho</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Move between the overview and all six divisions without re-entering the tournament ID.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/basho/${encodeURIComponent(bashoId)}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active === 'overview'
                ? 'border-red-600/50 bg-red-950/20 text-red-200'
                : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-red-600/40 hover:text-white'
            }`}
          >
            Overview
          </Link>
          <Link
            to="/basho"
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Archive
          </Link>
          {isLatest ? (
            <PremiumBadge variant="green">Latest basho</PremiumBadge>
          ) : currentLatest ? (
            <Link
              to={`/basho/${encodeURIComponent(currentLatest)}`}
              className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              <Compass className="h-3.5 w-3.5" />
              Latest: {bashoLabel(currentLatest)}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {DIVISIONS.map((division) => {
          const count = counts?.[division];
          const isActive = active === division;

          return (
            <Link
              key={division}
              to={`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(division)}`}
              className={`rounded-xl border px-4 py-3.5 transition-all ${
                isActive
                  ? 'border-red-600/45 bg-red-950/18'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-red-600/35 hover:bg-red-950/10'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${isActive ? 'text-red-100' : 'text-white'}`}>
                    {divisionLabel(division)}
                  </div>
                  <p className="mt-1 hidden text-xs leading-relaxed text-zinc-500 sm:block">
                    {DIVISION_NOTES[division]}
                  </p>
                </div>
                {typeof count === 'number' && (
                  <PremiumBadge variant={count > 0 ? 'blue' : 'zinc'} className="shrink-0">
                    {count}
                  </PremiumBadge>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
