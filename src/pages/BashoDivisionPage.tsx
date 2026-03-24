import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Swords, TrendingUp } from 'lucide-react';
import { ApiError, getAvailableBashoIds, getDivisionStandings } from '@/pages/basho/api';
import type { Division } from '@/pages/basho/types';
import BashoStoryCard from '@/components/basho/BashoStoryCard';
import BashoDivisionBrowseNav from '@/components/basho/BashoDivisionBrowseNav';
import BashoNav from '@/components/navigation/BashoNav';
import RankMovementIndicator from '@/components/basho/RankMovementIndicator';
import PromotionPredictionBadge from '@/components/basho/PromotionPredictionBadge';
import { bashoDisplayName, divisionLabel, prevBashoId, nextBashoId } from '@/utils/basho';
import { buildDivisionStorySnapshot } from '@/utils/bashoStorytelling';
import { isValidBashoId } from '@/utils/security';
import { trackBashoPageView } from '@/utils/analytics';
import { getApiFailureMessage, isApiUnavailableError, isResourceNotFoundError } from '@/utils/apiFailure';
import DataUnavailableState from '@/components/ui/DataUnavailableState';
import EmptyState from '@/components/ui/EmptyState';
import PageMeta from '@/components/ui/PageMeta';
import { PremiumBadge, PremiumPageHeader, PremiumSectionShell, PremiumStatCard } from '@/components/ui/premium';

type SortKey = 'rank' | 'wins' | 'losses' | 'winPct';
type SortDir = 'asc' | 'desc';

const VALID_DIVISIONS: Division[] = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];

function isDivision(value: string): value is Division {
  return VALID_DIVISIONS.includes(value as Division);
}

function DivisionStandingsContentSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <div className="min-w-full">
          <div className="grid grid-cols-8 gap-2 border-b border-white/[0.04] bg-white/[0.03] px-3 py-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-4 animate-pulse rounded bg-white/[0.05]" />
            ))}
          </div>
          <div className="space-y-2 px-3 py-3">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="grid grid-cols-8 gap-2 rounded-lg px-1 py-2">
                {Array.from({ length: 8 }).map((__, cellIndex) => (
                  <div key={cellIndex} className="h-4 animate-pulse rounded bg-white/[0.05]" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]}, and ${names[2]}`;
}

function buildRaceSummary({
  leaderName,
  leaderRecord,
  runnerUpName,
  runnerUpRecord,
  leaderGap,
}: {
  leaderName: string;
  leaderRecord: string;
  runnerUpName?: string | null;
  runnerUpRecord?: string | null;
  leaderGap?: number | null;
}): string {
  if (leaderGap === 0 && runnerUpName && runnerUpRecord) {
    return `${leaderName} share the best published record at ${leaderRecord}, so the top of the division is still open.`;
  }
  if (leaderGap === 1 && runnerUpName && runnerUpRecord) {
    return `${leaderName} lead at ${leaderRecord}, with ${runnerUpName} one win back at ${runnerUpRecord}.`;
  }
  if (typeof leaderGap === 'number' && leaderGap >= 2 && runnerUpName && runnerUpRecord) {
    return `${leaderName} lead at ${leaderRecord}, ${leaderGap} wins clear of ${runnerUpName} at ${runnerUpRecord}.`;
  }
  return `${leaderName} hold the best published record at ${leaderRecord}.`;
}

export default function BashoDivisionPage() {
  const params = useParams();
  const navigate = useNavigate();

  const bashoId = String(params.bashoId || '').trim();
  const divisionValue = String(params.division || '').trim().toLowerCase();
  const division = isDivision(divisionValue) ? divisionValue : null;

  // --- draft state for the picker, initialised from route params ---
  const [draftBasho, setDraftBasho] = useState(bashoId);
  const [draftDivision, setDraftDivision] = useState<Division>(division ?? 'makuuchi');
  const [bashoError, setBashoError] = useState('');

  // --- Sort state (persisted in URL) ---
  const [searchParams, setSearchParams] = useSearchParams();
  const sortKey = (searchParams.get('sort') as SortKey) || 'rank';
  const sortDir = (searchParams.get('dir') as SortDir) || 'asc';
  const filterMode = (searchParams.get('filter') as 'all' | 'kk' | 'mk') || 'all';
  const minWins = Number(searchParams.get('minWins') ?? '0');
  const shikonaSearch = searchParams.get('q') ?? '';
  const latestAvailableBashoQuery = useQuery({
    queryKey: ['basho-available-ids', 'division-page-latest'],
    queryFn: () => getAvailableBashoIds(1),
    staleTime: 10 * 60 * 1000,
  });
  const latestTournamentId = latestAvailableBashoQuery.data?.[0] ?? null;

  function setFilterParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value && value !== '0' && value !== 'all' && value !== 'rank') {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    }, { replace: true });
  }

  // Sync drafts when route params change (e.g. external navigation)
  useEffect(() => {
    setDraftBasho(bashoId);
    setBashoError('');
  }, [bashoId]);

  useEffect(() => {
    if (division) setDraftDivision(division);
  }, [division]);

  const navigateToStandings = useCallback(
    (b: string, d: Division) => {
      if (!isValidBashoId(b)) {
        setBashoError('Basho must be a valid YYYYMM value (odd months: 01, 03, 05, 07, 09, 11).');
        return;
      }
      setBashoError('');
      navigate(`/basho/${encodeURIComponent(b)}/${encodeURIComponent(d)}`);
    },
    [navigate],
  );

  const handleGo = () => navigateToStandings(draftBasho, draftDivision);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') navigateToStandings(draftBasho, draftDivision);
  };

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Division;
    setDraftDivision(next);
    // Navigate immediately when basho is valid
    if (isValidBashoId(draftBasho)) {
      navigateToStandings(draftBasho, next);
    }
  };

  const standingsQuery = useQuery({
    queryKey: ['basho-division-standings', bashoId, division],
    queryFn: () => getDivisionStandings(bashoId, division as Division),
    enabled: Boolean(bashoId && division),
  });

  // Fetch previous basho standings for rank movement comparison
  const prevId = bashoId ? prevBashoId(bashoId) : null;
  const prevStandingsQuery = useQuery({
    queryKey: ['basho-division-standings', prevId, division],
    queryFn: () => getDivisionStandings(prevId!, division as Division),
    enabled: Boolean(prevId && division),
    staleTime: 10 * 60 * 1000,
  });

  const prevRankMap = useMemo(() => {
    const map = new Map<string, string>();
    if (prevStandingsQuery.data) {
      for (const row of prevStandingsQuery.data) {
        map.set(row.rikishiId, row.rank);
      }
    }
    return map;
  }, [prevStandingsQuery.data]);

  // --- Picker controls (always rendered) ---
  const picker = (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-auto">
          <label htmlFor="basho-input" className="mb-1 block text-xs text-zinc-400">
            Basho (YYYYMM)
          </label>
          <input
            id="basho-input"
            data-testid="basho-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={draftBasho}
            onChange={(e) => {
              setDraftBasho(e.target.value);
              setBashoError('');
            }}
            onKeyDown={handleKeyDown}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none sm:w-28"
            placeholder="202401"
          />
        </div>

        <div className="w-full sm:w-auto">
          <label htmlFor="division-select" className="mb-1 block text-xs text-zinc-400">
            Division
          </label>
          <select
            id="division-select"
            data-testid="division-select"
            value={draftDivision}
            onChange={handleDivisionChange}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none sm:w-auto"
          >
            {VALID_DIVISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <button
          data-testid="basho-go"
          type="button"
          onClick={handleGo}
          className="min-h-11 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 focus:outline-none"
        >
          Go
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isValidBashoId(bashoId) && (
          <Link
            to={`/basho/${encodeURIComponent(bashoId)}`}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Basho overview
          </Link>
        )}
        {latestTournamentId && latestTournamentId !== bashoId && (
          <Link
            to={`/basho/${encodeURIComponent(latestTournamentId)}/${encodeURIComponent(draftDivision)}`}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Latest {divisionLabel(draftDivision)}
          </Link>
        )}
        <Link
          to="/basho"
          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
        >
          Browse archive
        </Link>
      </div>

      <p className="mt-3 hidden text-xs text-zinc-500 sm:block">
        Tip: use the left and right arrow keys to move between basho while keeping this division selected.
      </p>

      {bashoError && (
        <p className="mt-2 text-xs text-red-400" role="alert">
          {bashoError}
        </p>
      )}
    </section>
  );

  // --- Early returns for missing/loading/error states ---
  if (!bashoId || !division) {
    return (
      <div data-testid="division-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
        {picker}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          Select a basho and division above.
        </div>
      </div>
    );
  }

  const rows = standingsQuery.data ?? [];
  const isLoadingStandings = standingsQuery.isLoading;
  const standingsNotFound = isResourceNotFoundError(standingsQuery.error);
  const standingsUnavailable = isApiUnavailableError(standingsQuery.error);
  const standingsError = standingsQuery.error && !standingsNotFound && !standingsUnavailable ? standingsQuery.error : null;
  const filtersDisabled = isLoadingStandings || standingsNotFound || standingsUnavailable || Boolean(standingsError);
  const maxWins = rows.reduce((max, row) => (row.wins > max ? row.wins : max), 0);
  const maxWinsInData = maxWins;
  const leader = rows.reduce<(typeof rows)[number] | null>((best, row) => {
    if (!best) return row;
    if (row.wins > best.wins) return row;
    if (row.wins === best.wins && row.losses < best.losses) return row;
    return best;
  }, null);
  const isLatestDivision = latestTournamentId === bashoId;
  const divisionSnapshotLabel = isLatestDivision ? 'latest published' : 'loaded';
  const divisionStory = useMemo(() => buildDivisionStorySnapshot(rows), [rows]);

  const filteredRows = useMemo(() => {
    let result = [...rows];
    // Kachi-koshi / Make-koshi filter
    if (filterMode === 'kk') result = result.filter((r) => r.wins > r.losses);
    if (filterMode === 'mk') result = result.filter((r) => r.losses > r.wins);
    // Min wins filter
    if (minWins > 0) result = result.filter((r) => r.wins >= minWins);
    // Shikona search
    if (shikonaSearch.trim()) {
      const q = shikonaSearch.trim().toLowerCase();
      result = result.filter((r) => r.shikona.toLowerCase().includes(q));
    }
    return result;
  }, [rows, filterMode, minWins, shikonaSearch]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setFilterParam('dir', sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setFilterParam('sort', key);
      setFilterParam('dir', key === 'rank' ? 'asc' : 'desc');
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const tableRows = useMemo(() => {
    const indexed = filteredRows.map((r, i) => ({ ...r, _idx: rows.indexOf(r) }));
    const sorted = [...indexed].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'rank':
          cmp = a._idx - b._idx;
          break;
        case 'wins':
          cmp = a.wins - b.wins;
          break;
        case 'losses':
          cmp = a.losses - b.losses;
          break;
        case 'winPct':
          cmp = a.winPercentage - b.winPercentage;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted.map((row) => {
      const isYusho = row.wins === maxWins;
      const isKachiKoshi = row.wins > row.losses;
      const pct = row.wins + row.losses > 0 ? ((row.wins / (row.wins + row.losses)) * 100).toFixed(1) : '0.0';
      const prevRank = prevRankMap.get(row.rikishiId) ?? null;
      return (
        <tr
          key={row.rikishiId}
          className="border-b border-white/[0.04] text-zinc-200 transition-colors hover:bg-white/[0.04] cursor-pointer"
          onClick={() => navigate(`/rikishi/${encodeURIComponent(row.rikishiId)}`)}
        >
          <td className="whitespace-nowrap px-2 py-2">
            <span className="inline-flex items-center gap-1.5">
              {row.rank}
              <RankMovementIndicator currentRank={row.rank} previousRank={prevRank} />
            </span>
          </td>
          <td className="whitespace-nowrap px-2 py-2">
            <Link className="text-red-300 hover:text-red-200" to={`/rikishi/${encodeURIComponent(row.rikishiId)}`} onClick={(e) => e.stopPropagation()}>
              {row.shikona}
            </Link>
          </td>
          <td className="px-2 py-2">{row.wins}</td>
          <td className="px-2 py-2">{row.losses}</td>
          <td className="px-2 py-2">{pct}%</td>
          <td className="px-2 py-2">{isYusho ? 'Y' : '-'}</td>
          <td className="px-2 py-2">{isKachiKoshi ? 'KK' : '-'}</td>
          <td className="px-2 py-2">
            <PromotionPredictionBadge wins={row.wins} losses={row.losses} />
          </td>
        </tr>
      );
    });
  }, [filteredRows, rows, maxWins, sortKey, sortDir, prevRankMap, navigate]);

  useEffect(() => {
    if (bashoId && division) {
      trackBashoPageView(bashoId, division);
    }
  }, [bashoId, division]);

  // Arrow key navigation: ← previous basho, → next basho
  useEffect(() => {
    if (!bashoId || !division) return;

    function onKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (!division) return;

      if (e.key === 'ArrowLeft') {
        const prev = prevBashoId(bashoId);
        if (prev) {
          e.preventDefault();
          navigate(`/basho/${prev}/${encodeURIComponent(division)}`);
        }
      } else if (e.key === 'ArrowRight') {
        const next = nextBashoId(bashoId);
        if (next) {
          e.preventDefault();
          navigate(`/basho/${next}/${encodeURIComponent(division)}`);
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [bashoId, division, navigate]);

  const tiedLeaderNames = joinNames(divisionStory.tiedLeaders.map((row) => row.shikona));
  const leaderSummary = divisionStory.leader
    ? `${buildRaceSummary({
      leaderName: tiedLeaderNames || divisionStory.leader.shikona,
      leaderRecord: `${divisionStory.leader.wins}-${divisionStory.leader.losses}`,
      runnerUpName: divisionStory.runnerUp?.shikona,
      runnerUpRecord: divisionStory.runnerUp ? `${divisionStory.runnerUp.wins}-${divisionStory.runnerUp.losses}` : null,
      leaderGap: divisionStory.tiedLeaders.length > 1 ? 0 : divisionStory.leaderGap,
    })} This is the clearest first read inside ${divisionLabel(division)}.`
    : `${divisionLabel(division)} standings have not loaded yet.`;
  const chaseSummary = divisionStory.runnerUp
    ? divisionStory.closeRace
      ? `${divisionStory.runnerUp.shikona} keeps the race tight at ${divisionStory.runnerUp.wins}-${divisionStory.runnerUp.losses}. Use compare if you want to turn the table into a contender matchup.`
      : `${divisionStory.runnerUp.shikona} owns the next-best visible record at ${divisionStory.runnerUp.wins}-${divisionStory.runnerUp.losses}, making him the clearest chase profile behind the leader.`
    : 'Once standings load, this card will point you to the most meaningful chase path behind the leader.';
  const standoutSummary = divisionStory.standout && divisionStory.standout.rikishiId !== divisionStory.leader?.rikishiId
    ? `${divisionStory.standout.shikona} stands out from ${divisionStory.standout.rank} with a ${divisionStory.standout.wins}-${divisionStory.standout.losses} record. That makes him a strong second profile to open from this ${divisionSnapshotLabel} division snapshot.`
    : `This table currently shows ${divisionStory.winningRecordCount} winning records, with ${divisionStory.doubleDigitWinCount} at double digits. Use the filters below when you want to isolate the strongest records quickly.`;

  return (
    <div data-testid="division-page" className="stagger-children mx-auto max-w-6xl space-y-6 p-4 text-zinc-200 sm:space-y-7 sm:p-6">
      <PageMeta
        title={`Sumo Sauce \u2014 ${bashoDisplayName(bashoId)} ${divisionLabel(division)}`}
        description={`${bashoDisplayName(bashoId)} ${divisionLabel(division)} standings, results, and analytics on Sumo Sauce.`}
      />

      <PremiumPageHeader
        accentLabel="TOURNAMENT STANDINGS"
        title={`${bashoDisplayName(bashoId)} — ${divisionLabel(division)}`}
        subtitle={
          isLatestDivision
            ? 'Latest published division standings with current-race framing and quick movement back into the full basho.'
            : 'Browse one division in detail while keeping quick access to the full tournament and archive.'
        }
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Basho', to: '/basho' },
          { label: bashoId, to: `/basho/${encodeURIComponent(bashoId)}` },
          { label: divisionLabel(division as Division) },
        ]}
      >
        <div className="flex flex-col gap-2 text-sm text-zinc-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {isLatestDivision && (
            <span className="inline-flex items-center gap-2">
              <PremiumBadge variant="green">Latest basho</PremiumBadge>
              <span>This division is part of the current tournament front door.</span>
            </span>
          )}
          {isLoadingStandings ? (
            <span>Loading standings…</span>
          ) : (
            <span><span className="font-semibold text-white">{rows.length}</span> rikishi listed</span>
          )}
          {!isLoadingStandings && leader && (
            <span className="inline-flex items-center gap-2">
              <span>Leader</span>
              <Link
                to={`/rikishi/${encodeURIComponent(leader.rikishiId)}`}
                className="font-medium text-red-300 transition-colors hover:text-red-200"
              >
                {leader.shikona}
              </Link>
              <PremiumBadge variant="amber">{leader.wins}-{leader.losses}</PremiumBadge>
            </span>
          )}
          <span>Filters stay in the URL for shareable division views.</span>
        </div>
      </PremiumPageHeader>

      {picker}

      <BashoNav bashoId={bashoId} division={division} />

      <BashoDivisionBrowseNav bashoId={bashoId} active={division} />

      <PremiumSectionShell
        title={isLatestDivision ? `What matters now in ${divisionLabel(division)}` : `How to read ${divisionLabel(division)}`}
        subtitle={
          isLatestDivision
            ? `Use this ${divisionSnapshotLabel} snapshot to find the leader, the chase, and the best next clicks into compare, wrestler, and records views.`
            : `Read the leader first, then open the chase and standout profiles instead of treating the table as a dead end.`
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <PremiumStatCard
            label="Leader"
            value={divisionStory.leader ? `${divisionStory.leader.wins}-${divisionStory.leader.losses}` : 'No data'}
            sub={divisionStory.leader ? divisionStory.leader.shikona : 'Standings unavailable'}
            variant="gold"
            icon={<Trophy className="h-3.5 w-3.5 text-amber-400" />}
          />
          <PremiumStatCard
            label="Chase pack"
            value={divisionStory.runnerUp ? `${divisionStory.runnerUp.wins}-${divisionStory.runnerUp.losses}` : 'Open'}
            sub={
              divisionStory.runnerUp
                ? `${divisionStory.runnerUp.shikona}${divisionStory.closeRace ? ' keeps it close' : ' is next in line'}`
                : 'Waiting on the next strongest record'
            }
            variant={divisionStory.closeRace ? 'red' : 'default'}
            icon={<Swords className="h-3.5 w-3.5 text-red-400" />}
          />
          <PremiumStatCard
            label="Winning records"
            value={String(divisionStory.winningRecordCount)}
            sub={`${divisionStory.doubleDigitWinCount} at double digits`}
            variant="green"
            icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <BashoStoryCard
            eyebrow="Leader read"
            icon={Trophy}
            tone="red"
            title={divisionStory.leader ? `${divisionStory.leader.shikona} leads ${divisionLabel(division)}` : `${divisionLabel(division)} leader`}
            summary={leaderSummary}
            nextStep="Open the leader profile first, then come back to the table if you want the full chase pack around him."
            badges={[
              divisionStory.leader ? { label: divisionStory.leader.rank, variant: 'zinc' as const } : null,
              divisionStory.closeRace ? { label: 'Close race', variant: 'red' as const } : null,
            ].filter(Boolean)}
            actions={[
              ...(divisionStory.leader ? [{ label: 'Open profile', to: `/rikishi/${encodeURIComponent(divisionStory.leader.rikishiId)}` }] : []),
              ...(divisionStory.leader ? [{ label: 'Leader records', to: `/rikishi/${encodeURIComponent(divisionStory.leader.rikishiId)}#records` }] : []),
              { label: 'Basho overview', to: `/basho/${encodeURIComponent(bashoId)}` },
            ]}
          />

          <BashoStoryCard
            eyebrow="Contender path"
            icon={Swords}
            tone="blue"
            title={divisionStory.runnerUp ? `${divisionStory.runnerUp.shikona} is the clearest chase` : 'Chase path'}
            summary={chaseSummary}
            nextStep={
              divisionStory.leader && divisionStory.runnerUp
                ? 'Use compare if you want matchup context, then jump back to the full table for everyone within striking distance.'
                : 'Once a chase profile is visible, compare and wrestler pages are the fastest ways to deepen the read.'
            }
            badges={[
              divisionStory.runnerUp ? { label: divisionStory.runnerUp.rank, variant: 'zinc' as const } : null,
              divisionStory.chasePack.length > 1 ? { label: `${divisionStory.chasePack.length} in the chase`, variant: 'amber' as const } : null,
            ].filter(Boolean)}
            actions={[
              ...(divisionStory.leader && divisionStory.runnerUp
                ? [{ label: 'Compare top two', to: `/compare/${encodeURIComponent(divisionStory.leader.rikishiId)}/${encodeURIComponent(divisionStory.runnerUp.rikishiId)}` }]
                : []),
              ...(divisionStory.runnerUp ? [{ label: 'Open chase profile', to: `/rikishi/${encodeURIComponent(divisionStory.runnerUp.rikishiId)}` }] : []),
              { label: 'Overview context', to: `/basho/${encodeURIComponent(bashoId)}` },
            ]}
          />

          <BashoStoryCard
            eyebrow="Standout"
            icon={TrendingUp}
            tone="amber"
            title={divisionStory.standout ? `${divisionStory.standout.shikona} is worth opening` : 'Standout performance'}
            summary={standoutSummary}
            nextStep="After the standout profile, use the filters below or the leaderboard slice if you want to narrow the division to a smaller record band."
            badges={[
              divisionStory.standout ? { label: divisionStory.standout.rank, variant: 'zinc' as const } : null,
              divisionStory.doubleDigitWinCount > 0 ? { label: `${divisionStory.doubleDigitWinCount} double-digit`, variant: 'amber' as const } : null,
            ].filter(Boolean)}
            actions={[
              ...(divisionStory.standout ? [{ label: 'Open standout', to: `/rikishi/${encodeURIComponent(divisionStory.standout.rikishiId)}` }] : []),
              ...(divisionStory.leader ? [{ label: 'Leaderboard slice', to: `/leaderboard?q=${encodeURIComponent(divisionStory.leader.rikishiId)}` }] : []),
              { label: 'Analytics trail', to: '/analytics#championship-trail' },
            ]}
          />
        </div>
      </PremiumSectionShell>

      {/* Filters */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-end xl:gap-4">
          <div className="min-w-0">
            <label htmlFor="filter-shikona" className="mb-1 block text-xs text-zinc-400">Search shikona</label>
            <input
              id="filter-shikona"
              data-testid="filter-shikona"
              type="text"
              disabled={filtersDisabled}
              value={shikonaSearch}
              onChange={(e) => setFilterParam('q', e.target.value)}
              placeholder="Search…"
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none sm:w-36"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="filter-mode" className="mb-1 block text-xs text-zinc-400">Record</label>
            <select
              id="filter-mode"
              data-testid="filter-mode"
              disabled={filtersDisabled}
              value={filterMode}
              onChange={(e) => setFilterParam('filter', e.target.value)}
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none sm:w-auto"
            >
              <option value="all">All</option>
              <option value="kk">Kachi-koshi only</option>
              <option value="mk">Make-koshi only</option>
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="filter-min-wins" className="mb-1 block text-xs text-zinc-400">
              Min wins: {minWins}
            </label>
            <input
              id="filter-min-wins"
              data-testid="filter-min-wins"
              type="range"
              disabled={filtersDisabled}
              min={0}
              max={maxWinsInData}
              value={minWins}
              onChange={(e) => setFilterParam('minWins', e.target.value)}
              className="w-full accent-red-500 sm:w-32"
            />
          </div>
          {(filterMode !== 'all' || minWins > 0 || shikonaSearch.trim()) && (
            <div className="text-xs leading-relaxed text-zinc-400">
              Showing {filteredRows.length} of {rows.length}
              <button
                type="button"
                onClick={() => { setSearchParams({}, { replace: true }); }}
                className="ml-2 text-red-400 hover:text-red-300"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-5" aria-busy={isLoadingStandings}>
        {isLoadingStandings ? (
          <DivisionStandingsContentSkeleton />
        ) : standingsNotFound ? (
          <EmptyState
            message="Basho or division not found"
            description="This tournament/division combination is not available in the current standings layer."
            suggestions={[
              ['Basho overview', `/basho/${encodeURIComponent(bashoId)}`],
              ['Browse archive', '/basho'],
            ]}
          />
        ) : standingsUnavailable ? (
          <DataUnavailableState
            title={`${divisionLabel(division)} standings are unavailable`}
            description={getApiFailureMessage(standingsQuery.error, 'The live basho service is unavailable for this deployment right now.')}
            detail="This is different from the basho not existing. The direct standings feed did not load, so this page cannot safely present the division table."
            actions={[
              { label: 'Basho overview', to: `/basho/${encodeURIComponent(bashoId)}` },
              { label: 'Browse archive', to: '/basho' },
              { label: 'Browse rikishi', to: '/rikishi' },
            ]}
          />
        ) : standingsError ? (
          <div className="rounded-xl border border-red-800 bg-red-950/20 p-4">
            <div className="font-semibold text-red-300">
              {standingsError instanceof ApiError ? standingsError.code : 'UNKNOWN'}
            </div>
            <div className="mt-1 text-sm text-zinc-300">
              {standingsError instanceof ApiError
                ? getApiFailureMessage(standingsError, 'An unexpected error occurred.')
                : 'An unexpected error occurred.'}
            </div>
            <div className="mt-3">
              <Link className="text-red-400 hover:text-red-300" to="/">
                ← Home
              </Link>
            </div>
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            message="No wrestlers match your filters"
            description="Try adjusting the search, record filter, or minimum wins."
            onReset={() => setSearchParams({}, { replace: true })}
            suggestions={[['View basho overview', `/basho/${encodeURIComponent(bashoId)}`]]}
          />
        ) : (
        <div className="overflow-x-auto -mx-1">
          <table data-testid="standings-table" className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm">
              <tr className="border-b border-white/[0.04] text-left text-zinc-400">
                <th className="cursor-pointer select-none whitespace-nowrap px-2 py-2 hover:text-zinc-200" onClick={() => handleSort('rank')}>Rank{sortIndicator('rank')}</th>
                <th className="px-2 py-2">Shikona</th>
                <th className="cursor-pointer select-none whitespace-nowrap px-2 py-2 hover:text-zinc-200" onClick={() => handleSort('wins')}>Wins{sortIndicator('wins')}</th>
                <th className="cursor-pointer select-none whitespace-nowrap px-2 py-2 hover:text-zinc-200" onClick={() => handleSort('losses')}>Losses{sortIndicator('losses')}</th>
                <th className="cursor-pointer select-none whitespace-nowrap px-2 py-2 hover:text-zinc-200" onClick={() => handleSort('winPct')}>Win %{sortIndicator('winPct')}</th>
                <th className="px-2 py-2">Yusho</th>
                <th className="px-2 py-2">Kachi-koshi</th>
                <th className="px-2 py-2">Prediction</th>
              </tr>
            </thead>
            <tbody>
              {tableRows}
            </tbody>
          </table>
        </div>
        )}
      </section>

      <BashoNav bashoId={bashoId} division={division} />

      {/* Data integrity indicator */}
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 text-sm">
          {rows.length > 0 ? (
            <>
              <span className="text-emerald-400">✔</span>
              <span className="text-zinc-300">Verified — {rows.length} wrestlers in standings</span>
            </>
          ) : (
            <>
              <span className="text-amber-400">⚠</span>
              <span className="text-zinc-300">Incomplete — no standings data</span>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
