import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, Compass } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  bashoTournamentName,
  divisionLabel,
  parseBashoId,
  bashoDisplayName,
} from '@/utils/basho';
import { getAvailableBashoIds } from '@/pages/basho/api';
import { PremiumBadge } from '@/components/ui/premium';

const DIVISIONS = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'] as const;
const BASHO_RE = /^\d{6}$/;

/**
 * Guided basho entry card for the home page.
 * Keeps the latest tournament, recent archive links, and direct jump in one place.
 */
export default function BashoQuickNav() {
  const navigate = useNavigate();

  const [jumpBasho, setJumpBasho] = useState('');
  const [jumpDivision, setJumpDivision] = useState<string>('makuuchi');
  const [jumpError, setJumpError] = useState('');

  const availabilityQuery = useQuery({
    queryKey: ['basho-available-ids', 'quick-nav'],
    queryFn: () => getAvailableBashoIds(8, 28),
    staleTime: 10 * 60 * 1000,
  });

  const recentIds = useMemo(() => availabilityQuery.data ?? [], [availabilityQuery.data]);
  const latestId = recentIds[0] ?? '';
  const archiveIds = recentIds.slice(1, 7);

  const handleJump = () => {
    const id = jumpBasho.trim();
    if (!BASHO_RE.test(id) || !parseBashoId(id)) {
      setJumpError('Enter a valid YYYYMM basho (e.g. 202401).');
      return;
    }
    setJumpError('');
    navigate(`/basho/${encodeURIComponent(id)}/${encodeURIComponent(jumpDivision)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJump();
  };

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 md:col-span-2 xl:col-span-3">
      <div className="mb-5 max-w-3xl">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-red-500" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            LATEST BASHO ENTRY
          </span>
        </div>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
          Start with the current tournament, then branch into any division
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          If you want immediate context, begin with the latest basho overview. If you already know a tournament id, use the direct jump below instead of guessing the route shape.
        </p>
      </div>

      {latestId ? (
        <div className="mb-5 rounded-xl border border-red-700/20 bg-red-950/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-red-400" />
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-300">Latest basho</p>
              </div>
              <h3 className="mt-2 font-display text-xl font-bold text-white">{bashoDisplayName(latestId)}</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Open the overview first if you want leaders, momentum, and cross-division context. Use the division links below when you already know where you want to land.
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <PremiumBadge variant="green">Current archive entry</PremiumBadge>
              <Link
                to={`/basho/${latestId}`}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-red-600/40 hover:text-white"
              >
                Open overview
              </Link>
              <Link
                to="/basho"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-red-600/40 hover:text-white"
              >
                Full basho browser
              </Link>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Jump straight into a division
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DIVISIONS.map((division) => (
                <Link
                  key={division}
                  to={`/basho/${encodeURIComponent(latestId)}/${encodeURIComponent(division)}`}
                  className="flex min-h-11 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-center text-sm font-medium text-zinc-200 transition-all hover:border-red-600/35 hover:bg-red-950/12 hover:text-white"
                >
                  {divisionLabel(division)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-amber-700/30 bg-amber-950/14 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-amber-300" />
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-200">Domain snapshot unavailable</p>
              </div>
              <h3 className="mt-2 font-display text-xl font-bold text-white">Latest basho route is not published yet</h3>
              <p className="mt-1 text-sm text-zinc-400">
                This deployment does not currently expose a routable latest tournament snapshot. Use the archive browser and profile/search paths while new basho domain data is pending.
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <PremiumBadge variant="amber">Honest fallback</PremiumBadge>
              <Link
                to="/basho"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-red-600/40 hover:text-white"
              >
                Open basho browser
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 border-t border-white/[0.04] pt-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Recent tournaments
          </p>
          <p className="mb-3 text-sm text-zinc-400">
            Open a recent basho when you want a tournament archive path but do not need to type an id manually.
          </p>
          {archiveIds.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {archiveIds.map((id) => {
              const tournament = bashoTournamentName(id);
              const parsed = parseBashoId(id);
              return (
                <Link
                  key={id}
                  to={`/basho/${id}`}
                  className="hover-lift group flex flex-col rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-all hover:border-red-600 hover:bg-red-950/20"
                  data-testid={`quick-basho-${id}`}
                >
                  <span className="text-sm font-semibold text-zinc-200 group-hover:text-white">
                    {tournament} {parsed?.year}
                  </span>
                  <span className="text-xs text-zinc-500 group-hover:text-zinc-400">{id}</span>
                </Link>
              );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-sm text-zinc-500">
              No archived basho routes are currently confirmed from the live domain API.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Jump to any basho
          </p>
          <p className="mb-3 text-sm text-zinc-400">
            Use a known tournament id when you want a specific historical basho or division.
          </p>
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
            <div className="w-full sm:w-auto">
              <label htmlFor="quick-basho-input" className="mb-1 block text-xs text-zinc-400">
                Basho (YYYYMM)
              </label>
              <input
                id="quick-basho-input"
                data-testid="quick-basho-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={jumpBasho}
                onChange={(e) => {
                  setJumpBasho(e.target.value);
                  setJumpError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="200301"
                className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none sm:w-28"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label htmlFor="quick-basho-division" className="mb-1 block text-xs text-zinc-400">
                Division
              </label>
              <select
                id="quick-basho-division"
                data-testid="quick-basho-division"
                value={jumpDivision}
                onChange={(e) => setJumpDivision(e.target.value)}
                className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none sm:w-auto"
              >
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {divisionLabel(d)}
                  </option>
                ))}
              </select>
            </div>
            <button
              data-testid="quick-basho-go"
              type="button"
              onClick={handleJump}
              className="flex min-h-11 w-full items-center justify-center gap-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 focus:outline-none sm:w-auto"
            >
              Go <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {jumpError && (
            <p className="mt-2 text-xs text-red-400" role="alert">
              {jumpError}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
