import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { prevBashoId, nextBashoId, bashoLabel } from '@/utils/basho';

type Props = {
  bashoId: string;
  division: string;
};

/**
 * Deterministic previous/next basho navigation arrows.
 * Renders as a compact bar with ← prev | current | next →.
 * Purely frontend — derives adjacent basho IDs from the bimonthly schedule.
 */
export default function BashoNav({ bashoId, division }: Props) {
  const prev = prevBashoId(bashoId);
  const next = nextBashoId(bashoId);

  return (
    <nav
      data-testid="basho-nav"
      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
    >
      {prev ? (
        <Link
          to={`/basho/${prev}/${encodeURIComponent(division)}`}
          className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors"
          data-testid="basho-nav-prev"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{bashoLabel(prev)}</span>
          <span className="sm:hidden">{prev}</span>
        </Link>
      ) : (
        <span className="text-sm text-zinc-600">—</span>
      )}

      <span className="text-sm font-medium text-zinc-300" data-testid="basho-nav-current">
        {bashoLabel(bashoId)}
      </span>

      {next ? (
        <Link
          to={`/basho/${next}/${encodeURIComponent(division)}`}
          className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors"
          data-testid="basho-nav-next"
        >
          <span className="hidden sm:inline">{bashoLabel(next)}</span>
          <span className="sm:hidden">{next}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="text-sm text-zinc-600">—</span>
      )}
    </nav>
  );
}
