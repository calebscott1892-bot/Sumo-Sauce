import { Link } from 'react-router-dom';
import { Trophy, Users, ArrowRight } from 'lucide-react';
import { divisionLabel } from '@/utils/basho';
import { PremiumBadge } from '@/components/ui/premium';
import type { Division } from '../../../shared/api/v1';

type DivisionChampion = {
  division: Division;
  champion: { rikishiId: string; shikona: string; wins: number; losses: number } | null;
  wrestlerCount: number;
  loaded: boolean;
  error?: unknown;
};

type Props = {
  bashoId: string;
  divisions: DivisionChampion[];
};

const DIVISION_ORDER: Division[] = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];

const DIVISION_CONTEXT: Record<Division, { tier: string; summary: string; badge: 'red' | 'blue' | 'amber' | 'zinc' }> = {
  makuuchi: {
    tier: 'Top division',
    summary: 'Headline race, yusho pressure, and the deepest published analytics.',
    badge: 'red',
  },
  juryo: {
    tier: 'Second division',
    summary: 'Promotion pressure, salary tier battles, and upper-division movement.',
    badge: 'blue',
  },
  makushita: {
    tier: 'Promotion ladder',
    summary: 'The main proving ground below Juryo, with strong prospect movement.',
    badge: 'amber',
  },
  sandanme: {
    tier: 'Developmental',
    summary: 'Broad competitive field with steady mid-ladder progression.',
    badge: 'zinc',
  },
  jonidan: {
    tier: 'Developmental',
    summary: 'Large field tracking early-career advancement and recovery climbs.',
    badge: 'zinc',
  },
  jonokuchi: {
    tier: 'Entry division',
    summary: 'Starting point for new professionals and returning rikishi.',
    badge: 'zinc',
  },
};

/**
 * A 2×3 (or responsive) grid of division cards for a basho overview page.
 * Each card shows the division name, champion (if detected), and wrestler count,
 * and links to the full standings page.
 */
export default function DivisionGrid({ bashoId, divisions }: Props) {
  const divisionMap = new Map(divisions.map((d) => [d.division, d]));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
      {DIVISION_ORDER.map((div) => {
        const info = divisionMap.get(div);
        const champion = info?.champion;
        const count = info?.wrestlerCount ?? 0;
        const loaded = info?.loaded ?? false;
        const hasError = Boolean(info?.error);
        const context = DIVISION_CONTEXT[div];

        return (
          <Link
            key={div}
            to={`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(div)}`}
            className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-red-600 hover:bg-red-950/10 hover-lift"
            data-testid={`division-card-${div}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <PremiumBadge variant={context.badge}>{context.tier}</PremiumBadge>
                <h3 className="mt-3 text-lg font-bold text-white transition-colors group-hover:text-red-300">
                  {divisionLabel(div)}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  {context.summary}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Users className="h-3.5 w-3.5" />
                <span>{count}</span>
              </div>
            </div>

            {hasError ? (
              <div className="mt-4 rounded-lg border border-amber-800/40 bg-amber-950/18 px-3 py-2 text-xs text-amber-100">
                Overview request failed for this division. Open the division page to retry directly.
              </div>
            ) : loaded ? (
              champion ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2">
                  <Trophy className="h-4 w-4 shrink-0 text-amber-400" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-amber-400/80">
                      Current leader
                    </div>
                    <div className="truncate text-sm font-semibold text-amber-200">
                      {champion.shikona}
                    </div>
                    <div className="text-xs text-amber-400/80">
                      {champion.wins}-{champion.losses}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-zinc-500">
                  No standings data
                </div>
              )
            ) : (
              <div className="mt-4 h-10 animate-pulse rounded-lg bg-white/[0.06]" />
            )}

            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
              <span>
                {hasError
                  ? 'Overview request failed'
                  : loaded
                    ? `${count} rikishi listed`
                    : 'Loading standings'}
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-red-300 transition-colors group-hover:text-red-200">
                Browse standings
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
