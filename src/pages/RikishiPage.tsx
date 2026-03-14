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
import ErrorCard from '@/components/ui/ErrorCard';
import PageMeta from '@/components/ui/PageMeta';
import { trackRikishiPageView } from '@/utils/analytics';
import { PremiumPageHeader, PremiumSectionShell, PremiumBadge } from '@/components/ui/premium';
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
    <section id={id} className="scroll-mt-32 space-y-3 sm:scroll-mt-24 sm:space-y-4">
      <div className="px-1">
        <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-500">{subtitle}</p>
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

  const primaryCompareTarget = h2hPreviewTop3[0] ?? null;
  const stableName = summaryQuery.data?.heya ?? null;
  const stableHref = stableName ? `/stables/${encodeURIComponent(stableSlug(stableName))}` : null;
  const stablemates = useMemo(() => {
    if (!stableName || !directoryQuery.data?.length) return [];
    return getStablemates(directoryQuery.data, stableName, rikishiId, 6);
  }, [directoryQuery.data, rikishiId, stableName]);

  const isLoading = summaryQuery.isLoading || timelineQuery.isLoading || progressionQuery.isLoading || kimariteQuery.isLoading;

  const firstError = summaryQuery.error || timelineQuery.error || progressionQuery.error || kimariteQuery.error;
  const isNotFound = firstError instanceof ApiError && firstError.status === 404;
  const shikona = summaryQuery.data?.shikona ?? rikishiId;
  const pageTitle = `SumoWatch \u2014 ${shikona} (${rikishiId})`;
  const pageDesc = `${shikona} career profile, rank progression, kimarite stats, and head-to-head matchups on SumoWatch.`;

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
    return <ErrorCard code="NOT_FOUND" message="Rikishi not found." backTo="/rikishi" backLabel="← Browse rikishi" />;
  }

  if (firstError || !summaryQuery.data || !kimariteQuery.data) {
    const errCode = firstError instanceof ApiError ? firstError.code : 'UNKNOWN';
    const errMsg = firstError instanceof ApiError ? firstError.message : 'An unexpected error occurred.';
    return <ErrorCard code={errCode} message={errMsg} />;
  }

  return (
    <div data-testid="rikishi-page" className="mx-auto max-w-7xl space-y-5 p-4 text-zinc-200 sm:space-y-6 sm:p-6">
      <PageMeta title={pageTitle} description={pageDesc} />

      <PremiumPageHeader
        accentLabel="RIKISHI PROFILE"
        title={shikona}
        subtitle={summaryQuery.data.heya ?? 'Unknown heya'}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Rikishi', to: '/rikishi' },
          { label: rikishiId },
        ]}
        favorite={{
          active: isFav,
          onToggle: () => { toggleFavoriteRikishi(rikishiId); setIsFav(!isFav); },
        }}
        actions={
          <>
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
      />

      <RikishiSectionNav sections={SECTION_ITEMS} activeId={activeSectionId} variant="mobile" />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
        <div className="space-y-8 sm:space-y-10">
          <ProfileSectionGroup
            id="overview"
            title="Overview"
            subtitle="Identity, trust, and the fastest path to understanding this rikishi at a glance."
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
                ? `Move from ${shikona}'s individual profile into ${stableName} stable depth, active roster context, and related stablemates.`
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
                  Stable information is not published for this profile yet, so SumoWatch cannot safely connect this rikishi into the stable layer.
                </div>
              ) : directoryQuery.isLoading ? (
                <div className="grid gap-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
                  ))}
                </div>
              ) : stablemates.length === 0 ? (
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm leading-relaxed text-zinc-400">
                  No additional routeable stablemates are currently published for {stableName}.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <PremiumBadge variant="zinc">{stablemates.length} stablemates shown</PremiumBadge>
                    <span>Roster depth is derived from the routeable directory and current verified roster context where published.</span>
                  </div>
                  <div className="grid gap-2">
                    {stablemates.map((entry) => (
                      <RikishiDiscoveryRow key={entry.rikishiId} entry={entry} compact />
                    ))}
                  </div>
                </div>
              )}
            </PremiumSectionShell>
          </ProfileSectionGroup>

          <ProfileSectionGroup
            id="performance"
            title="Performance"
            subtitle="Recent form, consistency, and how this rikishi stacks up against the field."
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
            subtitle="Track promotion, demotion, milestones, and the key basho that shaped this rikishi's climb or slide."
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
            subtitle="Surface championship markers, standout basho, and achievement context the current wrestler feed actually supports."
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
            subtitle="Scan basho by basho, follow the shape of the career, and jump directly into the tournaments behind each step."
          >
            <CareerTable rows={timelineChrono} />
            <CareerHeatmap timeline={timelineChrono} />
            <KimariteChart stats={kimariteQuery.data} />
          </ProfileSectionGroup>

          <ProfileSectionGroup
            id="matchups"
            title="Matchups"
            subtitle="Move quickly from likely rivals to full comparison views and recent head-to-head context."
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
            subtitle="Latest bout timeline and a final check on which data layers are loaded for this profile."
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
