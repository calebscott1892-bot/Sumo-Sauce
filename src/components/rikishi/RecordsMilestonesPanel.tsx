<<<<<<< HEAD
import { useMemo, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Layers3, Medal, Sparkles, Star, Trophy } from 'lucide-react';
=======
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Medal, Sparkles, Trophy } from 'lucide-react';
>>>>>>> origin/main
import { PremiumBadge, PremiumSectionShell } from '@/components/ui/premium';
import { bashoLabel, divisionLabel } from '@/utils/basho';
import {
  computeProgressionStreaks,
  countDoubleDigitBasho,
  countWinningBasho,
  findBestBashoEntry,
<<<<<<< HEAD
  findFirstDivisionEntry,
  getYushoEntries,
} from '@/utils/careerProgression';
import {
  findBestNonYushoEntry,
  findFirstSekitoriEntry,
  getDivisionChampionshipSummaries,
  summarizeLegacyAchievements,
  type LegacyBashoRecord,
} from '@/utils/recordsMilestones';
=======
  getYushoEntries,
} from '@/utils/careerProgression';
>>>>>>> origin/main
import type { CareerSummary, RankProgressionItem, TimelineItem } from '@/pages/rikishi/types';

type Props = {
  shikona: string;
  rikishiId: string;
  timeline: TimelineItem[];
  rankProgression: RankProgressionItem[];
  highestRank: CareerSummary['highestRank'];
<<<<<<< HEAD
  legacyRecords?: LegacyBashoRecord[];
  legacyRecordsLoading?: boolean;
};

type Variant = 'zinc' | 'amber' | 'green' | 'blue' | 'red';

function toneClasses(variant: Variant): string {
  if (variant === 'amber') return 'border-amber-700/30 bg-amber-950/15';
  if (variant === 'green') return 'border-emerald-700/30 bg-emerald-950/15';
  if (variant === 'blue') return 'border-blue-700/30 bg-blue-950/15';
  if (variant === 'red') return 'border-red-700/30 bg-red-950/15';
  return 'border-white/[0.06] bg-white/[0.02]';
}

function divisionVariant(division: string): Variant {
  if (division === 'makuuchi') return 'red';
  if (division === 'juryo') return 'blue';
  if (division === 'makushita') return 'amber';
  return 'zinc';
}

=======
};

>>>>>>> origin/main
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
<<<<<<< HEAD
  icon: ComponentType<{ className?: string }>;
  variant?: Variant;
}) {
  return (
    <div className={`rounded-xl border p-4 ${toneClasses(variant)}`}>
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD
  variant?: Variant;
}) {
  const body = (
    <div className={`rounded-xl border p-4 transition-colors hover:border-red-600/35 ${toneClasses(variant)}`}>
=======
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
>>>>>>> origin/main
      <PremiumBadge variant={variant}>{label}</PremiumBadge>
      <div className="mt-3 font-semibold text-white">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{detail}</p>
      {to ? (
        <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-red-300">
<<<<<<< HEAD
          Open context
=======
          Open basho
>>>>>>> origin/main
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

<<<<<<< HEAD
function BrowseChip({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
    >
      {children}
    </Link>
  );
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

=======
>>>>>>> origin/main
export default function RecordsMilestonesPanel({
  shikona,
  rikishiId,
  timeline,
  rankProgression,
  highestRank,
<<<<<<< HEAD
  legacyRecords = [],
  legacyRecordsLoading = false,
}: Props) {
  const yushoEntries = useMemo(() => getYushoEntries(rankProgression), [rankProgression]);
  const latestYusho = yushoEntries.at(-1) ?? null;
  const bestBasho = useMemo(() => findBestBashoEntry(rankProgression), [rankProgression]);
  const bestNonYusho = useMemo(() => findBestNonYushoEntry(rankProgression), [rankProgression]);
=======
}: Props) {
  const yushoEntries = useMemo(() => getYushoEntries(rankProgression), [rankProgression]);
  const bestBasho = useMemo(() => findBestBashoEntry(rankProgression), [rankProgression]);
>>>>>>> origin/main
  const streaks = useMemo(() => computeProgressionStreaks(rankProgression), [rankProgression]);
  const winningBashoCount = useMemo(() => countWinningBasho(rankProgression), [rankProgression]);
  const doubleDigitBashoCount = useMemo(() => countDoubleDigitBasho(rankProgression), [rankProgression]);
  const distinctBashoCount = useMemo(() => new Set(timeline.map((item) => item.bashoId)).size, [timeline]);
<<<<<<< HEAD
  const divisionChampionships = useMemo(() => getDivisionChampionshipSummaries(rankProgression), [rankProgression]);
  const sekitoriDebut = useMemo(() => findFirstSekitoriEntry(timeline), [timeline]);
  const makuuchiDebut = useMemo(() => findFirstDivisionEntry(timeline, 'makuuchi'), [timeline]);
  const legacySummary = useMemo(() => summarizeLegacyAchievements(legacyRecords), [legacyRecords]);

  const routeableSummary = useMemo(() => {
    const parts: string[] = [];

    if (yushoEntries.length > 0) {
      parts.push(`${pluralize(yushoEntries.length, 'published division yusho marker')}`);
      if (divisionChampionships.length > 0) {
        parts.push(`spread across ${pluralize(divisionChampionships.length, 'division')}`);
      }
    } else {
      parts.push('no published division yusho marker');
    }

    parts.push(`peak rank ${highestRank.rank} in ${divisionLabel(highestRank.division)}`);

    if (streaks.longestWin) {
      parts.push(`a longest winning run of ${pluralize(streaks.longestWin.length, 'basho')}`);
    }

    if (doubleDigitBashoCount > 0) {
      parts.push(`${pluralize(doubleDigitBashoCount, 'double-digit win basho')}`);
    }

    return parts.join(', ');
  }, [divisionChampionships.length, doubleDigitBashoCount, highestRank.division, highestRank.rank, streaks.longestWin, yushoEntries.length]);

  const importedSummary = useMemo(() => {
    if (legacyRecordsLoading) {
      return 'Imported achievement rows are loading for this rikishi.';
    }

    if (!legacySummary) {
      return 'No imported achievement rows are currently published for this rikishi, so top-division yusho and special-prize totals stay blank here instead of being guessed.';
    }

    const parts: string[] = [];
    if (legacySummary.topDivisionYushoCount !== null) {
      parts.push(`${legacySummary.topDivisionYushoCount} top-division yusho`);
    }
    if (legacySummary.specialPrizeCount !== null) {
      parts.push(`${legacySummary.specialPrizeCount} special prizes`);
    }

    if (parts.length === 0) {
      return `Imported achievement rows are available${legacySummary.latestSnapshotDate ? ` through ${legacySummary.latestSnapshotDate}` : ''}, but they do not publish top-division yusho or special-prize totals for this rikishi.`;
    }

    const scope = legacySummary.latestSnapshotDate ? ` as of the ${legacySummary.latestSnapshotDate} imported snapshot` : ' in the imported entity layer';
    return `Imported achievement rows also credit ${parts.join(' and ')}${scope}. Jun-yusho totals are not part of the current routeable profile feed, so this page does not fabricate them.`;
  }, [legacyRecordsLoading, legacySummary]);
=======

  const titleMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of yushoEntries) {
      counts.set(row.division, (counts.get(row.division) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [yushoEntries]);

  const latestYusho = yushoEntries.at(-1) ?? null;
>>>>>>> origin/main

  const trailCards = useMemo(() => {
    const cards: Array<{
      key: string;
      label: string;
      title: string;
      detail: string;
      to?: string;
<<<<<<< HEAD
      variant?: Variant;
    }> = [];

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
        key: `latest-yusho-${latestYusho.bashoId}-${latestYusho.division}`,
        label: 'Latest yusho',
        title: `${divisionLabel(latestYusho.division)} ${latestYusho.rank}`,
        detail: `Championship marker at ${bashoLabel(latestYusho.bashoId)} with a ${latestYusho.wins}-${latestYusho.losses} record.`,
        to: `/basho/${encodeURIComponent(latestYusho.bashoId)}/${encodeURIComponent(latestYusho.division)}`,
        variant: 'red',
      });
    }

=======
      variant?: 'zinc' | 'amber' | 'green' | 'blue';
    }> = [];

>>>>>>> origin/main
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

<<<<<<< HEAD
    if (bestNonYusho) {
      cards.push({
        key: `best-non-yusho-${bestNonYusho.bashoId}-${bestNonYusho.division}`,
        label: 'Best non-title finish',
        title: `${bestNonYusho.wins}-${bestNonYusho.losses} from ${bestNonYusho.rank}`,
        detail: `Strongest published non-yusho basho in ${divisionLabel(bestNonYusho.division)} at ${bashoLabel(bestNonYusho.bashoId)}.`,
        to: `/basho/${encodeURIComponent(bestNonYusho.bashoId)}/${encodeURIComponent(bestNonYusho.division)}`,
=======
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
>>>>>>> origin/main
        variant: 'blue',
      });
    }

<<<<<<< HEAD
    if (sekitoriDebut) {
      cards.push({
        key: `sekitori-${sekitoriDebut.bashoId}-${sekitoriDebut.division}`,
        label: 'Sekitori debut',
        title: `${divisionLabel(sekitoriDebut.division)} ${sekitoriDebut.rank}`,
        detail: `First salaried-division appearance at ${bashoLabel(sekitoriDebut.bashoId)}.`,
        to: `/basho/${encodeURIComponent(sekitoriDebut.bashoId)}/${encodeURIComponent(sekitoriDebut.division)}`,
        variant: 'green',
      });
    }

    if (makuuchiDebut) {
      cards.push({
        key: `makuuchi-${makuuchiDebut.bashoId}`,
        label: 'Top-division debut',
        title: `${makuuchiDebut.rank} in Makuuchi`,
        detail: `First top-division appearance at ${bashoLabel(makuuchiDebut.bashoId)}.`,
        to: `/basho/${encodeURIComponent(makuuchiDebut.bashoId)}/makuuchi`,
        variant: 'red',
      });
    }

    return cards.slice(0, 6);
  }, [bestBasho, bestNonYusho, highestRank.bashoId, highestRank.division, highestRank.rank, latestYusho, makuuchiDebut, sekitoriDebut]);
=======
    return cards.slice(0, 4);
  }, [bestBasho, highestRank, latestYusho, streaks.longestWin]);
>>>>>>> origin/main

  return (
    <div className="space-y-6">
      <PremiumSectionShell
<<<<<<< HEAD
        title="Milestone snapshot"
        subtitle={`Use this panel to separate routeable career milestones from imported achievement counts, then jump straight into the basho and analytics surfaces that explain them.`}
        trailing={(
          <div className="flex gap-2">
            <Link
              to="/analytics#championship-trail"
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              Championship trail
            </Link>
            <Link
              to={`/leaderboard?q=${encodeURIComponent(rikishiId)}`}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              Leaderboard slice
=======
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
>>>>>>> origin/main
            </Link>
          </div>
        )}
      >
<<<<<<< HEAD
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <PremiumBadge variant="green">Routeable profile feed</PremiumBadge>
              <PremiumBadge variant={yushoEntries.length > 0 ? 'amber' : 'zinc'}>
                {yushoEntries.length > 0 ? `${yushoEntries.length} title markers` : 'No title markers'}
              </PremiumBadge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{shikona} currently shows {routeableSummary}.</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              These cards are derived from the routeable timeline and rank progression endpoints, so every basho link below lands on the same published profile graph and standings layer.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <PremiumBadge variant={legacySummary ? 'blue' : 'zinc'}>Imported achievement layer</PremiumBadge>
              {legacySummary?.latestSnapshotDate ? (
                <PremiumBadge variant="zinc">{legacySummary.latestSnapshotDate}</PremiumBadge>
              ) : legacyRecordsLoading ? (
                <PremiumBadge variant="zinc">Loading</PremiumBadge>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{importedSummary}</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              This keeps imported top-division yusho and prize counts browseable without pretending that every record lives inside the canonical modern profile API.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Division yusho markers"
            value={String(yushoEntries.length)}
            detail={latestYusho
              ? `Latest published championship marker: ${bashoLabel(latestYusho.bashoId)}.`
              : 'No championship marker is currently published in the routeable progression feed.'}
=======
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Championship markers"
            value={String(yushoEntries.length)}
            detail={latestYusho
              ? `Latest published yusho marker: ${bashoLabel(latestYusho.bashoId)}.`
              : 'No yusho marker is published in the current progression feed.'}
>>>>>>> origin/main
            icon={Trophy}
            variant="amber"
          />
          <SummaryCard
<<<<<<< HEAD
            label="Divisions won"
            value={String(divisionChampionships.length)}
            detail={divisionChampionships.length > 0
              ? divisionChampionships.map((entry) => `${divisionLabel(entry.division)} x${entry.count}`).join(', ')
              : 'No division title mix is published in the current progression feed.'}
            icon={Layers3}
            variant="red"
          />
          <SummaryCard
            label="Top-division yusho"
            value={legacyRecordsLoading ? '...' : legacySummary && legacySummary.topDivisionYushoCount !== null ? String(legacySummary.topDivisionYushoCount) : 'N/A'}
            detail={legacySummary && legacySummary.topDivisionYushoCount !== null
              ? `Imported entity rows publish ${legacySummary.topDivisionYushoCount} top-division yusho for broader achievement context.`
              : 'Imported rows do not publish a top-division yusho total for this rikishi.'}
            icon={Medal}
            variant="amber"
          />
          <SummaryCard
            label="Special prizes"
            value={legacyRecordsLoading ? '...' : legacySummary && legacySummary.specialPrizeCount !== null ? String(legacySummary.specialPrizeCount) : 'N/A'}
            detail={legacySummary && legacySummary.specialPrizeCount !== null
              ? `Imported entity rows publish ${legacySummary.specialPrizeCount} special prizes for this rikishi.`
              : 'Special-prize totals are not published in the current routeable feed for this profile.'}
            icon={Star}
            variant="blue"
=======
            label="Winning basho"
            value={String(winningBashoCount)}
            detail={`${winningBashoCount} kachi-koshi or yusho-marked basho out of ${distinctBashoCount} published appearances.`}
            icon={Medal}
            variant="green"
>>>>>>> origin/main
          />
          <SummaryCard
            label="10+ win basho"
            value={String(doubleDigitBashoCount)}
            detail={doubleDigitBashoCount > 0
<<<<<<< HEAD
              ? `${doubleDigitBashoCount} strong-win tournaments in ${distinctBashoCount} published basho appearances.`
              : 'No double-digit basho are currently published in the routeable progression feed.'}
            icon={Sparkles}
            variant="green"
          />
          <SummaryCard
            label="Longest win streak"
            value={streaks.longestWin ? String(streaks.longestWin.length) : '0'}
            detail={streaks.longestWin
              ? `${bashoLabel(streaks.longestWin.startBasho)} to ${bashoLabel(streaks.longestWin.endBasho)}.`
              : 'No multi-basho winning streak is published in the current progression feed.'}
            icon={Flame}
            variant="zinc"
=======
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
>>>>>>> origin/main
          />
        </div>

        <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
<<<<<<< HEAD
            <PremiumBadge variant="amber">Career achievement summary</PremiumBadge>
            <PremiumBadge variant="zinc">{winningBashoCount} winning basho</PremiumBadge>
            <PremiumBadge variant="zinc">{distinctBashoCount} published basho</PremiumBadge>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            {routeableSummary.charAt(0).toUpperCase() + routeableSummary.slice(1)}.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{importedSummary}</p>
=======
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
>>>>>>> origin/main
        </div>
      </PremiumSectionShell>

      <PremiumSectionShell
<<<<<<< HEAD
        title="Division championship breakdown"
        subtitle="Browse the title mix by division so championships feel explorable, not just collapsed into one number."
      >
        {divisionChampionships.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm leading-relaxed text-zinc-400">
            No division championship markers are currently published for this rikishi in the routeable progression feed.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {divisionChampionships.map((entry) => (
              <Link
                key={`${entry.division}-${entry.latestBashoId}`}
                to={`/basho/${encodeURIComponent(entry.latestBashoId)}/${encodeURIComponent(entry.division)}`}
                className={`rounded-xl border p-4 transition-colors hover:border-red-600/35 ${toneClasses(divisionVariant(entry.division))}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <PremiumBadge variant={divisionVariant(entry.division)}>{divisionLabel(entry.division)}</PremiumBadge>
                  <PremiumBadge variant="zinc">{entry.count} total</PremiumBadge>
                </div>
                <div className="mt-3 font-semibold text-white">{entry.latestRank ? `${entry.latestRank}` : divisionLabel(entry.division)}</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  Latest published title marker came at {bashoLabel(entry.latestBashoId)}.
                </p>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-red-300">
                  Open basho
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </PremiumSectionShell>

      <PremiumSectionShell
        title="Achievement trail"
        subtitle="Open the basho behind the headline: peak rank, championships, major debuts, and the strongest non-title tournaments."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
=======
        title="Achievement trail"
        subtitle="These are the most useful record and milestone entries to open next when you want the basho behind the headline."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
>>>>>>> origin/main
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
<<<<<<< HEAD
      </PremiumSectionShell>

      <PremiumSectionShell
        title="Browse achievement context"
        subtitle="These links connect the wrestler profile, basho pages, leaderboard slice, and analytics views that explain the same records from different angles."
      >
        <div className="flex flex-wrap gap-2">
          <BrowseChip to={`/rikishi/${encodeURIComponent(rikishiId)}#career`}>Career ledger</BrowseChip>
          <BrowseChip to={`/rikishi/${encodeURIComponent(rikishiId)}#ranking`}>Rank milestones</BrowseChip>
          <BrowseChip to="/analytics#championship-trail">Analytics championship trail</BrowseChip>
          <BrowseChip to="/analytics#standout-rikishi">Analytics standout rikishi</BrowseChip>
          <BrowseChip to={`/leaderboard?q=${encodeURIComponent(rikishiId)}`}>Leaderboard search</BrowseChip>
          <BrowseChip to={`/basho/${encodeURIComponent(highestRank.bashoId)}`}>Peak-rank basho overview</BrowseChip>
          <BrowseChip to="/timeline">Basho timeline</BrowseChip>
          <BrowseChip to="/analytics/eras">Era analytics</BrowseChip>
          {latestYusho ? (
            <BrowseChip to={`/basho/${encodeURIComponent(latestYusho.bashoId)}/${encodeURIComponent(latestYusho.division)}`}>
              Latest yusho basho
            </BrowseChip>
          ) : null}
          {legacySummary?.latestBashoId ? (
            <BrowseChip to={`/basho/${encodeURIComponent(legacySummary.latestBashoId)}`}>
              Latest imported basho
            </BrowseChip>
          ) : null}
=======

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
>>>>>>> origin/main
        </div>
      </PremiumSectionShell>
    </div>
  );
}
