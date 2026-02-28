import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import CareerTable from '@/components/rikishi/CareerTable';
import KimariteChart from '@/components/rikishi/KimariteChart';
import ProfileHeader from '@/components/rikishi/ProfileHeader';
import RankChart from '@/components/rikishi/RankChart';
import {
  ApiError,
  getCareerSummary,
  getCareerTimeline,
  getDivisionStandings,
  getHeadToHead,
  getKimariteStats,
  getRankProgression,
} from '@/pages/rikishi/api';
import type { Division, TimelineItem } from '@/pages/rikishi/types';

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
        .slice(0, 8)
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
        .sort((a, b) => b.totalMatches - a.totalMatches || a.opponentId.localeCompare(b.opponentId))
        .slice(0, 3);
    },
  });

  const isLoading = summaryQuery.isLoading || timelineQuery.isLoading || progressionQuery.isLoading || kimariteQuery.isLoading;

  const firstError = summaryQuery.error || timelineQuery.error || progressionQuery.error || kimariteQuery.error;
  const isNotFound = firstError instanceof ApiError && firstError.status === 404;

  if (!rikishiId) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">Invalid rikishi id.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">Loading rikishi profile…</div>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          Rikishi not found.
          <div className="mt-2">
            <Link className="text-red-400 hover:text-red-300" to="/leaderboard">
              Back to leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (firstError || !summaryQuery.data || !kimariteQuery.data) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-red-800 bg-red-950/20 p-4">
          Failed to load profile data.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="rikishi-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <ProfileHeader summary={summaryQuery.data} />

      <RankChart points={progressionQuery.data || []} />

      <CareerTable rows={timelineChrono} />

      <KimariteChart stats={kimariteQuery.data} />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-bold text-white">Head-to-Head Preview</h2>
        <div className="mt-3 space-y-2">
          {(h2hPreviewQuery.data || []).map((row) => (
            <Link
              key={row.opponentId}
              to={`/compare/${encodeURIComponent(rikishiId)}/${encodeURIComponent(row.opponentId)}`}
              className="block rounded-lg border border-zinc-800 bg-zinc-950 p-3 hover:border-red-600"
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
          {!(h2hPreviewQuery.data || []).length && <div className="text-sm text-zinc-400">No head-to-head data.</div>}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-bold text-white">Recent Basho Performance</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {recentBasho.map((row) => {
            const positive = row.wins > row.losses;
            return (
              <div
                key={`${row.bashoId}-${row.division}`}
                className={`rounded-lg border p-3 ${positive ? 'border-emerald-700 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-zinc-100">{row.bashoId}</div>
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
    </div>
  );
}
