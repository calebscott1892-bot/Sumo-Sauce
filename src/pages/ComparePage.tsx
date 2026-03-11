import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Swords } from 'lucide-react';
import { ApiError, getRikishiComparison } from '@/pages/compare/api';
import { getCareerTimeline } from '@/pages/rikishi/api';
import CompareSkeleton from '@/components/ui/skeletons/CompareSkeleton';
import ErrorCard from '@/components/ui/ErrorCard';
import { PremiumPageHeader } from '@/components/ui/premium';
import StatBar from '@/components/compare/StatBar';
import PageMeta from '@/components/ui/PageMeta';
import { trackCompareUsage } from '@/utils/analytics';
import { trackRivalryView } from '@/utils/recentlyViewed';
import { parseBashoId, bashoLabel } from '@/utils/basho';
import type { TimelineItem } from '../../shared/api/v1';

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function heyaLabel(heya: string | null): string {
  return heya && heya.trim() ? heya : 'Unknown heya';
}

export default function ComparePage() {
  const params = useParams();
  const a = String(params.a || '').trim();
  const b = String(params.b || '').trim();

  const comparisonQuery = useQuery({
    queryKey: ['rikishi-compare', a, b],
    queryFn: () => getRikishiComparison(a, b),
    enabled: Boolean(a && b),
  });

  const timelineAQuery = useQuery({
    queryKey: ['rikishi-timeline', a],
    queryFn: () => getCareerTimeline(a),
    enabled: Boolean(a),
  });

  const timelineBQuery = useQuery({
    queryKey: ['rikishi-timeline', b],
    queryFn: () => getCareerTimeline(b),
    enabled: Boolean(b),
  });

  // Era comparison data
  const eraComparison = useMemo(() => {
    const tlA = timelineAQuery.data ?? [];
    const tlB = timelineBQuery.data ?? [];
    if (!tlA.length || !tlB.length) return null;

    const bashoSetA = new Set(tlA.map((t: TimelineItem) => t.bashoId));
    const bashoSetB = new Set(tlB.map((t: TimelineItem) => t.bashoId));

    // Career spans
    const sortedA = [...tlA].sort((x: TimelineItem, y: TimelineItem) => x.bashoId.localeCompare(y.bashoId));
    const sortedB = [...tlB].sort((x: TimelineItem, y: TimelineItem) => x.bashoId.localeCompare(y.bashoId));
    const firstA = sortedA[0]?.bashoId ?? '';
    const lastA = sortedA[sortedA.length - 1]?.bashoId ?? '';
    const firstB = sortedB[0]?.bashoId ?? '';
    const lastB = sortedB[sortedB.length - 1]?.bashoId ?? '';

    // Overlap
    const overlapStart = firstA > firstB ? firstA : firstB;
    const overlapEnd = lastA < lastB ? lastA : lastB;
    const hasOverlap = overlapStart <= overlapEnd;

    const commonBasho = [...bashoSetA].filter((id) => bashoSetB.has(id));

    // Win rates during overlap period
    const overlapEntriesA = hasOverlap
      ? tlA.filter((t: TimelineItem) => t.bashoId >= overlapStart && t.bashoId <= overlapEnd)
      : [];
    const overlapEntriesB = hasOverlap
      ? tlB.filter((t: TimelineItem) => t.bashoId >= overlapStart && t.bashoId <= overlapEnd)
      : [];

    const avgWinsA = overlapEntriesA.length
      ? overlapEntriesA.reduce((s: number, t: TimelineItem) => s + t.wins, 0) / overlapEntriesA.length
      : 0;
    const avgWinsB = overlapEntriesB.length
      ? overlapEntriesB.reduce((s: number, t: TimelineItem) => s + t.wins, 0) / overlapEntriesB.length
      : 0;

    // Career win rates
    const totalWinsA = tlA.reduce((s: number, t: TimelineItem) => s + t.wins, 0);
    const totalBoutsA = tlA.reduce((s: number, t: TimelineItem) => s + t.wins + t.losses, 0);
    const totalWinsB = tlB.reduce((s: number, t: TimelineItem) => s + t.wins, 0);
    const totalBoutsB = tlB.reduce((s: number, t: TimelineItem) => s + t.wins + t.losses, 0);

    return {
      spanA: { first: firstA, last: lastA, bashoCount: bashoSetA.size },
      spanB: { first: firstB, last: lastB, bashoCount: bashoSetB.size },
      hasOverlap,
      overlapStart,
      overlapEnd,
      commonBashoCount: commonBasho.length,
      avgWinsOverlapA: Math.round(avgWinsA * 10) / 10,
      avgWinsOverlapB: Math.round(avgWinsB * 10) / 10,
      careerWinPctA: totalBoutsA > 0 ? Math.round((totalWinsA / totalBoutsA) * 1000) / 10 : 0,
      careerWinPctB: totalBoutsB > 0 ? Math.round((totalWinsB / totalBoutsB) * 1000) / 10 : 0,
    };
  }, [timelineAQuery.data, timelineBQuery.data]);

  if (!a || !b) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <nav className="mb-4 flex items-center gap-1 text-sm text-zinc-400">
          <Link className="text-red-400 hover:text-red-300" to="/">Home</Link>
          <span>/</span>
          <span className="text-zinc-200">Compare</span>
        </nav>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <Swords className="mx-auto h-12 w-12 text-zinc-600" />
          <h2 className="mt-4 text-xl font-bold text-white">Compare Two Rikishi</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Select two rikishi to see their head-to-head record, career stats, and kimarite breakdowns.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              to="/rikishi"
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-zinc-200 transition-all hover:border-red-600 hover:text-white hover-lift"
            >
              Browse rikishi directory
            </Link>
            <Link
              to="/rivalries"
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-zinc-200 transition-all hover:border-red-600 hover:text-white hover-lift"
            >
              Explore rivalries
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (comparisonQuery.isLoading) {
    return <CompareSkeleton />;
  }

  if (comparisonQuery.error instanceof ApiError && comparisonQuery.error.status === 404) {
    return <ErrorCard code="NOT_FOUND" message="Rikishi not found." backTo="/rikishi" backLabel="← Browse rikishi" />;
  }

  if (comparisonQuery.error || !comparisonQuery.data) {
    const err = comparisonQuery.error;
    const errCode = err instanceof ApiError ? err.code : 'UNKNOWN';
    const errMsg = err instanceof ApiError ? err.message : 'An unexpected error occurred.';
    return <ErrorCard code={errCode} message={errMsg} />;
  }

  const model = comparisonQuery.data;
  const topWinA = model.kimarite.a.winKimarite.slice(0, 5);
  const topWinB = model.kimarite.b.winKimarite.slice(0, 5);

  const shikonaA = model.rikishiA.shikona;
  const shikonaB = model.rikishiB.shikona;
  const pageTitle = `Sumo Sauce \u2014 ${shikonaA} vs ${shikonaB}`;
  const pageDesc = `Head-to-head comparison of ${shikonaA} vs ${shikonaB} — career stats, kimarite, and recent form on Sumo Sauce.`;

  useEffect(() => {
    trackCompareUsage(a, b);
    trackRivalryView(`${a}/${b}`, `${shikonaA} vs ${shikonaB}`);
  }, [a, b, shikonaA, shikonaB]);

  return (
    <div className="stagger-children mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta title={pageTitle} description={pageDesc} />

      <PremiumPageHeader
        accentLabel="HEAD TO HEAD"
        title={`${model.rikishiA.shikona} vs ${model.rikishiB.shikona}`}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Rikishi', to: '/rikishi' },
          { label: `${a} vs ${b}` },
        ]}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm text-zinc-300">
          <div>
            <div className="font-semibold text-zinc-100">{model.rikishiA.shikona}</div>
            <div>{model.rikishiA.rikishiId}</div>
            <div>{heyaLabel(model.rikishiA.heya)}</div>
          </div>
          <div>
            <div className="font-semibold text-zinc-100">{model.rikishiB.shikona}</div>
            <div>{model.rikishiB.rikishiId}</div>
            <div>{heyaLabel(model.rikishiB.heya)}</div>
          </div>
        </div>
      </PremiumPageHeader>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="font-display text-xl font-bold tracking-tight text-white">Head-to-Head</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.12]">
            <div className="text-zinc-400">Total</div>
            <div className="font-semibold text-zinc-100">{model.headToHead.totalMatches}</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-red-700">
            <div className="text-zinc-400">{model.rikishiA.shikona} wins</div>
            <div className="font-semibold text-zinc-100">{model.headToHead.rikishiAWins}</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-blue-700">
            <div className="text-zinc-400">{model.rikishiB.shikona} wins</div>
            <div className="font-semibold text-zinc-100">{model.headToHead.rikishiBWins}</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.12]">
            <div className="text-zinc-400">Common basho</div>
            <div className="font-semibold text-zinc-100">{model.commonBashoCount}</div>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
          <div className="text-zinc-400">Last match</div>
          {model.lastMatch ? (
            <div className="text-zinc-200">
              <Link
                className="text-red-300 hover:text-red-200"
                to={`/basho/${encodeURIComponent(model.lastMatch.bashoId)}/${encodeURIComponent(model.lastMatch.division)}`}
              >
                {model.lastMatch.bashoId}
              </Link>
              {' / '}
              {model.lastMatch.division}
              {' / day '}
              {model.lastMatch.day}
              {' / winner '}
              {model.lastMatch.winnerRikishiId || 'none'}
            </div>
          ) : (
            <div className="text-zinc-400">No matches yet.</div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <StatBar
            labelA={model.rikishiA.shikona}
            valueA={model.headToHead.rikishiAWins}
            labelB={model.rikishiB.shikona}
            valueB={model.headToHead.rikishiBWins}
            colorA="bg-red-500"
            colorB="bg-blue-500"
          />
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="font-display text-xl font-bold tracking-tight text-white">Career Comparison</h2>
        <div className="mt-3 space-y-4">
          <div>
            <div className="mb-1 text-xs text-zinc-400">Career Wins</div>
            <StatBar
              labelA={model.rikishiA.shikona}
              valueA={model.kimarite.a.totalWins}
              labelB={model.rikishiB.shikona}
              valueB={model.kimarite.b.totalWins}
              colorA="bg-red-500"
              colorB="bg-blue-500"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-400">Win Percentage</div>
            <StatBar
              labelA={model.rikishiA.shikona}
              valueA={Math.round(
                model.kimarite.a.totalWins + model.kimarite.a.totalLosses > 0
                  ? (model.kimarite.a.totalWins / (model.kimarite.a.totalWins + model.kimarite.a.totalLosses)) * 100
                  : 0,
              )}
              labelB={model.rikishiB.shikona}
              valueB={Math.round(
                model.kimarite.b.totalWins + model.kimarite.b.totalLosses > 0
                  ? (model.kimarite.b.totalWins / (model.kimarite.b.totalWins + model.kimarite.b.totalLosses)) * 100
                  : 0,
              )}
              colorA="bg-red-500"
              colorB="bg-blue-500"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="font-display text-xl font-bold tracking-tight text-white">Recent Form (Last 6)</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">{model.rikishiA.shikona}</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-zinc-400">
                  <th className="px-2 py-1 text-left">Basho</th>
                  <th className="px-2 py-1 text-left">Div</th>
                  <th className="px-2 py-1 text-left">Rank</th>
                  <th className="px-2 py-1 text-left">W-L</th>
                </tr>
              </thead>
              <tbody>
                {model.recentForm.a.map((row) => (
                  <tr key={`${row.bashoId}-${row.division}-${row.rank}-${row.wins}-${row.losses}`} className="border-b border-white/[0.04]">
                    <td className="px-2 py-1">{row.bashoId}</td>
                    <td className="px-2 py-1">{row.division}</td>
                    <td className="px-2 py-1">{row.rank}</td>
                    <td className="px-2 py-1">{row.wins}-{row.losses}</td>
                  </tr>
                ))}
                {!model.recentForm.a.length && (
                  <tr>
                    <td colSpan={4} className="px-2 py-2 text-zinc-500">No timeline rows.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">{model.rikishiB.shikona}</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-zinc-400">
                  <th className="px-2 py-1 text-left">Basho</th>
                  <th className="px-2 py-1 text-left">Div</th>
                  <th className="px-2 py-1 text-left">Rank</th>
                  <th className="px-2 py-1 text-left">W-L</th>
                </tr>
              </thead>
              <tbody>
                {model.recentForm.b.map((row) => (
                  <tr key={`${row.bashoId}-${row.division}-${row.rank}-${row.wins}-${row.losses}`} className="border-b border-white/[0.04]">
                    <td className="px-2 py-1">{row.bashoId}</td>
                    <td className="px-2 py-1">{row.division}</td>
                    <td className="px-2 py-1">{row.rank}</td>
                    <td className="px-2 py-1">{row.wins}-{row.losses}</td>
                  </tr>
                ))}
                {!model.recentForm.b.length && (
                  <tr>
                    <td colSpan={4} className="px-2 py-2 text-zinc-500">No timeline rows.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="font-display text-xl font-bold tracking-tight text-white">Kimarite Distribution</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">{model.rikishiA.shikona}</h3>
            {topWinA.map((item) => {
              const max = topWinA[0]?.count || 1;
              return (
                <div key={item.kimariteId} className="mb-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>{item.kimariteId}</span>
                    <span>{item.count} ({formatPct(item.percentage)})</span>
                  </div>
                  <div className="mt-0.5 h-2 w-full rounded bg-white/[0.06]">
                    <div className="h-2 rounded bg-red-500" style={{ width: `${(item.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {!topWinA.length && <p className="text-xs text-zinc-500">No kimarite data.</p>}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">{model.rikishiB.shikona}</h3>
            {topWinB.map((item) => {
              const max = topWinB[0]?.count || 1;
              return (
                <div key={item.kimariteId} className="mb-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>{item.kimariteId}</span>
                    <span>{item.count} ({formatPct(item.percentage)})</span>
                  </div>
                  <div className="mt-0.5 h-2 w-full rounded bg-white/[0.06]">
                    <div className="h-2 rounded bg-blue-500" style={{ width: `${(item.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {!topWinB.length && <p className="text-xs text-zinc-500">No kimarite data.</p>}
          </div>
        </div>
      </section>

      {/* Era Comparison */}
      {eraComparison && (
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="font-display text-xl font-bold tracking-tight text-white">Era Comparison</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Career span analysis and overlap between these two rikishi.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Rikishi A span */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="text-sm font-semibold text-zinc-100">{model.rikishiA.shikona}</div>
              <div className="mt-1 text-xs text-zinc-400">
                {bashoLabel(eraComparison.spanA.first)} → {bashoLabel(eraComparison.spanA.last)}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {eraComparison.spanA.bashoCount} basho · {eraComparison.careerWinPctA}% career win rate
              </div>
            </div>

            {/* Rikishi B span */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="text-sm font-semibold text-zinc-100">{model.rikishiB.shikona}</div>
              <div className="mt-1 text-xs text-zinc-400">
                {bashoLabel(eraComparison.spanB.first)} → {bashoLabel(eraComparison.spanB.last)}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {eraComparison.spanB.bashoCount} basho · {eraComparison.careerWinPctB}% career win rate
              </div>
            </div>
          </div>

          {/* Overlap info */}
          <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            {eraComparison.hasOverlap ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-400">●</span>
                  <span className="font-semibold text-zinc-100">
                    Career Overlap: {bashoLabel(eraComparison.overlapStart)} → {bashoLabel(eraComparison.overlapEnd)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  {eraComparison.commonBashoCount} shared basho
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2">
                    <div className="text-zinc-500">{model.rikishiA.shikona} avg wins (overlap)</div>
                    <div className="font-semibold text-red-400">{eraComparison.avgWinsOverlapA}</div>
                  </div>
                  <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2">
                    <div className="text-zinc-500">{model.rikishiB.shikona} avg wins (overlap)</div>
                    <div className="font-semibold text-blue-400">{eraComparison.avgWinsOverlapB}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-amber-400">●</span>
                <span className="text-zinc-300">
                  No career overlap — these rikishi competed in different eras.
                </span>
              </div>
            )}
          </div>
        </section>
      )}

    </div>
  );
}
