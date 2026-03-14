import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Medal, Sparkles, Trophy } from 'lucide-react';
import { PremiumBadge, PremiumSectionShell } from '@/components/ui/premium';
import { bashoLabel, divisionLabel } from '@/utils/basho';
import {
  computeProgressionStreaks,
  countDoubleDigitBasho,
  countWinningBasho,
  findBestBashoEntry,
  getYushoEntries,
} from '@/utils/careerProgression';
import type { CareerSummary, RankProgressionItem, TimelineItem } from '@/pages/rikishi/types';

type Props = {
  shikona: string;
  rikishiId: string;
  timeline: TimelineItem[];
  rankProgression: RankProgressionItem[];
  highestRank: CareerSummary['highestRank'];
};

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  variant = 'zinc',
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'zinc' | 'amber' | 'green' | 'blue';
}) {
  const tone =
    variant === 'amber'
      ? 'border-amber-700/30 bg-amber-950/15'
      : variant === 'green'
        ? 'border-emerald-700/30 bg-emerald-950/15'
        : variant === 'blue'
          ? 'border-blue-700/30 bg-blue-950/15'
          : 'border-white/[0.06] bg-white/[0.02]';

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-3 font-display text-2xl font-bold tracking-tight text-white">{value}</div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{detail}</p>
    </div>
  );
}

function TrailCard({
  label,
  title,
  detail,
  to,
  variant = 'zinc',
}: {
  label: string;
  title: string;
  detail: string;
  to?: string;
  variant?: 'zinc' | 'amber' | 'green' | 'blue';
}) {
  const tone =
    variant === 'amber'
      ? 'border-amber-700/30 bg-amber-950/15'
      : variant === 'green'
        ? 'border-emerald-700/30 bg-emerald-950/15'
        : variant === 'blue'
          ? 'border-blue-700/30 bg-blue-950/15'
          : 'border-white/[0.06] bg-white/[0.02]';

  const body = (
    <div className={`rounded-xl border p-4 transition-colors hover:border-red-600/35 ${tone}`}>
      <PremiumBadge variant={variant}>{label}</PremiumBadge>
      <div className="mt-3 font-semibold text-white">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{detail}</p>
      {to ? (
        <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-red-300">
          Open basho
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      ) : null}
    </div>
  );

  if (!to) return body;

  return (
    <Link to={to} className="block">
      {body}
    </Link>
  );
}

export default function RecordsMilestonesPanel({
  shikona,
  rikishiId,
  timeline,
  rankProgression,
  highestRank,
}: Props) {
  const yushoEntries = useMemo(() => getYushoEntries(rankProgression), [rankProgression]);
  const bestBasho = useMemo(() => findBestBashoEntry(rankProgression), [rankProgression]);
  const streaks = useMemo(() => computeProgressionStreaks(rankProgression), [rankProgression]);
  const winningBashoCount = useMemo(() => countWinningBasho(rankProgression), [rankProgression]);
  const doubleDigitBashoCount = useMemo(() => countDoubleDigitBasho(rankProgression), [rankProgression]);
  const distinctBashoCount = useMemo(() => new Set(timeline.map((item) => item.bashoId)).size, [timeline]);

  const titleMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of yushoEntries) {
      counts.set(row.division, (counts.get(row.division) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [yushoEntries]);

  const latestYusho = yushoEntries.at(-1) ?? null;

  const trailCards = useMemo(() => {
    const cards: Array<{
      key: string;
      label: string;
      title: string;
      detail: string;
      to?: string;
      variant?: 'zinc' | 'amber' | 'green' | 'blue';
    }> = [];

    if (bestBasho) {
      cards.push({
        key: `best-${bestBasho.bashoId}-${bestBasho.division}`,
        label: 'Best basho',
        title: `${bestBasho.wins}-${bestBasho.losses} from ${bestBasho.rank}`,
        detail: `${divisionLabel(bestBasho.division)} in ${bashoLabel(bestBasho.bashoId)}.`,
        to: `/basho/${encodeURIComponent(bestBasho.bashoId)}/${encodeURIComponent(bestBasho.division)}`,
        variant: 'green',
      });
    }

    cards.push({
      key: `peak-${highestRank.bashoId}-${highestRank.division}`,
      label: 'Peak rank',
      title: `${highestRank.rank} in ${divisionLabel(highestRank.division)}`,
      detail: `Highest published rank marker at ${bashoLabel(highestRank.bashoId)}.`,
      to: `/basho/${encodeURIComponent(highestRank.bashoId)}/${encodeURIComponent(highestRank.division)}`,
      variant: 'amber',
    });

    if (latestYusho) {
      cards.push({
        key: `yusho-${latestYusho.bashoId}-${latestYusho.division}`,
        label: 'Latest yusho',
        title: `${divisionLabel(latestYusho.division)} ${latestYusho.rank}`,
        detail: `Championship marker at ${bashoLabel(latestYusho.bashoId)} with a ${latestYusho.wins}-${latestYusho.losses} record.`,
        to: `/basho/${encodeURIComponent(latestYusho.bashoId)}/${encodeURIComponent(latestYusho.division)}`,
        variant: 'amber',
      });
    }

    if (streaks.longestWin) {
      cards.push({
        key: `streak-${streaks.longestWin.startBasho}-${streaks.longestWin.endBasho}`,
        label: 'Longest win streak',
        title: `${streaks.longestWin.length} straight winning basho`,
        detail: `${bashoLabel(streaks.longestWin.startBasho)} → ${bashoLabel(streaks.longestWin.endBasho)}.`,
        variant: 'blue',
      });
    }

    return cards.slice(0, 4);
  }, [bestBasho, highestRank, latestYusho, streaks.longestWin]);

  return (
    <div className="space-y-6">
      <PremiumSectionShell
        title="Records & milestones"
        subtitle={`This section only uses achievement signals the current rikishi feed actually publishes for ${shikona}: championship markers, basho records, streaks, and rank milestones.`}
        trailing={(
          <div className="flex gap-2">
            <Link
              to="/analytics"
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              Analytics
            </Link>
            <Link
              to="/leaderboard"
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              Leaderboard
            </Link>
          </div>
        )}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Championship markers"
            value={String(yushoEntries.length)}
            detail={latestYusho
              ? `Latest published yusho marker: ${bashoLabel(latestYusho.bashoId)}.`
              : 'No yusho marker is published in the current progression feed.'}
            icon={Trophy}
            variant="amber"
          />
          <SummaryCard
            label="Winning basho"
            value={String(winningBashoCount)}
            detail={`${winningBashoCount} kachi-koshi or yusho-marked basho out of ${distinctBashoCount} published appearances.`}
            icon={Medal}
            variant="green"
          />
          <SummaryCard
            label="10+ win basho"
            value={String(doubleDigitBashoCount)}
            detail={doubleDigitBashoCount > 0
              ? 'High-win tournaments help separate a solid career from a truly notable peak.'
              : 'No double-digit basho are published in the current progression feed.'}
            icon={Sparkles}
            variant="blue"
          />
          <SummaryCard
            label="Longest win streak"
            value={streaks.longestWin ? `${streaks.longestWin.length}` : '0'}
            detail={streaks.longestWin
              ? `${bashoLabel(streaks.longestWin.startBasho)} → ${bashoLabel(streaks.longestWin.endBasho)}.`
              : 'No multi-basho winning streak is published in the current progression feed.'}
            icon={Flame}
          />
        </div>

        <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <PremiumBadge variant={titleMix.length > 0 ? 'amber' : 'zinc'}>
              {titleMix.length > 0 ? 'Championship mix' : 'Achievement coverage note'}
            </PremiumBadge>
            {titleMix.map(([division, count]) => (
              <PremiumBadge key={division} variant={division === 'makuuchi' ? 'red' : division === 'juryo' ? 'blue' : 'amber'}>
                {divisionLabel(division)} {count}
              </PremiumBadge>
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Jun-yusho and special-prize counts are not part of the current routeable rikishi profile API, so this records view does not fabricate them. When those signals exist elsewhere, use the linked leaderboard or basho surfaces as corroborating browse paths rather than treating them as part of this canonical profile feed.
          </p>
        </div>
      </PremiumSectionShell>

      <PremiumSectionShell
        title="Achievement trail"
        subtitle="These are the most useful record and milestone entries to open next when you want the basho behind the headline."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {trailCards.map((card) => (
            <TrailCard
              key={card.key}
              label={card.label}
              title={card.title}
              detail={card.detail}
              to={card.to}
              variant={card.variant}
            />
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-500">
          <Link
            to={`/rikishi/${encodeURIComponent(rikishiId)}#career`}
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Back to career ledger
          </Link>
          <Link
            to="/timeline"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Global basho timeline
          </Link>
          <Link
            to="/analytics/eras"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Era analytics
          </Link>
          <Link
            to={`/basho/${encodeURIComponent(highestRank.bashoId)}/${encodeURIComponent(highestRank.division)}`}
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Peak-rank basho
          </Link>
        </div>
      </PremiumSectionShell>
    </div>
  );
}
