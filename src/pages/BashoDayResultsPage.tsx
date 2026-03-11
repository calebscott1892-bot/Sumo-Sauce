import { useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { trackBashoDayResultsView } from '@/utils/analytics';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getBoutsByDivision, getDivisionStandings } from '@/pages/basho/api';
import { bashoDisplayName, divisionLabel } from '@/utils/basho';
import { isValidBashoId } from '@/utils/security';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import EmptyState from '@/components/ui/EmptyState';
import type { Division, Bout, DivisionStandingRow } from '../../shared/api/v1';

const DIVISIONS: Division[] = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];
const MAX_DAYS = 15;

function shikonaLookup(rows: DivisionStandingRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.rikishiId, row.shikona);
  }
  return map;
}

export default function BashoDayResultsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const bashoId = String(params.bashoId || '').trim();
  const division = String(params.division || 'makuuchi').trim() as Division;
  const day = Number(params.day) || 1;

  useEffect(() => { trackBashoDayResultsView(bashoId, division, Number(day)); }, [bashoId, division, day]);

  const isValid = isValidBashoId(bashoId) && DIVISIONS.includes(division) && day >= 1 && day <= MAX_DAYS;

  const boutsQuery = useQuery({
    queryKey: ['bouts', bashoId, division],
    queryFn: () => getBoutsByDivision(bashoId, division),
    enabled: isValid,
    staleTime: 5 * 60 * 1000,
  });

  const standingsQuery = useQuery({
    queryKey: ['basho-division-standings', bashoId, division],
    queryFn: () => getDivisionStandings(bashoId, division),
    enabled: isValid,
    staleTime: 5 * 60 * 1000,
  });

  const shikonaMap = useMemo(() => {
    return shikonaLookup(standingsQuery.data ?? []);
  }, [standingsQuery.data]);

  const dayBouts = useMemo(() => {
    if (!boutsQuery.data) return [];
    return boutsQuery.data
      .filter((b: Bout) => b.day === day)
      .sort((a: Bout, b: Bout) => a.boutNo - b.boutNo);
  }, [boutsQuery.data, day]);

  const availableDays = useMemo(() => {
    if (!boutsQuery.data) return [];
    const days = new Set(boutsQuery.data.map((b: Bout) => b.day));
    return Array.from(days).sort((a, b) => a - b);
  }, [boutsQuery.data]);

  const hasPrev = day > 1;
  const hasNext = day < MAX_DAYS && availableDays.includes(day + 1);

  if (!isValid) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-zinc-400">Invalid parameters for daily results.</div>
          <Link className="mt-2 inline-block text-red-400 hover:text-red-300" to="/">← Home</Link>
        </div>
      </div>
    );
  }

  const isLoading = boutsQuery.isLoading || standingsQuery.isLoading;

  if (boutsQuery.error || standingsQuery.error) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title={`SumoWatch — ${bashoDisplayName(bashoId)} ${divisionLabel(division)} Day ${day}`}
        description={`Day ${day} results for ${divisionLabel(division)} division at ${bashoDisplayName(bashoId)}.`}
      />

      {/* Breadcrumbs */}
      <nav className="mb-2 flex items-center gap-1 text-sm text-zinc-400">
        <Link className="text-red-400 hover:text-red-300" to="/">Home</Link>
        <span>/</span>
        <Link className="text-red-400 hover:text-red-300" to="/basho">Basho</Link>
        <span>/</span>
        <Link className="text-red-400 hover:text-red-300" to={`/basho/${encodeURIComponent(bashoId)}`}>{bashoId}</Link>
        <span>/</span>
        <Link className="text-red-400 hover:text-red-300" to={`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(division)}`}>
          {divisionLabel(division)}
        </Link>
        <span>/</span>
        <span className="text-zinc-200">Day {day}</span>
      </nav>

      {/* Header with day navigation */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-2xl font-black text-white sm:text-3xl">
          {bashoDisplayName(bashoId)} — {divisionLabel(division)}
        </h1>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(division)}/day/${day - 1}`)}
            disabled={!hasPrev}
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-zinc-300 transition-colors hover:border-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xl font-bold text-white">Day {day}</span>
          <button
            type="button"
            onClick={() => navigate(`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(division)}/day/${day + 1}`)}
            disabled={!hasNext}
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-zinc-300 transition-colors hover:border-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day pills */}
        {availableDays.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {availableDays.map((d) => (
              <Link
                key={d}
                to={`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(division)}/day/${d}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  d === day
                    ? 'bg-red-600 text-white'
                    : 'border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-red-600 hover:text-white'
                }`}
              >
                {d}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Bout results */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900" />
          ))}
        </div>
      ) : dayBouts.length === 0 ? (
        <EmptyState
          message="No bouts for this day"
          description={`No ${divisionLabel(division)} bouts found for Day ${day} of ${bashoDisplayName(bashoId)}.`}
        />
      ) : (
        <section className="space-y-2">
          <div className="text-sm text-zinc-500">{dayBouts.length} bout{dayBouts.length !== 1 ? 's' : ''}</div>
          {dayBouts.map((bout: Bout) => {
            const eastName = shikonaMap.get(bout.eastRikishiId) ?? bout.eastRikishiId;
            const westName = shikonaMap.get(bout.westRikishiId) ?? bout.westRikishiId;
            const eastWon = bout.winnerRikishiId === bout.eastRikishiId;
            const westWon = bout.winnerRikishiId === bout.westRikishiId;

            return (
              <div
                key={bout.boutId}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* East */}
                  <div className="flex-1 text-right">
                    <Link
                      to={`/rikishi/${encodeURIComponent(bout.eastRikishiId)}`}
                      className={`text-sm font-semibold transition-colors hover:text-red-300 ${
                        eastWon ? 'text-emerald-400' : 'text-zinc-300'
                      }`}
                    >
                      {eastName}
                    </Link>
                    <div className="text-[10px] text-zinc-600">East</div>
                  </div>

                  {/* Center: kimarite */}
                  <div className="flex flex-col items-center">
                    <div className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                      #{bout.boutNo}
                    </div>
                    {bout.kimariteId && (
                      <div className="mt-1 text-xs font-medium text-amber-400">{bout.kimariteId}</div>
                    )}
                    {!bout.winnerRikishiId && (
                      <div className="mt-1 text-[10px] text-zinc-600">No result</div>
                    )}
                  </div>

                  {/* West */}
                  <div className="flex-1">
                    <Link
                      to={`/rikishi/${encodeURIComponent(bout.westRikishiId)}`}
                      className={`text-sm font-semibold transition-colors hover:text-red-300 ${
                        westWon ? 'text-emerald-400' : 'text-zinc-300'
                      }`}
                    >
                      {westName}
                    </Link>
                    <div className="text-[10px] text-zinc-600">West</div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
