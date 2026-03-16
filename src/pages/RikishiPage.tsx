import { Link, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import CareerTable from '@/components/rikishi/CareerTable';
import KimariteChart from '@/components/rikishi/KimariteChart';
import RikishiSummaryCard from '@/components/rikishi/RikishiSummaryCard';
import RivalryList from '@/components/rikishi/RivalryList';
import RikishiBoutTimeline from '@/components/rikishi/RikishiBoutTimeline';
import HistoricalRankExplorer from '@/components/rikishi/HistoricalRankExplorer';
import CareerHeatmap from '@/components/rikishi/CareerHeatmap';
import ConsistencyScore from '@/components/rikishi/ConsistencyScore';
import StreakCard from '@/components/rikishi/StreakCard';
import PerformanceVsField from '@/components/rikishi/PerformanceVsField';
import RikishiSectionNav from '@/components/rikishi/RikishiSectionNav';
import RecordsMilestonesPanel from '@/components/rikishi/RecordsMilestonesPanel';
import VerifiedProfileCard from '@/components/rikishi/VerifiedProfileCard';
import RikishiDiscoveryRow from '@/components/search/RikishiDiscoveryRow';
import { isFavoriteRikishi, toggleFavoriteRikishi } from '@/utils/favorites';
import { trackRikishiView } from '@/utils/recentlyViewed';
import {
  ApiError,
  getCareerSummary,
  getCareerTimeline,
  getDivisionStandings,
  getHeadToHead,
  getKimariteStats,
  getLegacyBashoRecords,
  getRikishiDirectory,
  getRankProgression,
} from '@/pages/rikishi/api';
import RikishiProfileSkeleton from '@/components/ui/skeletons/RikishiProfileSkeleton';
import DataUnavailableState from '@/components/ui/DataUnavailableState';
import ErrorCard from '@/components/ui/ErrorCard';
import PageMeta from '@/components/ui/PageMeta';
import { trackRikishiPageView } from '@/utils/analytics';
import { PremiumPageHeader, PremiumSectionShell, PremiumBadge } from '@/components/ui/premium';
import { getApiFailureMessage, isApiUnavailableError, isResourceNotFoundError } from '@/utils/apiFailure';
import {
  buildPublishedStableSummaries,
  findPublishedProfileEntryByRikishiId,
  getPublishedProfileEntries,
} from '@/utils/publishedProfileBrowsing';
import { buildRivalryInsight, getRivalryStateVariant } from '@/utils/rivalry';
import { getStablemates, stableSlug } from '@/utils/rosterBrowsing';
import type { Division, TimelineItem } from '@/pages/rikishi/types';

const RikishiRankChart = lazy(() => import('@/components/rikishi/RikishiRankChart'));

type H2HPreviewItem = {
  opponentId: string;
  opponentShikona: string;
  totalMatches: number;
  wins: number;
  losses: number;
};

const SECTION_ITEMS = [
  { id: 'overview', label: 'Overview', subtitle: 'Identity, trust, and summary' },
  { id: 'performance', label: 'Performance', subtitle: 'Form, consistency, and recent basho' },
  { id: 'ranking', label: 'Ranking', subtitle: 'Progression and historical trajectory' },
  { id: 'records', label: 'Records', subtitle: 'Achievements and milestone context' },
  { id: 'career', label: 'Career', subtitle: 'Career table, heatmap, and kimarite' },
  { id: 'matchups', label: 'Matchups', subtitle: 'Rivalries and head-to-head view' },
  { id: 'bouts', label: 'Recent bouts', subtitle: 'Timeline and data completeness' },
] as const;

type SectionId = (typeof SECTION_ITEMS)[number]['id'];

function uniqueByBashoDivision(items: TimelineItem[]): TimelineItem[] {
  const byKey = new Map<string, TimelineItem>();
  for (const item of items) {
    const key = `${item.bashoId}::${item.division}`;
    byKey.set(key, item);
  }
  return Array.from(byKey.values()).sort((a, b) => a.bashoId.localeCompare(b.bashoId) || a.division.localeCompare(b.division));
}

function ProfileSectionGroup({
  id,
  title,
  subtitle,
  children,
}: {
  id: SectionId;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 space-y-4 sm:scroll-mt-24 sm:space-y-5">
      <div className="px-1">
        <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500">{subtitle}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

export default function RikishiPage() {
  const params = useParams();
  const rikishiId = String(params.id || '').trim();
  const [isFav, setIsFav] = useState(() => isFavoriteRikishi(rikishiId));
  const [activeSectionId, setActiveSectionId] = useState<SectionId>('overview');
  const publishedEntries = useMemo(() => getPublishedProfileEntries(), []);

  const summaryQuery = useQuery({
    queryKey: ['rikishi-summary', rikishiId],
    queryFn: () => getCareerSummary(rikishiId),
    enabled: Boolean(rikishiId),
  });

  const timelineQuery = useQuery({
    queryKey: ['rikishi-timeline', rikishiId],
    queryFn: () => getCareerTimeline(rikishiId),
    enabled: Boolean(rikishiId),
  });

  const progressionQuery = useQuery({
    queryKey: ['rikishi-rank-progression', rikishiId],
    queryFn: () => getRankProgression(rikishiId),
    enabled: Boolean(rikishiId),
  });

  const kimariteQuery = useQuery({
    queryKey: ['rikishi-kimarite', rikishiId],
    queryFn: () => getKimariteStats(rikishiId),
    enabled: Boolean(rikishiId),
  });

  const directoryQuery = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000,
    enabled: Boolean(rikishiId),
  });

  const legacyAchievementsQuery = useQuery({
    queryKey: ['rikishi-legacy-achievements', rikishiId],
    queryFn: () => getLegacyBashoRecords(rikishiId),
    enabled: Boolean(rikishiId),
    staleTime: 10 * 60 * 1000,
  });

  const timelineChrono = useMemo(() => {
    const rows = Array.isArray(timelineQuery.data) ? [...timelineQuery.data] : [];
    return rows.sort((a, b) => a.bashoId.localeCompare(b.bashoId) || a.division.localeCompare(b.division));
  }, [timelineQuery.data]);

  const recentBasho = useMemo(() => {
    return [...timelineChrono].slice(-6).reverse();
  }, [timelineChrono]);

  const distinctBashoCount = useMemo(() => {
    return new Set(timelineChrono.map((item) => item.bashoId)).size;
  }, [timelineChrono]);

  // Fetch division standings for recent basho to compute "vs field" metrics
  const recentForField = useMemo(() => {
    const sorted = [...timelineChrono].sort((a, b) => b.bashoId.localeCompare(a.bashoId));
    return uniqueByBashoDivision(sorted).slice(0, 6);
  }, [timelineChrono]);

  const fieldStandingsQuery = useQuery({
    queryKey: ['rikishi-field-standings', rikishiId, recentForField.map((x) => `${x.bashoId}:${x.division}`).join('|')],
    enabled: Boolean(rikishiId) && recentForField.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        recentForField.map((item) =>
          getDivisionStandings(item.bashoId, item.division as Division).catch(() => [])
        )
      );
      const map = new Map<string, import('../../shared/api/v1').DivisionStandingRow[]>();
      recentForField.forEach((item, i) => {
        map.set(`${item.bashoId}::${item.division}`, results[i]);
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const h2hPreviewQuery = useQuery({
    queryKey: ['rikishi-h2h-preview', rikishiId, timelineChrono.map((x) => `${x.bashoId}:${x.division}`).join('|')],
    enabled: Boolean(rikishiId) && timelineChrono.length > 0,
    queryFn: async (): Promise<H2HPreviewItem[]> => {
      const recentDivisions = uniqueByBashoDivision(timelineChrono).slice(-6).reverse().slice(0, 4);

      const standingPayloads = await Promise.all(
        recentDivisions.map((item) => getDivisionStandings(item.bashoId, item.division as Division))
      );

      const opponentCounts = new Map<string, { count: number; shikona: string }>();
      for (const payload of standingPayloads) {
        for (const row of payload) {
          if (row.rikishiId === rikishiId) continue;
          const existing = opponentCounts.get(row.rikishiId);
          opponentCounts.set(row.rikishiId, {
            count: (existing?.count || 0) + 1,
            shikona: row.shikona,
          });
        }
      }

      const candidateIds = Array.from(opponentCounts.entries())
        .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
        .slice(0, 15)
        .map(([id]) => id);

      const h2hRows = await Promise.all(
        candidateIds.map(async (opponentId) => {
          const h2h = await getHeadToHead(rikishiId, opponentId);
          return {
            opponentId,
            opponentShikona: opponentCounts.get(opponentId)?.shikona || opponentId,
            totalMatches: h2h.totalMatches,
            wins: h2h.rikishiAWins,
            losses: h2h.rikishiBWins,
          };
        })
      );

      return h2hRows
        .sort((a, b) => b.totalMatches - a.totalMatches || a.opponentId.localeCompare(b.opponentId));
    },
  });

  const h2hPreviewTop3 = useMemo(() => {
    return (h2hPreviewQuery.data || []).slice(0, 3);
  }, [h2hPreviewQuery.data]);

  const publishedEntry = useMemo(
    () => findPublishedProfileEntryByRikishiId(rikishiId, publishedEntries),
    [publishedEntries, rikishiId],
  );
  const publishedStableSummaries = useMemo(
    () => buildPublishedStableSummaries(publishedEntries),
    [publishedEntries],
  );
  const publishedStable = useMemo(() => {
    if (!publishedEntry?.heya) return null;
    return publishedStableSummaries.find((stable) => stable.name === publishedEntry.heya) ?? null;
  }, [publishedEntry?.heya, publishedStableSummaries]);

  const primaryCompareTarget = h2hPreviewTop3[0] ?? null;
  const stableName = summaryQuery.data?.heya ?? publishedEntry?.heya ?? null;
  const stableHref = stableName ? `/stables/${encodeURIComponent(stableSlug(stableName))}` : null;
  const stablemates = useMemo(() => {
    if (!stableName || !directoryQuery.data?.length) return [];
    return getStablemates(directoryQuery.data, stableName, rikishiId, 6);
  }, [directoryQuery.data, rikishiId, stableName]);
  const publishedStablemates = useMemo(() => {
    if (!publishedStable) return [];
    return publishedStable.members
      .filter((entry) => entry.rikishiId !== rikishiId)
      .slice(0, 6);
  }, [publishedStable, rikishiId]);
  const stableContextEntries = stablemates.length > 0 ? stablemates : publishedStablemates;
  const stableContextSource = stablemates.length > 0
    ? 'Routeable directory'
    : publishedStablemates.length > 0
      ? 'Published stable snapshot'
      : null;

  const isLoading = summaryQuery.isLoading || timelineQuery.isLoading || progressionQuery.isLoading || kimariteQuery.isLoading;

  const firstError = summaryQuery.error || timelineQuery.error || progressionQuery.error || kimariteQuery.error;
  const isNotFound = isResourceNotFoundError(firstError);
  const isLiveDataUnavailable = isApiUnavailableError(firstError);
  const isNumericId = /^\d+$/.test(rikishiId);
  const shikona = summaryQuery.data?.shikona ?? publishedEntry?.shikona ?? rikishiId;
  const pageTitle = `Sumo Sauce - ${shikona} (${rikishiId})`;
  const pageDesc = `${shikona} career profile, rank progression, kimarite stats, and head-to-head matchups on Sumo Sauce.`;
  const suggestedDomainProfile = useMemo(() => {
    if (!publishedEntry || !directoryQuery.data?.length) return null;
    const publishedName = String(publishedEntry.shikona || '').trim().toLowerCase();
    if (!publishedName) return null;
    return directoryQuery.data.find((entry) => String(entry.shikona || '').trim().toLowerCase() === publishedName) ?? null;
  }, [publishedEntry, directoryQuery.data]);

  useEffect(() => {
    setIsFav(isFavoriteRikishi(rikishiId));
  }, [rikishiId]);

  useEffect(() => {
    if (!rikishiId || !summaryQuery.data) return;
    trackRikishiPageView(rikishiId);
    trackRikishiView(rikishiId, summaryQuery.data.shikona ?? rikishiId);
  }, [rikishiId, summaryQuery.data]);

  useEffect(() => {
    if (isLoading) return;

    const elements = SECTION_ITEMS
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio || a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]?.target?.id) {
          setActiveSectionId(visible[0].target.id as SectionId);
        }
      },
      {
        rootMargin: '-18% 0px -68% 0px',
        threshold: [0.1, 0.3, 0.5, 0.75],
      },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [isLoading, rikishiId]);

  if (!rikishiId) {
    return <ErrorCard code="INVALID_INPUT" message="Invalid rikishi id." />;
  }

  if (isLoading) {
    return <RikishiProfileSkeleton />;
  }

  if (isNotFound) {
    return (
      <div data-testid="rikishi-page-not-found" className="mx-auto max-w-6xl space-y-6 p-4 text-zinc-200 sm:space-y-7 sm:p-6">
        <PageMeta title={pageTitle} description={pageDesc} />

        <PremiumPageHeader
          accentLabel="PROFILE FALLBACK"
          title={publishedEntry?.shikona ?? rikishiId}
          subtitle={isNumericId
            ? 'This numeric wrestler id is not a routable domain rikishi id in the currently loaded backend build.'
            : 'This rikishi id is not present in the currently loaded domain build.'}
          badge={publishedEntry?.division ?? (isNumericId ? 'Entity/profile id' : 'Domain id not loaded')}
          breadcrumbs={[
            { label: 'Home', to: '/' },
            { label: 'Rikishi', to: '/rikishi' },
            { label: rikishiId },
          ]}
          favorite={{
            active: isFav,
            onToggle: () => { toggleFavoriteRikishi(rikishiId, shikona); setIsFav(!isFav); },
            ariaLabel: isFav ? `Remove ${shikona} from watchlist` : `Save ${shikona} to watchlist`,
          }}
        />

        <PremiumSectionShell
          title="Rikishi domain page unavailable"
          subtitle="The profile is not treated as missing. This route currently cannot resolve in the loaded domain dataset."
        >
          <DataUnavailableState
            title="Published profile and search paths remain available"
            description={getApiFailureMessage(firstError, 'This rikishi route could not be resolved in the current domain build.')}
            detail={isNumericId
              ? 'Numeric/entity ids are not guaranteed to match domain rikishi ids. Use the profile layer and routeable directory links while domain coverage is incomplete.'
              : 'This is likely a backend build-coverage gap for this rikishi id. Use profile/search routes until domain data is loaded.'}
            actions={[
              ...(isNumericId ? [{ label: 'Open wrestler profile layer', to: `/wrestler/${encodeURIComponent(rikishiId)}` }] : []),
              ...(suggestedDomainProfile ? [{ label: `Open routeable profile: ${suggestedDomainProfile.shikona}`, to: `/rikishi/${encodeURIComponent(suggestedDomainProfile.rikishiId)}` }] : []),
              { label: 'Browse rikishi', to: '/rikishi' },
              { label: 'Search profiles', to: '/search' },
            ]}
          />
        </PremiumSectionShell>

        {publishedEntry ? (
          <VerifiedProfileCard
            rikishiId={rikishiId}
            shikona={publishedEntry.shikona}
            heya={publishedEntry.heya}
          />
        ) : null}
      </div>
    );
  }

  if (isLiveDataUnavailable && publishedEntry) {
    return (
      <div data-testid="rikishi-page-partial" className="mx-auto max-w-6xl space-y-6 p-4 text-zinc-200 sm:space-y-7 sm:p-6">
        <PageMeta title={pageTitle} description={pageDesc} />

        <PremiumPageHeader
          accentLabel="PUBLISHED PROFILE"
          title={publishedEntry.shikona}
          subtitle="The canonical published profile is still available, but live career, basho, and rivalry services are unavailable on this deployment right now."
          badge={publishedEntry.division ?? rikishiId}
          breadcrumbs={[
            { label: 'Home', to: '/' },
            { label: 'Rikishi', to: '/rikishi' },
            { label: rikishiId },
          ]}
          favorite={{
            active: isFav,
            onToggle: () => { toggleFavoriteRikishi(rikishiId, shikona); setIsFav(!isFav); },
            ariaLabel: isFav ? `Remove ${shikona} from watchlist` : `Save ${shikona} to watchlist`,
          }}
          actions={
            <>
              <Link
                to="/search"
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-white"
              >
                Search profiles
              </Link>
              {stableHref ? (
                <Link
                  to={stableHref}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-white"
                >
                  {stableName} stable →
                </Link>
              ) : null}
            </>
          }
        >
          <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
              Published profile available
            </span>
            {publishedEntry.lastVerifiedBasho ? (
              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
                Verified through {publishedEntry.lastVerifiedBasho}
              </span>
            ) : null}
            {!publishedEntry.routeable ? (
              <span className="rounded-full border border-amber-700/30 bg-amber-950/18 px-3 py-1 text-amber-100">
                Routeable career page not published yet
              </span>
            ) : null}
          </div>
        </PremiumPageHeader>

        <PremiumSectionShell
          title="Live career data is unavailable"
          subtitle="This page can still show the published trust/profile layer, but timeline, kimarite, rivalry, and tournament-linked records modules need the hosted backend."
        >
          <DataUnavailableState
            title="Published profile still available"
            description={getApiFailureMessage(firstError, 'Live rikishi services are unavailable right now.')}
            detail="This is not the same as the wrestler being missing. The published profile exists, but the live rikishi API needed for the deeper career page is unavailable."
            actions={[
              { label: 'Browse rikishi', to: '/rikishi' },
              { label: 'Search profiles', to: '/search' },
              ...(stableHref ? [{ label: 'Open stable page', to: stableHref }] : []),
            ]}
          />
        </PremiumSectionShell>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-start">
          <VerifiedProfileCard
            rikishiId={rikishiId}
            shikona={publishedEntry.shikona}
            heya={publishedEntry.heya}
          />

          <PremiumSectionShell
            title="What is still available"
            subtitle="Use the published profile layer for identity, trust, and safe next clicks while the live data service is offline."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Profile trust</div>
                <div className="mt-2 text-lg font-semibold text-white">{publishedEntry.profile.profileConfidence}</div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  Verified image and provenance rules still come from the canonical published profile layer.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Published roster layer</div>
                <div className="mt-2 text-lg font-semibold text-white">{publishedEntry.division ?? 'Unpublished'}</div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  Stable and division context remain browseable from the published roster snapshot.
                </p>
              </div>
            </div>
          </PremiumSectionShell>
        </div>

        {stableContextEntries.length > 0 ? (
          <PremiumSectionShell
            title="Stable context still available"
            subtitle="Even without the live career API, the published profile layer can still connect this rikishi to stable browsing."
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              {stableContextSource ? <PremiumBadge variant="zinc">{stableContextSource}</PremiumBadge> : null}
              {stableName ? <span>{stableName} stable</span> : null}
            </div>
            <div className="mt-4 grid gap-2">
              {stableContextEntries.map((entry) => (
                <RikishiDiscoveryRow
                  key={('key' in entry ? entry.key : entry.rikishiId) ?? entry.shikona}
                  entry={entry}
                  compact
                />
              ))}
            </div>
          </PremiumSectionShell>
        ) : null}
      </div>
    );
  }

  if (firstError || !summaryQuery.data || !kimariteQuery.data) {
    const errCode = firstError instanceof ApiError ? firstError.code : 'UNKNOWN';
    const errMsg = firstError instanceof ApiError
      ? getApiFailureMessage(firstError, 'An unexpected error occurred.')
      : 'An unexpected error occurred.';
    return <ErrorCard code={errCode} message={errMsg} />;
  }

  return (
    <div data-testid="rikishi-page" className="mx-auto max-w-7xl space-y-6 p-4 text-zinc-200 sm:space-y-7 sm:p-6">
      <PageMeta title={pageTitle} description={pageDesc} />

      <PremiumPageHeader
        accentLabel="RIKISHI PROFILE"
        title={shikona}
        subtitle={summaryQuery.data.heya ? `${summaryQuery.data.heya} stable, with published career, rivalry, and records context.` : 'Published career, rivalry, and records context.'}
        badge={summaryQuery.data.highestRank?.rank ? `Peak ${summaryQuery.data.highestRank.rank}` : rikishiId}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Rikishi', to: '/rikishi' },
          { label: rikishiId },
        ]}
        favorite={{
          active: isFav,
          onToggle: () => { toggleFavoriteRikishi(rikishiId, shikona); setIsFav(!isFav); },
          ariaLabel: isFav ? `Remove ${shikona} from watchlist` : `Save ${shikona} to watchlist`,
        }}
        actions={
          <>
            <Link
              to="/watchlist"
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-white"
            >
              Watchlist
            </Link>

            {stableHref ? (
              <Link
                to={stableHref}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-white"
              >
                {stableName} stable →
              </Link>
            ) : null}

            {primaryCompareTarget ? (
              <Link
                to={`/compare/${encodeURIComponent(rikishiId)}/${encodeURIComponent(primaryCompareTarget.opponentId)}`}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-white"
              >
                Compare vs {primaryCompareTarget.opponentShikona} →
              </Link>
            ) : h2hPreviewQuery.isLoading ? (
              <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-500">
                Finding rival…
              </span>
            ) : (
              <Link
                to="/rivalries"
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-white"
              >
                Browse rivalries →
              </Link>
            )}
          </>
        }
      >
        <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
            <span className="font-semibold text-white">{distinctBashoCount}</span> basho in the loaded career
          </span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
            <span className="font-semibold text-white">{summaryQuery.data.highestRank.rank}</span> peak rank
          </span>
          {stableName ? (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
              Stable context available
            </span>
          ) : null}
        </div>
      </PremiumPageHeader>

      <RikishiSectionNav sections={SECTION_ITEMS} activeId={activeSectionId} variant="mobile" />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
        <div className="space-y-8 sm:space-y-10">
          <ProfileSectionGroup
            id="overview"
            title="Overview"
            subtitle="Identity, trust, and the fastest read on this rikishi."
          >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-start">
              <VerifiedProfileCard
                rikishiId={rikishiId}
                shikona={shikona}
                heya={summaryQuery.data.heya}
                rank={summaryQuery.data.highestRank?.rank}
              />
              <RikishiSummaryCard
                summary={summaryQuery.data}
                timeline={timelineChrono}
                rankProgression={progressionQuery.data || []}
              />
            </div>

            <PremiumSectionShell
              title="Stable roster context"
              subtitle={stableName
                ? `Move from ${shikona}'s profile into ${stableName} stable depth and routeable stablemates.`
                : 'Stable browsing becomes available when a heya is published for this rikishi.'}
              trailing={stableHref ? (
                <Link
                  to={stableHref}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                >
                  Open stable page
                </Link>
              ) : undefined}
            >
              {!stableName ? (
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm leading-relaxed text-zinc-400">
                  Stable information is not published for this profile yet, so Sumo Sauce cannot safely connect this rikishi into the stable layer.
                </div>
              ) : directoryQuery.isLoading && stableContextEntries.length === 0 ? (
                <div className="grid gap-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
                  ))}
                </div>
              ) : stableContextEntries.length === 0 ? (
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm leading-relaxed text-zinc-400">
                  {directoryQuery.error
                    ? `Live stable roster data is unavailable right now, and no published stablemates are currently visible for ${stableName}.`
                    : `No additional routeable stablemates are currently published for ${stableName}.`}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <PremiumBadge variant="zinc">{stableContextEntries.length} stablemates shown</PremiumBadge>
                    {stableContextSource ? <PremiumBadge variant="zinc">{stableContextSource}</PremiumBadge> : null}
                    <span>
                      {stableContextSource === 'Published stable snapshot'
                        ? 'This stable context is coming from the published profile layer because the live routeable roster feed is unavailable.'
                        : 'Roster depth is derived from the routeable directory and current verified roster context where published.'}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {stableContextEntries.map((entry) => (
                      <RikishiDiscoveryRow key={('key' in entry ? entry.key : entry.rikishiId) ?? entry.shikona} entry={entry} compact />
                    ))}
                  </div>
                </div>
              )}
            </PremiumSectionShell>
          </ProfileSectionGroup>

          <ProfileSectionGroup
            id="performance"
            title="Performance"
            subtitle="Recent form, consistency, and field context."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <ConsistencyScore
                timeline={timelineChrono}
                rankProgression={progressionQuery.data || []}
              />
              <StreakCard rankProgression={progressionQuery.data || []} />
            </div>

            {fieldStandingsQuery.data && (
              <PerformanceVsField
                timeline={timelineChrono}
                standingsMap={fieldStandingsQuery.data}
                rikishiId={rikishiId}
              />
            )}

            <PremiumSectionShell title="Recent Basho Performance" subtitle="Last 6 tournaments">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {recentBasho.map((row) => {
                  const positive = row.wins > row.losses;
                  return (
                    <div
                      key={`${row.bashoId}-${row.division}`}
                      className={`rounded-lg border p-3.5 transition-all duration-200 ${
                        positive
                          ? 'border-emerald-700/40 bg-emerald-950/15 hover:border-emerald-600/50'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                          className="font-semibold text-red-400 hover:text-red-300 transition-colors"
                          to={`/basho/${encodeURIComponent(row.bashoId)}/${encodeURIComponent(row.division)}`}
                        >
                          {row.bashoId}
                        </Link>
                        <PremiumBadge variant={positive ? 'green' : 'zinc'}>{row.division}</PremiumBadge>
                      </div>
                      <div className="mt-2 flex flex-col gap-1 text-sm text-zinc-300 sm:flex-row sm:items-center sm:gap-4">
                        <span>Rank: <span className="font-medium text-white">{row.rank}</span></span>
                        <span>Record: <span className={`font-bold ${positive ? 'text-emerald-300' : 'text-zinc-200'}`}>{row.wins}-{row.losses}</span></span>
                      </div>
                    </div>
                  );
                })}
                {!recentBasho.length && <div className="text-sm text-zinc-500">No recent basho data.</div>}
              </div>
            </PremiumSectionShell>
          </ProfileSectionGroup>

          <ProfileSectionGroup
            id="ranking"
            title="Ranking"
            subtitle="Promotion, demotion, and the key basho behind the climb or slide."
          >
            <Suspense
              fallback={
                <PremiumSectionShell title="Rank Progression">
                  <div className="h-64 w-full skeleton-shimmer rounded-lg" />
                </PremiumSectionShell>
              }
            >
              <RikishiRankChart points={progressionQuery.data || []} />
            </Suspense>

            <HistoricalRankExplorer
              timeline={timelineChrono}
              rankProgression={progressionQuery.data || []}
              highestRank={summaryQuery.data.highestRank}
            />
          </ProfileSectionGroup>

          <ProfileSectionGroup
            id="records"
            title="Records & Milestones"
            subtitle="Championship markers, standout basho, and achievement context the current feed supports."
          >
            <RecordsMilestonesPanel
              shikona={shikona}
              rikishiId={rikishiId}
              timeline={timelineChrono}
              rankProgression={progressionQuery.data || []}
              highestRank={summaryQuery.data.highestRank}
              legacyRecords={legacyAchievementsQuery.data || []}
              legacyRecordsLoading={legacyAchievementsQuery.isLoading}
            />
          </ProfileSectionGroup>

          <ProfileSectionGroup
            id="career"
            title="Career Record"
            subtitle="Scan the career basho by basho and jump into the tournaments behind each step."
          >
            <CareerTable rows={timelineChrono} />
            <CareerHeatmap timeline={timelineChrono} />
            <KimariteChart stats={kimariteQuery.data} />
          </ProfileSectionGroup>

          <ProfileSectionGroup
            id="matchups"
            title="Matchups"
            subtitle="Likely rivals, comparison views, and recent head-to-head context."
          >
            <PremiumSectionShell
              title="Head-to-Head Preview"
              subtitle="Top rivals by recent matchups"
              trailing={(
                <Link
                  to={`/rivalries?q=${encodeURIComponent(shikona)}`}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                >
                  Explore all rivalries
                </Link>
              )}
            >
              <div className="space-y-2">
                {h2hPreviewTop3.map((row) => {
                  const insight = buildRivalryInsight({
                    winsA: row.wins,
                    winsB: row.losses,
                    totalMatches: row.totalMatches,
                    labelA: shikona,
                    labelB: row.opponentShikona,
                  });

                  return (
                    <Link
                      key={row.opponentId}
                      to={`/compare/${encodeURIComponent(rikishiId)}/${encodeURIComponent(row.opponentId)}`}
                      className="group block rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all duration-200 hover:border-red-600/50 hover:bg-white/[0.04]"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-semibold text-white transition-colors group-hover:text-red-300">{row.opponentShikona}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            <span>{row.opponentId}</span>
                            <PremiumBadge variant={getRivalryStateVariant(insight.state)}>{insight.label}</PremiumBadge>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-white">
                            <span className="text-emerald-400">{row.wins}</span>
                            <span className="text-zinc-600"> – </span>
                            <span className="text-red-400">{row.losses}</span>
                          </div>
                          <div className="text-xs text-zinc-500">{row.totalMatches} bouts</div>
                        </div>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{insight.detail}</p>
                    </Link>
                  );
                })}
                {!h2hPreviewTop3.length && <div className="text-sm text-zinc-500">No head-to-head data available.</div>}
              </div>
            </PremiumSectionShell>

            <RivalryList
              rikishiId={rikishiId}
              shikona={shikona}
              rivals={h2hPreviewQuery.data || []}
              isLoading={h2hPreviewQuery.isLoading}
            />
          </ProfileSectionGroup>

          <ProfileSectionGroup
            id="bouts"
            title="Recent Bouts"
            subtitle="Latest bout timeline and a final check on loaded data layers."
          >
            <RikishiBoutTimeline timeline={timelineChrono} limit={20} />

            <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-start gap-2 text-sm">
                {timelineChrono.length > 0 && kimariteQuery.data && progressionQuery.data ? (
                  <>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950/40 text-xs text-emerald-400">✔</span>
                    <span className="text-zinc-400">
                      Verified — {timelineChrono.length} basho entries, kimarite and rank data loaded
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-950/40 text-xs text-amber-400">⚠</span>
                    <span className="text-zinc-400">
                      Incomplete —
                      {!timelineChrono.length ? ' no timeline data' : ''}
                      {!kimariteQuery.data ? ' no kimarite data' : ''}
                      {!progressionQuery.data ? ' no rank progression' : ''}
                    </span>
                  </>
                )}
              </div>
            </section>
          </ProfileSectionGroup>
        </div>

        <RikishiSectionNav sections={SECTION_ITEMS} activeId={activeSectionId} variant="desktop" />
      </div>
    </div>
  );
}
