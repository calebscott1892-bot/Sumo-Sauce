import { Link } from 'react-router-dom';
import { Trophy, Users } from 'lucide-react';
import { divisionLabel } from '@/utils/basho';
import type { Division } from '../../../shared/api/v1';

type DivisionChampion = {
  division: Division;
  champion: { rikishiId: string; shikona: string; wins: number; losses: number } | null;
  wrestlerCount: number;
  loaded: boolean;
};

type Props = {
  bashoId: string;
  divisions: DivisionChampion[];
};

const DIVISION_ORDER: Division[] = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];

/**
 * A 2×3 (or responsive) grid of division cards for a basho overview page.
 * Each card shows the division name, champion (if detected), and wrestler count,
 * and links to the full standings page.
 */
export default function DivisionGrid({ bashoId, divisions }: Props) {
  const divisionMap = new Map(divisions.map((d) => [d.division, d]));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {DIVISION_ORDER.map((div) => {
        const info = divisionMap.get(div);
        const champion = info?.champion;
        const count = info?.wrestlerCount ?? 0;
        const loaded = info?.loaded ?? false;

        return (
          <Link
            key={div}
            to={`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(div)}`}
            className="group rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-red-600 hover:bg-red-950/10"
            data-testid={`division-card-${div}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white group-hover:text-red-300 transition-colors">
                {divisionLabel(div)}
              </h3>
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Users className="h-3.5 w-3.5" />
                <span>{count}</span>
              </div>
            </div>

            {loaded ? (
              champion ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2">
                  <Trophy className="h-4 w-4 shrink-0 text-amber-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-amber-200">
                      {champion.shikona}
                    </div>
                    <div className="text-xs text-amber-400/80">
                      {champion.wins}-{champion.losses}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
                  No standings data
                </div>
              )
            ) : (
              <div className="mt-3 h-10 animate-pulse rounded-lg bg-zinc-800" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
