import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Compass, Layers3, MoveRight, Swords, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ApiError, getRikishiComparison } from '@/pages/compare/api';
import { getCareerTimeline } from '@/pages/rikishi/api';
import CompareSkeleton from '@/components/ui/skeletons/CompareSkeleton';
import ErrorCard from '@/components/ui/ErrorCard';
import { PremiumBadge, PremiumPageHeader, PremiumSectionShell } from '@/components/ui/premium';
import StatBar from '@/components/compare/StatBar';
import ComparisonIdentityCard from '@/components/compare/ComparisonIdentityCard';
import PageMeta from '@/components/ui/PageMeta';
import { trackCompareUsage } from '@/utils/analytics';
import { isFavoriteRivalry, toggleFavoriteRivalry } from '@/utils/favorites';
import { trackRivalryView } from '@/utils/recentlyViewed';
import { bashoLabel } from '@/utils/basho';
import {
  buildRecentFormInsight,
  buildRivalryInsight,
  getRivalryStateVariant,
  summarizeTimelineRecord,
} from '@/utils/rivalry';
import type { TimelineItem } from '../../shared/api/v1';

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function sortRecentRows(rows: TimelineItem[]): TimelineItem[] {
  return [...rows].sort((a, b) => b.bashoId.localeCompare(a.bashoId) || a.division.localeCompare(b.division));
}

function InsightCard({
  eyebrow,
  value,
  label,
  detail,
  variant = 'zinc',
}: {
  eyebrow: string;
  value: string;
  label: string;
  detail: string;
  variant?: 'zinc' | 'amber' | 'blue' | 'red';
}) {
  const toneStyles = {
    zinc: 'border-white/[0.06] bg-white/[0.02]',
    amber: 'border-amber-700/30 bg-amber-950/15',
    blue: 'border-blue-700/30 bg-blue-950/15',
    red: 'border-red-700/30 bg-red-950/15',
  };

  return (
    <div className={`rounded-xl border p-4 ${toneStyles[variant]}`.trim()}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{eyebrow}</div>
      <div className="mt-2 font-display text-2xl font-bold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-sm font-medium text-zinc-200">{label}</div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{detail}</p>
    </div>
  );
}

export default function ComparePage() {
  const params = useParams();
  const a = String(params.a || '').trim();
  const b = String(params.b || '').trim();
  const [isSaved, setIsSaved] = useState(() => isFavoriteRivalry(a, b));

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

  const model = comparisonQuery.data ?? null;
  const shikonaA = model?.rikishiA.shikona ?? a;
  const shikonaB = model?.rikishiB.shikona ?? b;

  const eraComparison = useMemo(() => {
    const tlA = timelineAQuery.data ?? [];
    const tlB = timelineBQuery.data ?? [];
    if (!tlA.length || !tlB.length) return null;

    const bashoSetA = new Set(tlA.map((t: TimelineItem) => t.bashoId));
    const bashoSetB = new Set(tlB.map((t: TimelineItem) => t.bashoId));
    const sortedA = [...tlA].sort((x: TimelineItem, y: TimelineItem) => x.bashoId.localeCompare(y.bashoId));
    const sortedB = [...tlB].sort((x: TimelineItem, y: TimelineItem) => x.bashoId.localeCompare(y.bashoId));
    const firstA = sortedA[0]?.bashoId ?? '';
    const lastA = sortedA[sortedA.length - 1]?.bashoId ?? '';
    const firstB = sortedB[0]?.bashoId ?? '';
    const lastB = sortedB[sortedB.length - 1]?.bashoId ?? '';
    const overlapStart = firstA > firstB ? firstA : firstB;
    const overlapEnd = lastA < lastB ? lastA : lastB;
    const hasOverlap = overlapStart <= overlapEnd;
    const commonBasho = [...bashoSetA].filter((id) => bashoSetB.has(id));

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

  const rivalryInsight = useMemo(
    () =>
      model
        ? buildRivalryInsight({
            winsA: model.headToHead.rikishiAWins,
            winsB: model.headToHead.rikishiBWins,
            totalMatches: model.headToHead.totalMatches,
            labelA: model.rikishiA.shikona,
            labelB: model.rikishiB.shikona,
          })
        : null,
    [model],
  );

  const recentFormA = useMemo(
    () => sortRecentRows(model?.recentForm.a ?? []),
    [model?.recentForm.a],
  );
  const recentFormB = useMemo(
    () => sortRecentRows(model?.recentForm.b ?? []),
    [model?.recentForm.b],
  );

  const recentFormInsight = useMemo(
    () =>
      model
        ? buildRecentFormInsight({
            rowsA: recentFormA,
            rowsB: recentFormB,
            labelA: model.rikishiA.shikona,
            labelB: model.rikishiB.shikona,
          })
        : null,
    [model, recentFormA, recentFormB],
  );

  const recentSummaryA = useMemo(() => summarizeTimelineRecord(recentFormA), [recentFormA]);
  const recentSummaryB = useMemo(() => summarizeTimelineRecord(recentFormB), [recentFormB]);

  const pageTitle = model ? `SumoWatch — ${shikonaA} vs ${shikonaB}` : 'SumoWatch — Compare';
  const pageDesc = model
    ? `Head-to-head comparison of ${shikonaA} vs ${shikonaB} — rivalry snapshot, recent form, and kimarite context on SumoWatch.`
    : 'Compare two rikishi head to head on SumoWatch.';

  useEffect(() => {
    if (!model) return;
    trackCompareUsage(a, b);
    trackRivalryView(`${a}/${b}`, `${shikonaA} vs ${shikonaB}`);
  }, [a, b, model, shikonaA, shikonaB]);

  useEffect(() => {
    setIsSaved(isFavoriteRivalry(a, b));
  }, [a, b]);

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
            Start with a rivalry from the explorer or open a profile page and use its comparison entry point.
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

  if (comparisonQuery.error || !model || !rivalryInsight || !recentFormInsight) {
    const err = comparisonQuery.error;
    const errCode = err instanceof ApiError ? err.code : 'UNKNOWN';
    const errMsg = err instanceof ApiError ? err.message : 'An unexpected error occurred.';
    return <ErrorCard code={errCode} message={errMsg} />;
  }

  const topWinA = model.kimarite.a.winKimarite.slice(0, 5);
  const topWinB = model.kimarite.b.winKimarite.slice(0, 5);
  const lastMatchWinnerLabel = model.lastMatch
    ? model.lastMatch.winnerRikishiId === model.rikishiA.rikishiId
      ? model.rikishiA.shikona
      : model.lastMatch.winnerRikishiId === model.rikishiB.rikishiId
        ? model.rikishiB.shikona
        : 'Winner unavailable'
    : 'No published meeting';
  const lastMatchLabel = model.lastMatch
    ? `${bashoLabel(model.lastMatch.bashoId)} · ${model.lastMatch.division} · day ${model.lastMatch.day}`
    : 'No published bout yet';
  const sectionLinks = [
    { id: 'snapshot', label: 'Snapshot' },
    { id: 'career-baseline', label: 'Career baseline' },
    { id: 'recent-form', label: 'Recent form' },
    { id: 'kimarite', label: 'Kimarite' },
    ...(eraComparison ? [{ id: 'era-context', label: 'Era context' }] : []),
  ];

  return (
    <div className="stagger-children mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta title={pageTitle} description={pageDesc} />

      <PremiumPageHeader
        accentLabel="HEAD TO HEAD"
        title={`${model.rikishiA.shikona} vs ${model.rikishiB.shikona}`}
        subtitle="Start with the head-to-head snapshot, then use recent form and era context to see whether the rivalry story is still moving the same way."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Rivalries', to: '/rivalries' },
          { label: `${shikonaA} vs ${shikonaB}` },
        ]}
        actions={(
          <>
            <Link
              to="/watchlist"
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-white"
            >
              Watchlist
            </Link>
            <Link
              to="/rivalries"
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-white"
            >
              Rivalry Explorer
            </Link>
          </>
        )}
        favorite={{
          active: isSaved,
          onToggle: () => {
            toggleFavoriteRivalry(a, b, `${shikonaA} vs ${shikonaB}`);
            setIsSaved(!isSaved);
          },
          ariaLabel: isSaved ? `Remove ${shikonaA} vs ${shikonaB} from watchlist` : `Save ${shikonaA} vs ${shikonaB} to watchlist`,
        }}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(300px,0.95fr)]">
          <ComparisonIdentityCard
            rikishiId={model.rikishiA.rikishiId}
            shikona={model.rikishiA.shikona}
            heya={model.rikishiA.heya}
            accent="red"
          />
          <ComparisonIdentityCard
            rikishiId={model.rikishiB.rikishiId}
            shikona={model.rikishiB.shikona}
            heya={model.rikishiB.heya}
            accent="blue"
          />

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              WHAT TO READ FIRST
            </div>
            <div className="mt-3">
              <PremiumBadge variant={getRivalryStateVariant(rivalryInsight.state)}>
                {rivalryInsight.label}
              </PremiumBadge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{rivalryInsight.detail}</p>

            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                <TrendingUp className="h-3.5 w-3.5" />
                Recent context
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{recentFormInsight.detail}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {sectionLinks.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                >
                  {section.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </PremiumPageHeader>

      <section id="snapshot" className="scroll-mt-28">
        <PremiumSectionShell
          title="Head-to-Head Snapshot"
          subtitle="Start here to understand the overall series before you move into current form or style differences."
          trailing={<PremiumBadge variant={getRivalryStateVariant(rivalryInsight.state)}>{rivalryInsight.label}</PremiumBadge>}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InsightCard
              eyebrow="Series record"
              value={`${model.headToHead.rikishiAWins}-${model.headToHead.rikishiBWins}`}
              label={`${shikonaA} vs ${shikonaB}`}
              detail={rivalryInsight.detail}
              variant={getRivalryStateVariant(rivalryInsight.state)}
            />
            <InsightCard
              eyebrow="Published bouts"
              value={String(model.headToHead.totalMatches)}
              label="Total head-to-head meetings"
              detail={`${shikonaA} and ${shikonaB} have met in ${model.headToHead.totalMatches} published bouts.`}
            />
            <InsightCard
              eyebrow="Last meeting"
              value={lastMatchWinnerLabel}
              label={lastMatchLabel}
              detail={model.lastMatch ? 'Last published winner and meeting context.' : 'No last-match context is published yet.'}
              variant={model.lastMatch ? 'blue' : 'zinc'}
            />
            <InsightCard
              eyebrow="Shared context"
              value={String(model.commonBashoCount)}
              label="Common basho"
              detail="Use this as a rough indicator of how much tournament overlap exists in the loaded comparison data."
            />
          </div>

          <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <StatBar
              labelA={shikonaA}
              valueA={model.headToHead.rikishiAWins}
              labelB={shikonaB}
              valueB={model.headToHead.rikishiBWins}
              colorA="bg-red-500"
              colorB="bg-blue-500"
            />
          </div>

          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            Snapshot summaries use the currently published head-to-head record for these two rikishi. If recent form tells a different story, read that as current context rather than a contradiction.
          </p>
        </PremiumSectionShell>
      </section>

      <section id="career-baseline" className="scroll-mt-28">
        <PremiumSectionShell
          title="Career Baseline"
          subtitle="Use the broader career record to separate long-run strength from the direct head-to-head story."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <InsightCard
              eyebrow={shikonaA}
              value={formatPct(
                model.kimarite.a.totalWins + model.kimarite.a.totalLosses > 0
                  ? (model.kimarite.a.totalWins / (model.kimarite.a.totalWins + model.kimarite.a.totalLosses)) * 100
                  : 0,
              )}
              label="Career win rate"
              detail={`${shikonaA} has ${model.kimarite.a.totalWins} career wins in the loaded kimarite record.`}
              variant="blue"
            />
            <InsightCard
              eyebrow={shikonaB}
              value={formatPct(
                model.kimarite.b.totalWins + model.kimarite.b.totalLosses > 0
                  ? (model.kimarite.b.totalWins / (model.kimarite.b.totalWins + model.kimarite.b.totalLosses)) * 100
                  : 0,
              )}
              label="Career win rate"
              detail={`${shikonaB} has ${model.kimarite.b.totalWins} career wins in the loaded kimarite record.`}
              variant="blue"
            />
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-1 text-xs uppercase tracking-[0.14em] text-zinc-500">Career wins</div>
              <StatBar
                labelA={shikonaA}
                valueA={model.kimarite.a.totalWins}
                labelB={shikonaB}
                valueB={model.kimarite.b.totalWins}
                colorA="bg-red-500"
                colorB="bg-blue-500"
              />
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-[0.14em] text-zinc-500">Career win percentage</div>
              <StatBar
                labelA={shikonaA}
                valueA={Math.round(
                  model.kimarite.a.totalWins + model.kimarite.a.totalLosses > 0
                    ? (model.kimarite.a.totalWins / (model.kimarite.a.totalWins + model.kimarite.a.totalLosses)) * 100
                    : 0,
                )}
                labelB={shikonaB}
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
        </PremiumSectionShell>
      </section>

      <section id="recent-form" className="scroll-mt-28">
        <PremiumSectionShell
          title="Recent Form Context"
          subtitle="Check whether the latest loaded basho keep reinforcing the rivalry story or suggest that momentum is shifting."
          trailing={<PremiumBadge variant={getRivalryStateVariant(recentFormInsight.state)}>{recentFormInsight.label}</PremiumBadge>}
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                <TrendingUp className="h-3.5 w-3.5" />
                Loaded recent summary
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">{recentFormInsight.detail}</p>

              <div className="mt-4 grid gap-2">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">{shikonaA}</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {recentSummaryA.wins}-{recentSummaryA.losses}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formatPct(recentSummaryA.winPct)} win rate across {recentFormA.length} loaded basho
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">{shikonaB}</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {recentSummaryB.wins}-{recentSummaryB.losses}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formatPct(recentSummaryB.winPct)} win rate across {recentFormB.length} loaded basho
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-100">{shikonaA}</h3>
              <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-zinc-400">
                      <th className="px-3 py-2 text-left">Basho</th>
                      <th className="px-3 py-2 text-left">Div</th>
                      <th className="px-3 py-2 text-left">Rank</th>
                      <th className="px-3 py-2 text-left">W-L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentFormA.map((row) => (
                      <tr key={`${row.bashoId}-${row.division}-${row.rank}-${row.wins}-${row.losses}`} className="border-b border-white/[0.04] last:border-b-0">
                        <td className="px-3 py-2 text-zinc-200">{bashoLabel(row.bashoId)}</td>
                        <td className="px-3 py-2 text-zinc-400">{row.division}</td>
                        <td className="px-3 py-2 text-zinc-300">{row.rank}</td>
                        <td className="px-3 py-2 text-zinc-100">{row.wins}-{row.losses}</td>
                      </tr>
                    ))}
                    {!recentFormA.length && (
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-zinc-500">No recent timeline rows.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-100">{shikonaB}</h3>
              <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-zinc-400">
                      <th className="px-3 py-2 text-left">Basho</th>
                      <th className="px-3 py-2 text-left">Div</th>
                      <th className="px-3 py-2 text-left">Rank</th>
                      <th className="px-3 py-2 text-left">W-L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentFormB.map((row) => (
                      <tr key={`${row.bashoId}-${row.division}-${row.rank}-${row.wins}-${row.losses}`} className="border-b border-white/[0.04] last:border-b-0">
                        <td className="px-3 py-2 text-zinc-200">{bashoLabel(row.bashoId)}</td>
                        <td className="px-3 py-2 text-zinc-400">{row.division}</td>
                        <td className="px-3 py-2 text-zinc-300">{row.rank}</td>
                        <td className="px-3 py-2 text-zinc-100">{row.wins}-{row.losses}</td>
                      </tr>
                    ))}
                    {!recentFormB.length && (
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-zinc-500">No recent timeline rows.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </PremiumSectionShell>
      </section>

      <section id="kimarite" className="scroll-mt-28">
        <PremiumSectionShell
          title="Winning Style Comparison"
          subtitle="This is where the rivalry becomes more than a scoreline: compare how each rikishi usually finishes winning bouts."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <InsightCard
              eyebrow={shikonaA}
              value={model.kimarite.a.mostUsedKimarite ?? 'Unpublished'}
              label="Most-used winning kimarite"
              detail={model.kimarite.a.mostUsedKimarite ? `${shikonaA}'s most common winning technique in the loaded record.` : 'No winning-technique summary is published yet.'}
              variant="blue"
            />
            <InsightCard
              eyebrow={shikonaB}
              value={model.kimarite.b.mostUsedKimarite ?? 'Unpublished'}
              label="Most-used winning kimarite"
              detail={model.kimarite.b.mostUsedKimarite ? `${shikonaB}'s most common winning technique in the loaded record.` : 'No winning-technique summary is published yet.'}
              variant="blue"
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-100">{shikonaA}</h3>
              {topWinA.map((item) => {
                const max = topWinA[0]?.count || 1;
                return (
                  <div key={item.kimariteId} className="mb-2 last:mb-0">
                    <div className="flex items-center justify-between text-xs text-zinc-300">
                      <span>{item.kimariteId}</span>
                      <span>{item.count} ({formatPct(item.percentage * 100)})</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded bg-white/[0.06]">
                      <div className="h-2 rounded bg-red-500" style={{ width: `${(item.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
              {!topWinA.length && <p className="text-xs text-zinc-500">No kimarite data.</p>}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-100">{shikonaB}</h3>
              {topWinB.map((item) => {
                const max = topWinB[0]?.count || 1;
                return (
                  <div key={item.kimariteId} className="mb-2 last:mb-0">
                    <div className="flex items-center justify-between text-xs text-zinc-300">
                      <span>{item.kimariteId}</span>
                      <span>{item.count} ({formatPct(item.percentage * 100)})</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded bg-white/[0.06]">
                      <div className="h-2 rounded bg-blue-500" style={{ width: `${(item.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
              {!topWinB.length && <p className="text-xs text-zinc-500">No kimarite data.</p>}
            </div>
          </div>
        </PremiumSectionShell>
      </section>

      {eraComparison && (
        <section id="era-context" className="scroll-mt-28">
          <PremiumSectionShell
            title="Era Context"
            subtitle="Use this to understand whether the rivalry happened inside the same competitive window or mostly belongs to different phases of their careers."
            trailing={(
              <PremiumBadge variant={eraComparison.hasOverlap ? 'green' : 'amber'}>
                {eraComparison.hasOverlap ? 'Career overlap' : 'Different eras'}
              </PremiumBadge>
            )}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <InsightCard
                eyebrow={shikonaA}
                value={`${eraComparison.spanA.bashoCount}`}
                label={`${bashoLabel(eraComparison.spanA.first)} → ${bashoLabel(eraComparison.spanA.last)}`}
                detail={`${formatPct(eraComparison.careerWinPctA)} career win rate across the loaded timeline.`}
              />
              <InsightCard
                eyebrow={shikonaB}
                value={`${eraComparison.spanB.bashoCount}`}
                label={`${bashoLabel(eraComparison.spanB.first)} → ${bashoLabel(eraComparison.spanB.last)}`}
                detail={`${formatPct(eraComparison.careerWinPctB)} career win rate across the loaded timeline.`}
              />
            </div>

            <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              {eraComparison.hasOverlap ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <Layers3 className="h-4 w-4 text-emerald-400" />
                    Overlap: {bashoLabel(eraComparison.overlapStart)} → {bashoLabel(eraComparison.overlapEnd)}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    These two rikishi shared {eraComparison.commonBashoCount} common basho in the loaded timeline. During the overlap window, {shikonaA} averaged {eraComparison.avgWinsOverlapA} wins and {shikonaB} averaged {eraComparison.avgWinsOverlapB} wins.
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Compass className="h-4 w-4 text-amber-400" />
                  No direct career overlap is visible in the loaded timeline data.
                </div>
              )}
            </div>
          </PremiumSectionShell>
        </section>
      )}

      <PremiumSectionShell
        title="Keep Browsing Rivalries"
        subtitle="Use this comparison as a launch point into broader head-to-head work instead of treating it as a dead-end page."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Link
            to="/rivalries"
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-red-600/40 hover:bg-white/[0.04]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Explore all</div>
            <div className="mt-2 font-display text-xl font-bold tracking-tight text-white">Rivalry Explorer</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Browse high-volume, balanced, and decisive head-to-head series across the current rivalry surface.
            </p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors group-hover:text-zinc-300">
              Open explorer
              <MoveRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            to={`/rivalries?q=${encodeURIComponent(shikonaA)}`}
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-red-600/40 hover:bg-white/[0.04]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{shikonaA}</div>
            <div className="mt-2 font-display text-xl font-bold tracking-tight text-white">More rivalries</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Filter the explorer to series involving {shikonaA} and use this comparison as one stop in a larger rivalry map.
            </p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors group-hover:text-zinc-300">
              Open filtered explorer
              <MoveRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            to={`/rivalries?q=${encodeURIComponent(shikonaB)}`}
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-red-600/40 hover:bg-white/[0.04]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{shikonaB}</div>
            <div className="mt-2 font-display text-xl font-bold tracking-tight text-white">More rivalries</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Jump from this pair into the rest of {shikonaB}&apos;s visible head-to-head landscape in the explorer.
            </p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors group-hover:text-zinc-300">
              Open filtered explorer
              <MoveRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>
      </PremiumSectionShell>
    </div>
  );
}
