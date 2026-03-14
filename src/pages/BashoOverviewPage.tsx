import { Link, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { AlertTriangle, LineChart, ArrowRight } from 'lucide-react';
import { getDivisionStandings } from '@/pages/basho/api';
import DivisionGrid from '@/components/basho/DivisionGrid';
import BashoDivisionBrowseNav from '@/components/basho/BashoDivisionBrowseNav';
import PromotionWatchlist from '@/components/basho/PromotionWatchlist';
import BashoDifficultyCard from '@/components/basho/BashoDifficultyCard';
import BashoStorylines from '@/components/basho/BashoStorylines';
import UpsetList from '@/components/basho/UpsetList';
import BashoNav from '@/components/navigation/BashoNav';
import { bashoDisplayName, bashoTournamentName, bashoLabel, divisionLabel, parseBashoId } from '@/utils/basho';
import { isValidBashoId } from '@/utils/security';
import { trackBashoPageView } from '@/utils/analytics';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import { isFavoriteBasho, toggleFavoriteBasho } from '@/utils/favorites';
import { trackBashoView } from '@/utils/recentlyViewed';
import { PremiumPageHeader, PremiumSectionShell, PremiumBadge } from '@/components/ui/premium';
import type { Division, DivisionStandingRow } from '../../shared/api/v1';

const BashoPerformanceChart = lazy(() => import('@/components/basho/BashoPerformanceChart'));

const DIVISIONS: Division[] = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];

type ChampionSummary = {
  rikishiId: string;
  shikona: string;
  wins: number;
  losses: number;
};

type DivisionSnapshot = {
  division: Division;
  champion: ChampionSummary | null;
  wrestlerCount: number;
  loaded: boolean;
  error: unknown;
  rows: DivisionStandingRow[];
};

const DIVISION_BADGE_VARIANTS: Record<Division, 'red' | 'blue' | 'amber' | 'zinc'> = {
  makuuchi: 'red',
  juryo: 'blue',
  makushita: 'amber',
  sandanme: 'zinc',
  jonidan: 'zinc',
  jonokuchi: 'zinc',
};

const LOWER_DIVISION_DESCRIPTIONS: Record<Exclude<Division, 'makuuchi' | 'juryo'>, string> = {
  makushita: 'Promotion ladder just below Juryo, where many future sekitori break through.',
  sandanme: 'Mid-ladder division with steady movement and broad field depth.',
  jonidan: 'Large field tracking early-career progression and rebuild campaigns.',
  jonokuchi: 'Entry division where new professional careers and comebacks begin.',
};

function detectChampion(rows: DivisionStandingRow[]): ChampionSummary | null {
  if (!rows.length) return null;
  let best = rows[0];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].wins > best.wins) {
      best = rows[i];
    }
  }
  return { rikishiId: best.rikishiId, shikona: best.shikona, wins: best.wins, losses: best.losses };
}

function sortStandings(rows: DivisionStandingRow[]): DivisionStandingRow[] {
  return [...rows].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.rank.localeCompare(b.rank));
}

function DivisionLeaderboardPreview({ bashoId, snapshot }: { bashoId: string; snapshot: DivisionSnapshot }) {
  const sortedRows = useMemo(() => sortStandings(snapshot.rows).slice(0, 6), [snapshot.rows]);
  const badgeVariant = DIVISION_BADGE_VARIANTS[snapshot.division];

  if (snapshot.error) {
    return (
      <article className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div>
            <PremiumBadge variant={badgeVariant}>
              {snapshot.division === 'makuuchi' ? 'Top division' : 'Second division'}
            </PremiumBadge>
            <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-white">
              {divisionLabel(snapshot.division)}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              {snapshot.division === 'makuuchi'
                ? 'Headline race and top-division picture.'
                : 'Promotion pressure and upper-division depth.'}
            </p>
          </div>
          <Link
            to={`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(snapshot.division)}`}
            className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-red-400 transition-colors hover:text-red-300"
          >
            Full standings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 rounded-lg border border-amber-800/40 bg-amber-950/18 px-3 py-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-amber-400/80">Division unavailable</div>
          <p className="mt-1 text-sm leading-relaxed text-amber-100">
            This division did not load in the overview request. The rest of the basho remains available below.
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <PremiumBadge variant={badgeVariant}>
            {snapshot.division === 'makuuchi' ? 'Top division' : 'Second division'}
          </PremiumBadge>
          <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-white">
            {divisionLabel(snapshot.division)}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            {snapshot.division === 'makuuchi'
              ? 'Headline race and top-division picture.'
              : 'Promotion pressure and upper-division depth.'}
          </p>
        </div>
        <Link
          to={`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(snapshot.division)}`}
          className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-red-400 transition-colors hover:text-red-300"
        >
          Full standings
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {snapshot.champion ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
          <span>Current leader</span>
          <Link
            to={`/rikishi/${encodeURIComponent(snapshot.champion.rikishiId)}`}
            className="font-medium text-red-300 transition-colors hover:text-red-200"
          >
            {snapshot.champion.shikona}
          </Link>
          <PremiumBadge variant="amber">{snapshot.champion.wins}-{snapshot.champion.losses}</PremiumBadge>
        </div>
      ) : (
        <div className="mt-4 text-sm text-zinc-500">Standings data is not available for this division yet.</div>
      )}

      {sortedRows.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-white/[0.04]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03] text-left text-xs uppercase tracking-wider text-zinc-400">
                <th className="px-3 py-2.5">Rank</th>
                <th className="px-3 py-2.5">Shikona</th>
                <th className="px-3 py-2.5">W</th>
                <th className="px-3 py-2.5">L</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const isLeader = snapshot.champion?.rikishiId === row.rikishiId;
                return (
                  <tr
                    key={row.rikishiId}
                    className={`border-b border-white/[0.04] ${isLeader ? 'bg-amber-950/12' : 'text-zinc-200 hover:bg-white/[0.04]'}`}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5">{row.rank}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Link
                        to={`/rikishi/${encodeURIComponent(row.rikishiId)}`}
                        className={`transition-colors ${isLeader ? 'font-semibold text-amber-200 hover:text-amber-100' : 'text-red-300 hover:text-red-200'}`}
                      >
                        {row.shikona}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium">{row.wins}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.losses}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-sm text-zinc-500">
          No leader table available yet.
        </div>
      )}
    </article>
  );
}

function LowerDivisionCard({ bashoId, snapshot }: { bashoId: string; snapshot: DivisionSnapshot }) {
  const description = LOWER_DIVISION_DESCRIPTIONS[snapshot.division as Exclude<Division, 'makuuchi' | 'juryo'>];

  if (snapshot.error) {
    return (
      <article className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <PremiumBadge variant={DIVISION_BADGE_VARIANTS[snapshot.division]}>Division</PremiumBadge>
        <h3 className="mt-3 font-display text-lg font-bold text-white">
          {divisionLabel(snapshot.division)}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          {description}
        </p>

        <div className="mt-4 rounded-lg border border-amber-800/40 bg-amber-950/18 px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-amber-400/80">Overview request failed</div>
          <div className="mt-1 text-sm text-amber-100">This division did not load here, but you can retry from the direct division page.</div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
          <span>Retry on division page</span>
          <Link
            to={`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(snapshot.division)}`}
            className="inline-flex items-center gap-1 font-medium text-red-300 transition-colors hover:text-red-200"
          >
            Open division
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </article>
    );
  }

  return (
    <Link
      to={`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(snapshot.division)}`}
      className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-red-600/35 hover:bg-red-950/10"
    >
      <PremiumBadge variant={DIVISION_BADGE_VARIANTS[snapshot.division]}>Division</PremiumBadge>
      <h3 className="mt-3 font-display text-lg font-bold text-white transition-colors group-hover:text-red-300">
        {divisionLabel(snapshot.division)}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        {description}
      </p>

      {snapshot.champion ? (
        <div className="mt-4 rounded-lg border border-amber-800/40 bg-amber-950/18 px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-amber-400/80">Current leader</div>
          <div className="mt-1 text-sm font-semibold text-amber-100">{snapshot.champion.shikona}</div>
          <div className="text-xs text-amber-300/80">{snapshot.champion.wins}-{snapshot.champion.losses}</div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-sm text-zinc-500">
          No standings data available
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>{snapshot.wrestlerCount} rikishi listed</span>
        <span className="inline-flex items-center gap-1 font-medium text-red-300 transition-colors group-hover:text-red-200">
          Open division
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

<<<<<<< HEAD
function RecordsPathCard({ bashoId, snapshot }: { bashoId: string; snapshot: DivisionSnapshot }) {
  if (!snapshot.champion) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <PremiumBadge variant={DIVISION_BADGE_VARIANTS[snapshot.division]}>{divisionLabel(snapshot.division)}</PremiumBadge>
        <PremiumBadge variant="zinc">Current leader</PremiumBadge>
      </div>
      <div className="mt-3 font-display text-lg font-bold text-white">{snapshot.champion.shikona}</div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        This path treats the overview leader as a browse entry point: open the wrestler's records section, the division standings, or the sample-wide championship trail.
      </p>
      <div className="mt-4 text-sm text-zinc-300">
        <span className="font-semibold text-white">{snapshot.champion.wins}-{snapshot.champion.losses}</span>
        <span className="ml-2 text-zinc-500">best published record in this overview snapshot</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Link
          to={`/rikishi/${encodeURIComponent(snapshot.champion.rikishiId)}#records`}
          className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
        >
          Wrestler records
        </Link>
        <Link
          to={`/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(snapshot.division)}`}
          className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
        >
          Division page
        </Link>
        <Link
          to="/analytics#championship-trail"
          className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
        >
          Analytics trail
        </Link>
      </div>
    </div>
  );
}

=======
>>>>>>> origin/main
export default function BashoOverviewPage() {
  const params = useParams();
  const bashoId = String(params.bashoId || '').trim();

  const isValid = isValidBashoId(bashoId);
  const parsed = parseBashoId(bashoId);
  const [isFav, setIsFav] = useState(() => isFavoriteBasho(bashoId));

  const queries = useQueries({
    queries: DIVISIONS.map((div) => ({
      queryKey: ['basho-division-standings', bashoId, div],
      queryFn: () => getDivisionStandings(bashoId, div),
      enabled: isValid,
      retry: 1,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const allSettled = queries.every((q) => !q.isLoading);

  const divisionData = useMemo<DivisionSnapshot[]>(() => {
    return DIVISIONS.map((div, i) => {
      const q = queries[i];
      const rows = q.data ?? [];
      return {
        division: div,
        champion: rows.length > 0 ? detectChampion(rows) : null,
        wrestlerCount: rows.length,
        loaded: !q.isLoading && !q.error,
        error: q.error,
        rows,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bashoId, ...queries.map((q) => q.dataUpdatedAt), ...queries.map((q) => q.isLoading)]);

  const totalWrestlers = divisionData.reduce((sum, division) => sum + division.wrestlerCount, 0);
  const divisionsLoaded = divisionData.filter((division) => division.loaded).length;
  const divisionsWithData = divisionData.filter((division) => division.loaded && division.wrestlerCount > 0).length;
  const failedDivisions = divisionData.filter((division) => division.error);
  const countsByDivision = useMemo(
    () => Object.fromEntries(divisionData.map((division) => [division.division, division.wrestlerCount])) as Partial<Record<Division, number>>,
    [divisionData],
  );
  const makuuchiData = divisionData.find((division) => division.division === 'makuuchi') ?? null;
  const juryoData = divisionData.find((division) => division.division === 'juryo') ?? null;
  const upperDivisionData = divisionData.filter((division) => division.division === 'makuuchi' || division.division === 'juryo');
  const lowerDivisionData = divisionData.filter((division) => division.division !== 'makuuchi' && division.division !== 'juryo');

  useEffect(() => {
    setIsFav(isFavoriteBasho(bashoId));
  }, [bashoId]);

  useEffect(() => {
    if (isValid) {
      trackBashoPageView(bashoId, 'overview');
      trackBashoView(bashoId, bashoDisplayName(bashoId));
    }
  }, [bashoId, isValid]);

  if (!isValid) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-zinc-400">
            Invalid basho ID. Expected format: <span className="font-mono text-zinc-300">YYYYMM</span> (e.g. 202401).
          </div>
          <Link className="mt-2 inline-block text-red-400 hover:text-red-300" to="/">← Home</Link>
        </div>
      </div>
    );
  }

  if (allSettled && failedDivisions.length === DIVISIONS.length) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  const tournamentName = bashoTournamentName(bashoId);
  const label = bashoLabel(bashoId);

  return (
    <div data-testid="basho-overview-page" className="mx-auto max-w-6xl space-y-5 p-4 text-zinc-200 sm:space-y-6 sm:p-6">
      <PremiumPageHeader
        accentLabel="BASHO OVERVIEW"
        title={`${tournamentName} ${parsed?.year ?? ''}`}
        subtitle="Cross-division standings, champions, and tournament navigation in one place."
        badge={label}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Basho', to: '/basho' },
          { label: bashoId },
        ]}
        favorite={{
          active: isFav,
          onToggle: () => {
            toggleFavoriteBasho(bashoId);
            setIsFav(!isFav);
          },
        }}
      >
        {allSettled && (
          <div className="flex flex-col gap-2 text-sm text-zinc-400 sm:flex-row sm:flex-wrap sm:gap-4">
            <span><span className="font-semibold text-white">{totalWrestlers}</span> wrestlers tracked</span>
            <span><span className="font-semibold text-white">{divisionsLoaded}</span> divisions loaded</span>
            {makuuchiData?.champion && (
              <span>Makuuchi leader <span className="font-semibold text-white">{makuuchiData.champion.shikona}</span></span>
            )}
            {juryoData?.champion && (
              <span>Juryo leader <span className="font-semibold text-white">{juryoData.champion.shikona}</span></span>
            )}
            {failedDivisions.length > 0 && (
              <span><span className="font-semibold text-amber-200">{failedDivisions.length}</span> divisions unavailable</span>
            )}
          </div>
        )}
      </PremiumPageHeader>

      <PageMeta
        title={`SumoWatch — ${bashoDisplayName(bashoId)}`}
        description={`${tournamentName} ${parsed?.year} basho overview — cross-division leaders, standings access, and top-division tournament analytics.`}
      />

      <BashoNav bashoId={bashoId} mode="overview" />
      <BashoDivisionBrowseNav bashoId={bashoId} active="overview" counts={countsByDivision} />

      {allSettled && failedDivisions.length > 0 ? (
        <section className="rounded-2xl border border-amber-800/35 bg-amber-950/16 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div className="text-sm leading-relaxed text-amber-100">
              <div className="font-semibold text-amber-100">Partial overview loaded</div>
              <p className="mt-1 text-amber-100/85">
                Available divisions continue to render, but the overview request failed for{' '}
                {failedDivisions.map((division) => divisionLabel(division.division)).join(', ')}.
              </p>
            </div>
          </div>
        </section>
      ) : null}

<<<<<<< HEAD
      {(makuuchiData?.champion || juryoData?.champion) ? (
        <section id="records-context" className="scroll-mt-24">
          <PremiumSectionShell
            title="Record & milestone paths"
            subtitle="Move from this basho into the leader's wrestler records view, the relevant division standings, or the broader analytics championship trail."
          >
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
              {upperDivisionData.filter((division) => division.champion).map((division) => (
                <RecordsPathCard key={division.division} bashoId={bashoId} snapshot={division} />
              ))}

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PremiumBadge variant="blue">Broader browse</PremiumBadge>
                  <PremiumBadge variant="zinc">Cross-surface</PremiumBadge>
                </div>
                <div className="mt-3 font-display text-lg font-bold text-white">Open achievement context beyond one basho</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  Use analytics for recent title trails and the leaderboard for imported yusho or prize context that does not live inside every routeable modern profile.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <Link
                    to="/analytics#championship-trail"
                    className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                  >
                    Championship trail
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                  >
                    Leaderboard
                  </Link>
                  <Link
                    to="/rikishi"
                    className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                  >
                    Browse rikishi
                  </Link>
                </div>
              </div>
            </div>
          </PremiumSectionShell>
        </section>
      ) : null}

=======
>>>>>>> origin/main
      <PremiumSectionShell
        title="Upper-division races"
        subtitle="Makuuchi and Juryo are surfaced side by side so the overview does not collapse into a single-division page."
      >
        {isLoading && upperDivisionData.every((division) => !division.loaded) ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {upperDivisionData.map((division) => (
              <DivisionLeaderboardPreview key={division.division} bashoId={bashoId} snapshot={division} />
            ))}
          </div>
        )}
      </PremiumSectionShell>

      <PremiumSectionShell title="All divisions" subtitle="All six divisions at a glance, with context for what each layer covers.">
        {isLoading && divisionData.every((division) => !division.loaded) ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
            ))}
          </div>
        ) : (
          <DivisionGrid bashoId={bashoId} divisions={divisionData} />
        )}
      </PremiumSectionShell>

      <PremiumSectionShell
        title="Lower-division ladder"
        subtitle="Makushita through Jonokuchi remain directly browseable from the same tournament context."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {lowerDivisionData.map((division) => (
            <LowerDivisionCard key={division.division} bashoId={bashoId} snapshot={division} />
          ))}
        </div>
      </PremiumSectionShell>

      {makuuchiData?.rows.length ? (
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <LineChart className="h-4 w-4 text-red-400" />
            <h2 className="font-display text-lg font-bold tracking-tight text-white">Makuuchi deep dive</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
            Storylines, difficulty, upset tracking, and promotion-watch modules currently go deepest on Makuuchi. Juryo and the lower divisions remain fully browseable above through standings-led views.
          </p>
        </section>
      ) : null}

      {makuuchiData?.rows.length ? (
        <BashoDifficultyCard rows={makuuchiData.rows} bashoId={bashoId} />
      ) : null}

      {makuuchiData?.rows.length ? (
        <BashoStorylines rows={makuuchiData.rows} bashoId={bashoId} />
      ) : null}

      {makuuchiData?.rows.length ? (
        <PremiumSectionShell
          title="Makuuchi leaderboard"
          subtitle="Top-division standings preview, with Juryo surfaced separately above."
          trailing={
            <Link
              to={`/basho/${encodeURIComponent(bashoId)}/makuuchi`}
              className="text-sm font-medium text-red-400 transition-colors hover:text-red-300"
            >
              View full standings →
            </Link>
          }
        >
          <div className="overflow-x-auto rounded-lg border border-white/[0.04]">
            <table className="min-w-full text-sm" aria-label="Makuuchi top 10 standings">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400" scope="col">#</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400" scope="col">Rank</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400" scope="col">Shikona</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400" scope="col">W</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400" scope="col">L</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400" scope="col">Win %</th>
                </tr>
              </thead>
              <tbody>
                {sortStandings(makuuchiData.rows)
                  .slice(0, 10)
                  .map((row, index) => {
                    const pct = row.wins + row.losses > 0
                      ? ((row.wins / (row.wins + row.losses)) * 100).toFixed(1)
                      : '0.0';
                    const isChampion = makuuchiData.champion?.rikishiId === row.rikishiId;

                    return (
                      <tr
                        key={row.rikishiId}
                        className={`border-b border-white/[0.04] transition-colors duration-150 ${
                          isChampion
                            ? 'bg-amber-950/20 text-amber-200'
                            : index % 2 === 0
                              ? 'text-zinc-200 hover:bg-white/[0.04]'
                              : 'bg-white/[0.01] text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                      >
                        <td className="whitespace-nowrap px-3 py-2.5">{index + 1}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{row.rank}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <Link
                            className={`transition-colors hover:text-red-200 ${isChampion ? 'font-semibold text-amber-300' : 'text-red-400'}`}
                            to={`/rikishi/${encodeURIComponent(row.rikishiId)}`}
                          >
                            {row.shikona}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-medium">{row.wins}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{row.losses}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{pct}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </PremiumSectionShell>
      ) : null}

      {makuuchiData?.rows.length ? (
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />}>
          <BashoPerformanceChart rows={makuuchiData.rows} limit={20} />
        </Suspense>
      ) : null}

      {makuuchiData?.rows.length ? (
        <PromotionWatchlist rows={makuuchiData.rows} bashoId={bashoId} />
      ) : null}

      {makuuchiData?.rows.length ? (
        <UpsetList rows={makuuchiData.rows} bashoId={bashoId} />
      ) : null}

      {allSettled && (
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-start gap-2 text-sm">
            {failedDivisions.length === 0 && divisionsLoaded === 6 ? (
              <>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950/40 text-xs text-emerald-400">✔</span>
                <span className="text-zinc-400">Complete cross-division coverage — all 6 divisions loaded</span>
              </>
            ) : failedDivisions.length > 0 ? (
              <>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-950/40 text-xs text-amber-400">⚠</span>
                <span className="text-zinc-400">
                  Partial overview — {divisionsLoaded}/6 divisions loaded successfully, with failures in{' '}
                  {failedDivisions.map((division) => divisionLabel(division.division)).join(', ')}
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-950/40 text-xs text-amber-400">⚠</span>
                <span className="text-zinc-400">
                  Partial data — {divisionsWithData}/6 divisions have standings
                </span>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
