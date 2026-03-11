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
import CopyLinkButton from '@/components/ui/CopyLinkButton';
import ErrorCard from '@/components/ui/ErrorCard';
import PageMeta from '@/components/ui/PageMeta';
import { trackRikishiPageView } from '@/utils/analytics';
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

  const pageTitle = `SumoWatch \u2014 ${shikona} (${rikishiId})`;
  const pageDesc = `${shikona} career profile, rank progression, kimarite stats, and head-to-head matchups on SumoWatch.`;

  useEffect(() => {
    trackRikishiPageView(rikishiId);
    trackRikishiView(rikishiId, shikona);
  }, [shikona, rikishiId]);

  return (
    <div data-testid="rikishi-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta title={pageTitle} description={pageDesc} />
      <nav data-testid="breadcrumbs" className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-zinc-400">
          <Link className="text-red-400 hover:text-red-300" to="/">Home</Link>
          <span>/</span>
          <Link className="text-red-400 hover:text-red-300" to="/rikishi">Rikishi</Link>
          <span>/</span>
          <span className="text-zinc-200">{rikishiId}</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyLinkButton />
          <Link
            to={`/compare/${encodeURIComponent(rikishiId)}/`}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-red-600 hover:text-white"
          >
            Compare →
          </Link>
          <button
            type="button"
            onClick={() => { toggleFavoriteRikishi(rikishiId); setIsFav(!isFav); }}
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 transition-colors hover:border-red-600"
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`h-4 w-4 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-zinc-400'}`} />
          </button>
        </div>
      </nav>

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
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-xl font-bold text-white">Rank Progression</h2>
            <div className="mt-4 h-64 w-full skeleton-shimmer rounded-lg" />
          </section>
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

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-bold text-white">Head-to-Head Preview</h2>
        <div className="mt-3 space-y-2">
          {h2hPreviewTop3.map((row) => (
            <Link
              key={row.opponentId}
              to={`/compare/${encodeURIComponent(rikishiId)}/${encodeURIComponent(row.opponentId)}`}
              className="block rounded-lg border border-zinc-800 bg-zinc-950 p-3 transition-all duration-200 hover:border-red-600 hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-zinc-100">{row.opponentShikona}</div>
                  <div className="text-xs text-zinc-500">{row.opponentId}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-zinc-100">{row.wins}-{row.losses}</div>
                  <div className="text-xs text-zinc-500">{row.totalMatches} matches</div>
                </div>
              </div>
            </Link>
          ))}
          {!h2hPreviewTop3.length && <div className="text-sm text-zinc-400">No head-to-head data.</div>}
        </div>
      </section>

      <RivalryList
        rikishiId={rikishiId}
        rivals={h2hPreviewQuery.data || []}
        isLoading={h2hPreviewQuery.isLoading}
      />

      <RikishiBoutTimeline timeline={timelineChrono} limit={20} />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-bold text-white">Recent Basho Performance</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {recentBasho.map((row) => {
            const positive = row.wins > row.losses;
            return (
              <div
                key={`${row.bashoId}-${row.division}`}
                className={`rounded-lg border p-3 transition-colors duration-200 ${positive ? 'border-emerald-700 bg-emerald-950/20 hover:border-emerald-600' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}
              >
                <div className="flex items-center justify-between">
                  <Link
                    className="font-semibold text-red-300 hover:text-red-200"
                    to={`/basho/${encodeURIComponent(row.bashoId)}/${encodeURIComponent(row.division)}`}
                  >
                    {row.bashoId}
                  </Link>
                  <div className="text-sm text-zinc-300">{row.division}</div>
                </div>
                <div className="mt-1 text-sm text-zinc-300">Rank: {row.rank}</div>
                <div className="text-sm text-zinc-300">Record: {row.wins}-{row.losses}</div>
              </div>
            );
          })}
          {!recentBasho.length && <div className="text-sm text-zinc-400">No recent basho data.</div>}
        </div>
      </section>

      {/* Data integrity indicator */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-2 text-sm">
          {timelineChrono.length > 0 && kimariteQuery.data && progressionQuery.data ? (
            <>
              <span className="text-emerald-400">✔</span>
              <span className="text-zinc-300">
                Verified — {timelineChrono.length} basho entries, kimarite and rank data loaded
              </span>
            </>
          ) : (
            <>
              <span className="text-amber-400">⚠</span>
              <span className="text-zinc-300">
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
