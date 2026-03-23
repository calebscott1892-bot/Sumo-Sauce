import { Link, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AlertTriangle, LineChart, ArrowRight, Trophy, TrendingUp, Layers3, Swords } from 'lucide-react';
import { getAvailableBashoIds, getDivisionStandings } from '@/pages/basho/api';
import DivisionGrid from '@/components/basho/DivisionGrid';
import BashoDivisionBrowseNav from '@/components/basho/BashoDivisionBrowseNav';
import PromotionWatchlist from '@/components/basho/PromotionWatchlist';
import BashoDifficultyCard from '@/components/basho/BashoDifficultyCard';
import BashoStorylines from '@/components/basho/BashoStorylines';
import BashoStoryCard from '@/components/basho/BashoStoryCard';
import UpsetList from '@/components/basho/UpsetList';
import BashoNav from '@/components/navigation/BashoNav';
import { bashoDisplayName, bashoTournamentName, bashoLabel, divisionLabel, parseBashoId } from '@/utils/basho';
import { getApiFailureMessage, isApiUnavailableError, isResourceNotFoundError } from '@/utils/apiFailure';
import { buildDivisionStorySnapshot, detectDivisionLeader, sortDivisionStandings } from '@/utils/bashoStorytelling';
import { isValidBashoId } from '@/utils/security';
import { trackBashoPageView } from '@/utils/analytics';
import DataUnavailableState from '@/components/ui/DataUnavailableState';
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
  const leader = detectDivisionLeader(rows);
  return leader
    ? { rikishiId: leader.rikishiId, shikona: leader.shikona, wins: leader.wins, losses: leader.losses }
    : null;
}

function sortStandings(rows: DivisionStandingRow[]): DivisionStandingRow[] {
  return sortDivisionStandings(rows);
}

function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]}, and ${names[2]}`;
}

function buildRaceSummary(
  names: string,
  leaderRecord: string,
  runnerUpName?: string | null,
  runnerUpRecord?: string | null,
  leaderGap?: number | null,
): string {
  if (!names) return 'Standings data is not available yet.';
  if (leaderGap === 0 && runnerUpName && runnerUpRecord) {
    return `${names} share the best published record at ${leaderRecord}, so the race is still open at the top.`;
  }
  if (leaderGap === 1 && runnerUpName && runnerUpRecord) {
    return `${names} lead the published table at ${leaderRecord}, with ${runnerUpName} one win back at ${runnerUpRecord}.`;
  }
  if (typeof leaderGap === 'number' && leaderGap >= 2 && runnerUpName && runnerUpRecord) {
    return `${names} lead at ${leaderRecord}, ${leaderGap} wins clear of ${runnerUpName} at ${runnerUpRecord}.`;
  }
  return `${names} hold the best published record at ${leaderRecord}.`;
}

function DivisionLeaderboardPreview({ bashoId, snapshot }: { bashoId: string; snapshot: DivisionSnapshot }) {
  const sortedRows = useMemo(() => sortStandings(snapshot.rows).slice(0, 6), [snapshot.rows]);
  const story = useMemo(() => buildDivisionStorySnapshot(snapshot.rows), [snapshot.rows]);
  const badgeVariant = DIVISION_BADGE_VARIANTS[snapshot.division];
  const leaderRecord = story.leader ? `${story.leader.wins}-${story.leader.losses}` : null;
  const runnerUpRecord = story.runnerUp ? `${story.runnerUp.wins}-${story.runnerUp.losses}` : null;
  const tiedNames = joinNames(story.tiedLeaders.map((row) => row.shikona));
  const raceCopy = story.leader
    ? buildRaceSummary(
      tiedNames || story.leader.shikona,
      leaderRecord || '0-0',
      story.runnerUp?.shikona,
      runnerUpRecord,
      story.tiedLeaders.length > 1 ? 0 : story.leaderGap,
    )
    : 'Standings data is not available for this division yet.';

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
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
            <span>Current leader</span>
            <Link
              to={`/rikishi/${encodeURIComponent(snapshot.champion.rikishiId)}`}
              className="font-medium text-red-300 transition-colors hover:text-red-200"
            >
              {snapshot.champion.shikona}
            </Link>
            <PremiumBadge variant="amber">{snapshot.champion.wins}-{snapshot.champion.losses}</PremiumBadge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{raceCopy}</p>
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

      {story.leader ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            to={`/rikishi/${encodeURIComponent(story.leader.rikishiId)}`}
            className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Leader profile
          </Link>
          <Link
            to={`/rikishi/${encodeURIComponent(story.leader.rikishiId)}#records`}
            className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Leader records
          </Link>
          {story.runnerUp ? (
            <Link
              to={`/compare/${encodeURIComponent(story.leader.rikishiId)}/${encodeURIComponent(story.runnerUp.rikishiId)}`}
              className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              Compare top two
            </Link>
          ) : null}
        </div>
      ) : null}
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
  const latestAvailableBashoQuery = useQuery({
    queryKey: ['basho-available-ids', 'overview-page-latest'],
    queryFn: () => getAvailableBashoIds(1),
    staleTime: 10 * 60 * 1000,
  });
  const latestId = latestAvailableBashoQuery.data?.[0] ?? null;
  const isLatestBasho = latestId === bashoId;
  const snapshotLabel = isLatestBasho ? 'latest published' : 'loaded';
  const makuuchiStory = useMemo(() => buildDivisionStorySnapshot(makuuchiData?.rows ?? []), [makuuchiData?.rows]);
  const juryoStory = useMemo(() => buildDivisionStorySnapshot(juryoData?.rows ?? []), [juryoData?.rows]);
  const featuredLowerDivision = useMemo(
    () => lowerDivisionData.find((division) => division.division === 'makushita' && division.rows.length > 0)
      ?? lowerDivisionData.find((division) => division.rows.length > 0)
      ?? null,
    [lowerDivisionData],
  );
  const lowerDivisionStory = useMemo(
    () => buildDivisionStorySnapshot(featuredLowerDivision?.rows ?? []),
    [featuredLowerDivision?.rows],
  );
  const overviewUnavailable = allSettled
    && failedDivisions.length === DIVISIONS.length
    && failedDivisions.every((division) => isApiUnavailableError(division.error));
  const overviewNotFound = allSettled
    && failedDivisions.length === DIVISIONS.length
    && failedDivisions.every((division) => isResourceNotFoundError(division.error));
  const tournamentName = bashoTournamentName(bashoId);
  const label = bashoLabel(bashoId);

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

  if (overviewNotFound) {
    return <ErrorCard code="NOT_FOUND" message="Basho not found." backTo="/basho" backLabel="← Browse basho" />;
  }

  if (overviewUnavailable) {
    return (
      <div data-testid="basho-overview-page" className="mx-auto max-w-6xl space-y-6 p-4 text-zinc-200 sm:space-y-7 sm:p-6">
        <PageMeta
          title={`Sumo Sauce — ${bashoDisplayName(bashoId)}`}
          description={`${tournamentName} ${parsed?.year} basho overview on Sumo Sauce.`}
        />

        <PremiumPageHeader
          accentLabel="TOURNAMENT OVERVIEW"
          title={bashoDisplayName(bashoId)}
          subtitle="The basho route is available, but live cross-division standings are unavailable on this deployment right now."
          badge={label}
          breadcrumbs={[
            { label: 'Home', to: '/' },
            { label: 'Basho', to: '/basho' },
            { label: bashoId },
          ]}
        >
          <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
            <PremiumBadge variant={isLatestBasho ? 'green' : 'zinc'}>{isLatestBasho ? 'Latest basho' : 'Archive basho'}</PremiumBadge>
            <span>Cross-division standings unavailable</span>
          </div>
        </PremiumPageHeader>

        <BashoNav bashoId={bashoId} mode="overview" />
        <BashoDivisionBrowseNav bashoId={bashoId} active="overview" counts={countsByDivision} />

        <PremiumSectionShell
          title="Live basho overview is unavailable"
          subtitle="This is not the same as the tournament being missing. The route exists, but the live standings service did not load."
        >
          <DataUnavailableState
            title="Cross-division standings could not be loaded"
            description={getApiFailureMessage(failedDivisions[0]?.error, 'The live basho API is unavailable for this deployment right now.')}
            detail="Direct division pages may recover first once the hosted backend is connected again. Until then, treat this page as a navigation shell rather than a tournament snapshot."
            actions={[
              { label: 'Browse basho archive', to: '/basho' },
              { label: 'Browse rikishi', to: '/rikishi' },
              { label: 'Open leaderboard', to: '/leaderboard' },
            ]}
          />
        </PremiumSectionShell>
      </div>
    );
  }

  const makuuchiTitle = makuuchiStory.leader ? `Makuuchi: ${makuuchiStory.leader.shikona} on top` : 'Makuuchi headline race';
  const makuuchiSummary = makuuchiStory.leader
    ? `${buildRaceSummary(
      joinNames(makuuchiStory.tiedLeaders.map((row) => row.shikona)) || makuuchiStory.leader.shikona,
      `${makuuchiStory.leader.wins}-${makuuchiStory.leader.losses}`,
      makuuchiStory.runnerUp?.shikona,
      makuuchiStory.runnerUp ? `${makuuchiStory.runnerUp.wins}-${makuuchiStory.runnerUp.losses}` : null,
      makuuchiStory.tiedLeaders.length > 1 ? 0 : makuuchiStory.leaderGap,
    )} Open Makuuchi first if you want the clearest tournament headline.`
    : 'Makuuchi has not loaded yet, so the overview currently works best as a cross-division navigation surface.';
  const juryoTitle = juryoStory.leader ? `Juryo: ${juryoStory.leader.shikona} leads the second division` : 'Juryo promotion pressure';
  const juryoSummary = juryoStory.leader
    ? `${buildRaceSummary(
      joinNames(juryoStory.tiedLeaders.map((row) => row.shikona)) || juryoStory.leader.shikona,
      `${juryoStory.leader.wins}-${juryoStory.leader.losses}`,
      juryoStory.runnerUp?.shikona,
      juryoStory.runnerUp ? `${juryoStory.runnerUp.wins}-${juryoStory.runnerUp.losses}` : null,
      juryoStory.tiedLeaders.length > 1 ? 0 : juryoStory.leaderGap,
    )} This is the fastest place to read upward pressure below Makuuchi.`
    : 'Juryo has not loaded yet, but the division page remains the cleanest place to retry that race directly.';
  const lowerTitle = featuredLowerDivision && lowerDivisionStory.leader
    ? `${divisionLabel(featuredLowerDivision.division)} movement to watch`
    : 'Lower-division movement';
  const lowerSummary = featuredLowerDivision && lowerDivisionStory.leader
    ? `${divisionLabel(featuredLowerDivision.division)} is led by ${lowerDivisionStory.leader.shikona} at ${lowerDivisionStory.leader.wins}-${lowerDivisionStory.leader.losses}. If you want the clearest lower-division movement signal in this ${snapshotLabel} snapshot, start there first.`
    : 'Use the lower-division ladder when you want movement below the sekitori tiers without leaving this tournament context.';
  const nextSummary = makuuchiStory.leader
    ? `From this overview, the strongest next clicks are the ${snapshotLabel} Makuuchi table, ${makuuchiStory.leader.shikona}'s wrestler page, and the records or compare surfaces that keep this basho connected to the rest of the product.`
    : 'Once one division loads, move from its leader into the wrestler page, records panel, or compare surface instead of treating this basho as a dead-end archive node.';

  return (
    <div data-testid="basho-overview-page" className="mx-auto max-w-6xl space-y-6 p-4 text-zinc-200 sm:space-y-7 sm:p-6">
      <PremiumPageHeader
        accentLabel="BASHO OVERVIEW"
        title={`${tournamentName} ${parsed?.year ?? ''}`}
        subtitle={
          isLatestBasho
            ? 'Latest published cross-division standings, leaders, and next-click paths for the current tournament.'
            : 'Cross-division standings, champions, and tournament navigation in one place.'
        }
        badge={label}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Basho', to: '/basho' },
          { label: bashoId },
        ]}
        actions={(
          <Link
            to="/watchlist"
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-white"
          >
            Watchlist
          </Link>
        )}
        favorite={{
          active: isFav,
          onToggle: () => {
            toggleFavoriteBasho(bashoId, bashoDisplayName(bashoId));
            setIsFav(!isFav);
          },
          ariaLabel: isFav ? `Remove ${bashoDisplayName(bashoId)} from watchlist` : `Save ${bashoDisplayName(bashoId)} to watchlist`,
        }}
      >
        {allSettled && (
          <div className="flex flex-col gap-2 text-sm text-zinc-400 sm:flex-row sm:flex-wrap sm:gap-4">
            {isLatestBasho && (
              <span className="inline-flex items-center gap-2">
                <PremiumBadge variant="green">Latest basho</PremiumBadge>
                <span>Use this page as the fastest tournament-first entry point.</span>
              </span>
            )}
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

      <PremiumSectionShell
        title={isLatestBasho ? 'What matters now' : 'Tournament read'}
        subtitle={
          isLatestBasho
            ? 'Use the latest published standings snapshot to find the headline race, the second-division pressure points, and the cleanest next clicks.'
            : 'Start from the strongest division race, then branch into wrestler, compare, and records context.'
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <BashoStoryCard
            eyebrow={isLatestBasho ? 'Headline race' : 'Top division'}
            icon={Trophy}
            tone="red"
            title={makuuchiTitle}
            summary={makuuchiSummary}
            nextStep={
              makuuchiStory.runnerUp
                ? 'Open Makuuchi, then compare the top two if you want a pair-level read instead of two separate wrestler pages.'
                : 'Open Makuuchi first, then move into the leader profile or records panel from there.'
            }
            badges={[
              makuuchiStory.leader ? { label: `${makuuchiStory.leader.wins}-${makuuchiStory.leader.losses}`, variant: 'amber' as const } : null,
              makuuchiStory.closeRace ? { label: 'Close race', variant: 'red' as const } : null,
            ].filter(Boolean)}
            actions={[
              { label: 'Open Makuuchi', to: `/basho/${encodeURIComponent(bashoId)}/makuuchi` },
              ...(makuuchiStory.leader ? [{ label: 'Leader profile', to: `/rikishi/${encodeURIComponent(makuuchiStory.leader.rikishiId)}` }] : []),
              ...(makuuchiStory.leader ? [{ label: 'Leader records', to: `/rikishi/${encodeURIComponent(makuuchiStory.leader.rikishiId)}#records` }] : []),
              ...(makuuchiStory.leader && makuuchiStory.runnerUp
                ? [{ label: 'Compare contenders', to: `/compare/${encodeURIComponent(makuuchiStory.leader.rikishiId)}/${encodeURIComponent(makuuchiStory.runnerUp.rikishiId)}` }]
                : []),
            ]}
          />

          <BashoStoryCard
            eyebrow="Second division"
            icon={TrendingUp}
            tone="blue"
            title={juryoTitle}
            summary={juryoSummary}
            nextStep={
              juryoStory.leader
                ? 'Open Juryo next if you want the cleanest promotion-pressure view below Makuuchi.'
                : 'Use the direct Juryo page if this overview snapshot did not bring that division through.'
            }
            badges={[
              juryoStory.leader ? { label: `${juryoStory.winningRecordCount} winning records`, variant: 'zinc' as const } : null,
              juryoStory.doubleDigitWinCount > 0 ? { label: `${juryoStory.doubleDigitWinCount} double-digit`, variant: 'amber' as const } : null,
            ].filter(Boolean)}
            actions={[
              { label: 'Open Juryo', to: `/basho/${encodeURIComponent(bashoId)}/juryo` },
              ...(juryoStory.leader ? [{ label: 'Leader profile', to: `/rikishi/${encodeURIComponent(juryoStory.leader.rikishiId)}` }] : []),
              ...(juryoStory.leader && juryoStory.runnerUp
                ? [{ label: 'Compare top two', to: `/compare/${encodeURIComponent(juryoStory.leader.rikishiId)}/${encodeURIComponent(juryoStory.runnerUp.rikishiId)}` }]
                : []),
            ]}
          />

          <BashoStoryCard
            eyebrow="Lower division"
            icon={Layers3}
            tone="amber"
            title={lowerTitle}
            summary={lowerSummary}
            nextStep={
              featuredLowerDivision
                ? `Open ${divisionLabel(featuredLowerDivision.division)} when you want the strongest movement signal below the headline divisions.`
                : 'Use the lower-division cards below to retry the direct division pages one by one.'
            }
            badges={[
              featuredLowerDivision ? { label: divisionLabel(featuredLowerDivision.division), variant: 'amber' as const } : null,
              lowerDivisionStory.leader ? { label: `${lowerDivisionStory.leader.wins}-${lowerDivisionStory.leader.losses}`, variant: 'zinc' as const } : null,
            ].filter(Boolean)}
            actions={[
              ...(featuredLowerDivision ? [{ label: `Open ${divisionLabel(featuredLowerDivision.division)}`, to: `/basho/${encodeURIComponent(bashoId)}/${encodeURIComponent(featuredLowerDivision.division)}` }] : []),
              ...(lowerDivisionStory.leader ? [{ label: 'Leader profile', to: `/rikishi/${encodeURIComponent(lowerDivisionStory.leader.rikishiId)}` }] : []),
              ...(lowerDivisionStory.leader ? [{ label: 'Leaderboard slice', to: `/leaderboard?q=${encodeURIComponent(lowerDivisionStory.leader.rikishiId)}` }] : []),
            ]}
          />

          <BashoStoryCard
            eyebrow="Worth following"
            icon={Swords}
            tone="green"
            title="Where to go next from this basho"
            summary={nextSummary}
            nextStep="Use compare for contender pairs, wrestler records for context that outlives one tournament, and analytics when you want the broader championship picture."
            badges={[
              isLatestBasho ? { label: 'Current basho', variant: 'green' as const } : { label: 'Archive snapshot', variant: 'zinc' as const },
            ]}
            actions={[
              ...(makuuchiStory.leader && makuuchiStory.runnerUp
                ? [{ label: 'Compare contenders', to: `/compare/${encodeURIComponent(makuuchiStory.leader.rikishiId)}/${encodeURIComponent(makuuchiStory.runnerUp.rikishiId)}` }]
                : []),
              ...(makuuchiStory.leader ? [{ label: 'Leader records', to: `/rikishi/${encodeURIComponent(makuuchiStory.leader.rikishiId)}#records` }] : []),
              { label: 'Analytics trail', to: '/analytics#championship-trail' },
              { label: 'Leaderboard', to: '/leaderboard' },
            ]}
          />
        </div>
      </PremiumSectionShell>

      {(makuuchiData?.champion || juryoData?.champion) ? (
        <section id="records-context" className="scroll-mt-24">
          <PremiumSectionShell
            title="Record & milestone paths"
            subtitle="Move from this basho into the leader's records view, relevant division standings, or the broader championship trail."
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

      <PremiumSectionShell
        title="Upper-division races"
        subtitle="Makuuchi and Juryo stay side by side so the overview does not collapse into one division."
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

      <PremiumSectionShell title="All divisions" subtitle="All six divisions at a glance, with quick context for each layer.">
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
            Storylines, difficulty, upset tracking, and promotion-watch modules go deepest on Makuuchi. Juryo and the lower divisions remain browseable above through standings-led views.
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
