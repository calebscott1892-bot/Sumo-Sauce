import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { prevBashoId, nextBashoId, bashoLabel } from '@/utils/basho';
import type { Division } from '../../../shared/api/v1';

type Props = {
  bashoId: string;
  division?: Division;
  mode?: 'overview' | 'division';
};

/**
 * Deterministic previous/next basho navigation arrows.
 * Renders as a compact bar with ← prev | current | next →.
 * Purely frontend — derives adjacent basho IDs from the bimonthly schedule.
 */
export default function BashoNav({ bashoId, division, mode = 'division' }: Props) {
  const prev = prevBashoId(bashoId);
  const next = nextBashoId(bashoId);
  const buildPath = (targetBashoId: string) =>
    mode === 'overview' || !division
      ? `/basho/${targetBashoId}`
      : `/basho/${targetBashoId}/${encodeURIComponent(division)}`;

  return (
    <nav
      data-testid="basho-nav"
      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 sm:px-4 sm:py-3"
    >
      {prev ? (
        <Link
          to={buildPath(prev)}
          className="flex min-w-0 items-center gap-1 text-xs text-red-400 transition-colors hover:text-red-300 sm:text-sm"
          data-testid="basho-nav-prev"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span className="hidden truncate sm:inline">{bashoLabel(prev)}</span>
          <span className="truncate sm:hidden">{prev}</span>
        </Link>
      ) : (
        <span className="text-sm text-zinc-600">—</span>
      )}

      <span className="px-1 text-center font-display text-xs font-bold tracking-tight text-zinc-200 sm:text-sm" data-testid="basho-nav-current">
        {bashoLabel(bashoId)}
      </span>

      {next ? (
        <Link
          to={buildPath(next)}
          className="flex min-w-0 items-center justify-end gap-1 text-right text-xs text-red-400 transition-colors hover:text-red-300 sm:text-sm"
          data-testid="basho-nav-next"
        >
          <span className="hidden truncate sm:inline">{bashoLabel(next)}</span>
          <span className="truncate sm:hidden">{next}</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Link>
      ) : (
        <span className="text-sm text-zinc-600">—</span>
      )}
    </nav>
  );
}
