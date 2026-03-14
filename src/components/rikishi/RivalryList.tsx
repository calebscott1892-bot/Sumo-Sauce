import { Link } from 'react-router-dom';
import { Swords, ArrowRight } from 'lucide-react';
import PremiumBadge from '@/components/ui/premium/PremiumBadge';
import { buildRivalryInsight, getRivalryStateVariant } from '@/utils/rivalry';

type RivalryItem = {
  opponentId: string;
  opponentShikona: string;
  totalMatches: number;
  wins: number;
  losses: number;
};

type Props = {
  rikishiId: string;
  shikona?: string;
  rivals: RivalryItem[];
  isLoading?: boolean;
};

/**
 * Displays detected rivalries — opponents with 10+ head-to-head matches.
 * Links each rivalry to the full compare page.
 */
export default function RivalryList({ rikishiId, shikona, rivals, isLoading }: Props) {
  if (isLoading) {
    return (
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="font-display text-xl font-bold tracking-tight text-white">Rivalries</h2>
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      </section>
    );
  }

  const qualifying = rivals.filter((r) => r.totalMatches >= 10);

  return (
    <section data-testid="rivalry-list" className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-red-500" />
            <h2 className="font-display text-xl font-bold tracking-tight text-white">Rivalries</h2>
            {qualifying.length > 0 && (
              <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-xs text-red-300">
                {qualifying.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Opponents with 10+ head-to-head matches</p>
        </div>

        <Link
          to={`/rivalries?q=${encodeURIComponent(shikona || rikishiId)}`}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
        >
          Explore all rivalries
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 space-y-2">
        {qualifying.length === 0 && (
          <div className="text-sm text-zinc-400">No rivalries detected yet.</div>
        )}
        {qualifying.map((rival) => {
          const insight = buildRivalryInsight({
            winsA: rival.wins,
            winsB: rival.losses,
            totalMatches: rival.totalMatches,
            labelA: shikona || rikishiId,
            labelB: rival.opponentShikona,
          });
          const winPct = rival.totalMatches > 0
            ? ((rival.wins / rival.totalMatches) * 100).toFixed(0)
            : '0';
          const isWinning = rival.wins > rival.losses;
          const isTied = rival.wins === rival.losses;

          return (
            <Link
              key={rival.opponentId}
              to={`/compare/${encodeURIComponent(rikishiId)}/${encodeURIComponent(rival.opponentId)}`}
              className="block rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-all hover:border-red-600 hover-lift"
              data-testid={`rivalry-${rival.opponentId}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-zinc-100">{rival.opponentShikona}</div>
                  <div className="text-xs text-zinc-500">{rival.opponentId}</div>
                </div>
                <div className="sm:ml-3 sm:text-right">
                  <div className="font-semibold text-zinc-100">
                    {rival.wins}-{rival.losses}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {rival.totalMatches} bouts
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PremiumBadge variant={getRivalryStateVariant(insight.state)}>{insight.label}</PremiumBadge>
                <span className="text-xs text-zinc-500">{winPct}% win rate</span>
              </div>

              {/* Win rate bar */}
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      isWinning ? 'bg-emerald-500' : isTied ? 'bg-zinc-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${winPct}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                  <span>{insight.detail}</span>
                  <span className="flex items-center gap-1">
                    <span className={isWinning ? 'text-emerald-400' : isTied ? 'text-zinc-400' : 'text-red-400'}>
                      {isWinning ? 'Ahead' : isTied ? 'Tied' : 'Behind'}
                    </span>
                    <ArrowRight className="h-3 w-3 text-zinc-600" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
