import { Link, useParams } from 'react-router-dom';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
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
import VerifiedProfileCard from '@/components/rikishi/VerifiedProfileCard';
import { isFavoriteRikishi, toggleFavoriteRikishi } from '@/utils/favorites';
import { trackRikishiView } from '@/utils/recentlyViewed';
import {
  ApiError,
  getCareerSummary,
  getCareerTimeline,
  getDivisionStandings,
  getHeadToHead,
  getKimariteStats,
  getRankProgression,
} from '@/pages/rikishi/api';
import RikishiProfileSkeleton from '@/components/ui/skeletons/RikishiProfileSkeleton';
import ErrorCard from '@/components/ui/ErrorCard';
import PageMeta from '@/components/ui/PageMeta';
import { trackRikishiPageView } from '@/utils/analytics';
import { PremiumPageHeader, PremiumSectionShell, PremiumBadge } from '@/components/ui/premium';
import type { Division, TimelineItem } from '@/pages/rikishi/types';

const RikishiRankChart = lazy(() => import('@/components/rikishi/RikishiRankChart'));

type H2HPreviewItem = {
  opponentId: string;
  opponentShikona: string;
  totalMatches: number;
  wins: number;
  losses: number;
};

function uniqueByBashoDivision(items: TimelineItem[]): TimelineItem[] {
  const byKey = new Map<string, TimelineItem>();
  for (const item of items) {
    const key = `${item.bashoId}::${item.division}`;
    byKey.set(key, item);
  }
  return Array.from(byKey.values()).sort((a, b) => a.bashoId.localeCompare(b.bashoId) || a.division.localeCompare(b.division));
}

export default function RikishiPage() {
  const params = useParams();
  const rikishiId = String(params.id || '').trim();

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

  const isLoading = summaryQuery.isLoading || timelineQuery.isLoading || progressionQuery.isLoading || kimariteQuery.isLoading;

  const firstError = summaryQuery.error || timelineQuery.error || progressionQuery.error || kimariteQuery.error;
  const isNotFound = firstError instanceof ApiError && firstError.status === 404;

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

  const shikona = summaryQuery.data.shikona ?? rikishiId;
  const [isFav, setIsFav] = useState(() => isFavoriteRikishi(rikishiId));

  const pageTitle = `Sumo Sauce \u2014 ${shikona} (${rikishiId})`;
  const pageDesc = `${shikona} career profile, rank progression, kimarite stats, and head-to-head matchups on Sumo Sauce.`;

  useEffect(() => {
    trackRikishiPageView(rikishiId);
    trackRikishiView(rikishiId, shikona);
  }, [shikona, rikishiId]);

  return (
    <div data-testid="rikishi-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
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
          <Link
            to={`/compare/${encodeURIComponent(rikishiId)}/`}
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-white"
          >
            Compare →
          </Link>
        }
      />

      <VerifiedProfileCard
        shikona={shikona}
        heya={summaryQuery.data.heya}
        rank={summaryQuery.data.highestRank?.rank}
      />

      <RikishiSummaryCard
        summary={summaryQuery.data}
        timeline={timelineChrono}
        rankProgression={progressionQuery.data || []}
      />

      <ConsistencyScore
        timeline={timelineChrono}
        rankProgression={progressionQuery.data || []}
      />

      <StreakCard rankProgression={progressionQuery.data || []} />

      {fieldStandingsQuery.data && (
        <PerformanceVsField
          timeline={timelineChrono}
          standingsMap={fieldStandingsQuery.data}
          rikishiId={rikishiId}
        />
      )}

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

      <CareerTable rows={timelineChrono} />

      <CareerHeatmap timeline={timelineChrono} />

      <KimariteChart stats={kimariteQuery.data} />

      <PremiumSectionShell title="Head-to-Head Preview" subtitle="Top rivals by recent matchups">
        <div className="space-y-2">
          {h2hPreviewTop3.map((row) => (
            <Link
              key={row.opponentId}
              to={`/compare/${encodeURIComponent(rikishiId)}/${encodeURIComponent(row.opponentId)}`}
              className="group block rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all duration-200 hover:border-red-600/50 hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white group-hover:text-red-300 transition-colors">{row.opponentShikona}</div>
                  <div className="text-xs text-zinc-500">{row.opponentId}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">
                    <span className="text-emerald-400">{row.wins}</span>
                    <span className="text-zinc-600"> – </span>
                    <span className="text-red-400">{row.losses}</span>
                  </div>
                  <div className="text-xs text-zinc-500">{row.totalMatches} bouts</div>
                </div>
              </div>
            </Link>
          ))}
          {!h2hPreviewTop3.length && <div className="text-sm text-zinc-500">No head-to-head data available.</div>}
        </div>
      </PremiumSectionShell>

      <RivalryList
        rikishiId={rikishiId}
        rivals={h2hPreviewQuery.data || []}
        isLoading={h2hPreviewQuery.isLoading}
      />

      <RikishiBoutTimeline timeline={timelineChrono} limit={20} />

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
                <div className="flex items-center justify-between">
                  <Link
                    className="font-semibold text-red-400 hover:text-red-300 transition-colors"
                    to={`/basho/${encodeURIComponent(row.bashoId)}/${encodeURIComponent(row.division)}`}
                  >
                    {row.bashoId}
                  </Link>
                  <PremiumBadge variant={positive ? 'green' : 'zinc'}>{row.division}</PremiumBadge>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-zinc-300">
                  <span>Rank: <span className="font-medium text-white">{row.rank}</span></span>
                  <span>Record: <span className={`font-bold ${positive ? 'text-emerald-300' : 'text-zinc-200'}`}>{row.wins}-{row.losses}</span></span>
                </div>
              </div>
            );
          })}
          {!recentBasho.length && <div className="text-sm text-zinc-500">No recent basho data.</div>}
        </div>
      </PremiumSectionShell>

      {/* Data integrity indicator */}
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 text-sm">
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
    </div>
  );
}
