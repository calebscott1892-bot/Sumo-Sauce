import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, Flame, Layers3, ShieldCheck, Swords, Trophy, ArrowRight } from 'lucide-react';
import { PremiumBadge } from '@/components/ui/premium';
import {
  getCareerSummary,
  getDivisionStandings,
  getHeadToHead,
  getLegacyBashoRecords,
} from '@/pages/rikishi/api';
import { getAvailableBashoIds } from '@/pages/basho/api';
import { buildRivalryInsight, getRivalryStateVariant } from '@/utils/rivalry';
import { summarizeLegacyAchievements } from '@/utils/recordsMilestones';
import { bashoDisplayName, divisionLabel } from '@/utils/basho';
import { getVerifiedProfileForIdentity } from '@/data/verifiedProfiles';
import { stableSlug } from '@/utils/rosterBrowsing';

function sortStandings(rows) {
  return [...(rows || [])].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.rank.localeCompare(b.rank));
}

function detectChampion(rows) {
  const sorted = sortStandings(rows);
  return sorted[0] ?? null;
}

function buildCurrentRivalryPairs(rows) {
  const top = sortStandings(rows).slice(0, 4);
  const pairs = [];

  for (let i = 0; i < top.length; i += 1) {
    for (let j = i + 1; j < top.length; j += 1) {
      pairs.push([top[i], top[j]]);
    }
  }

  return pairs;
}

function pickFeaturedRivalry(entries) {
  const filtered = (entries || []).filter((entry) => entry && entry.totalMatches > 0);
  if (!filtered.length) return null;

  const withVolume = filtered.filter((entry) => entry.totalMatches >= 3);
  const pool = withVolume.length ? withVolume : filtered;

  return [...pool].sort((a, b) => {
    const matchDelta = b.totalMatches - a.totalMatches;
    if (matchDelta !== 0) return matchDelta;

    const closenessDelta = b.closeness - a.closeness;
    if (closenessDelta !== 0) return closenessDelta;

    return `${a.rikishiA}-${a.rikishiB}`.localeCompare(`${b.rikishiA}-${b.rikishiB}`);
  })[0] ?? null;
}

function ActionChip({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
    >
      {children}
    </Link>
  );
}

function EditorialCard({
  eyebrow,
  title,
  summary,
  why,
  lookFirst,
  goNext,
  actions,
  badges = [],
  tone = 'zinc',
  icon: Icon,
}) {
  const toneClasses = {
    red: 'border-red-700/25 bg-red-950/12',
    amber: 'border-amber-700/25 bg-amber-950/12',
    blue: 'border-blue-700/25 bg-blue-950/12',
    green: 'border-emerald-700/25 bg-emerald-950/12',
    zinc: 'border-white/[0.06] bg-white/[0.02]',
  };

  return (
    <article className={`rounded-[24px] border p-4 shadow-[0_16px_40px_rgba(0,0,0,0.14)] sm:p-5 ${toneClasses[tone] ?? toneClasses.zinc}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/20">
              <Icon className="h-4.5 w-4.5 text-zinc-200" />
            </div>
            <PremiumBadge variant={tone === 'green' ? 'green' : tone === 'blue' ? 'blue' : tone === 'amber' ? 'amber' : tone === 'red' ? 'red' : 'zinc'}>
              {eyebrow}
            </PremiumBadge>
            {badges.map((badge) => (
              <PremiumBadge key={`${badge.label}-${badge.variant}`} variant={badge.variant}>
                {badge.label}
              </PremiumBadge>
            ))}
          </div>
          <h3 className="mt-4 font-display text-[1.55rem] font-bold tracking-tight text-white sm:text-[1.7rem]">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">{summary}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {[
          { label: 'Why now', value: why },
          { label: 'Open', value: lookFirst },
          { label: 'Next', value: goNext },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-black/20 px-3.5 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{item.label}</div>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => (
          <ActionChip key={action.to} to={action.to}>
            {action.label}
          </ActionChip>
        ))}
      </div>
    </article>
  );
}

function LoadingCard() {
  return <div className="h-64 animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.02]" />;
}

export default function FeaturedEditorialRail() {
  const availableQuery = useQuery({
    queryKey: ['available-basho-ids'],
    queryFn: () => getAvailableBashoIds(5),
    staleTime: 10 * 60 * 1000,
  });
  const recentIds = availableQuery.data ?? [];

  const editorialQuery = useQuery({
    queryKey: ['home-editorial-snapshots', recentIds.join(',')],
    staleTime: 10 * 60 * 1000,
    enabled: recentIds.length > 0,
    queryFn: async () => {
      const snapshots = await Promise.all(
        recentIds.map(async (bashoId) => {
          const [makuuchi, juryo] = await Promise.all([
            getDivisionStandings(bashoId, 'makuuchi').catch(() => []),
            getDivisionStandings(bashoId, 'juryo').catch(() => []),
          ]);

          return {
            bashoId,
            makuuchi,
            juryo,
          };
        }),
      );

      const currentSnapshot = snapshots.find((snapshot) => snapshot.makuuchi.length > 0 || snapshot.juryo.length > 0) ?? null;

      const championCounts = new Map();
      for (const snapshot of snapshots) {
        const champion = detectChampion(snapshot.makuuchi);
        if (!champion) continue;

        const existing = championCounts.get(champion.rikishiId) ?? {
          rikishiId: champion.rikishiId,
          shikona: champion.shikona,
          titles: 0,
          latestBashoId: snapshot.bashoId,
        };

        existing.titles += 1;
        if (!existing.latestBashoId || snapshot.bashoId > existing.latestBashoId) {
          existing.latestBashoId = snapshot.bashoId;
        }

        championCounts.set(champion.rikishiId, existing);
      }

      const sampleTitleLeader = [...championCounts.values()]
        .sort((a, b) => b.titles - a.titles || b.latestBashoId.localeCompare(a.latestBashoId) || a.shikona.localeCompare(b.shikona))[0] ?? null;

      return {
        snapshots,
        currentSnapshot,
        sampleTitleLeader,
      };
    },
  });

  const currentSnapshot = editorialQuery.data?.currentSnapshot ?? null;
  const currentBashoId = currentSnapshot?.bashoId ?? null;
  const currentMakuuchiRows = currentSnapshot?.makuuchi ?? [];
  const currentJuryoRows = currentSnapshot?.juryo ?? [];
  const currentLeader = useMemo(() => detectChampion(currentMakuuchiRows), [currentMakuuchiRows]);
  const currentChaser = useMemo(() => sortStandings(currentMakuuchiRows)[1] ?? null, [currentMakuuchiRows]);
  const currentJuryoLeader = useMemo(() => detectChampion(currentJuryoRows), [currentJuryoRows]);
  const sampleTitleLeader = editorialQuery.data?.sampleTitleLeader ?? null;
  const featuredWrestlerId = currentLeader?.rikishiId ?? sampleTitleLeader?.rikishiId ?? null;

  const featuredSummaryQuery = useQuery({
    queryKey: ['home-featured-rikishi-summary', featuredWrestlerId],
    queryFn: () => getCareerSummary(featuredWrestlerId),
    enabled: Boolean(featuredWrestlerId),
    staleTime: 10 * 60 * 1000,
  });

  const featuredLegacyQuery = useQuery({
    queryKey: ['home-featured-rikishi-legacy', featuredWrestlerId],
    queryFn: () => getLegacyBashoRecords(featuredWrestlerId),
    enabled: Boolean(featuredWrestlerId),
    staleTime: 10 * 60 * 1000,
  });

  const rivalryCandidates = useMemo(() => buildCurrentRivalryPairs(currentMakuuchiRows), [currentMakuuchiRows]);

  const featuredRivalryQuery = useQuery({
    queryKey: [
      'home-featured-rivalry',
      currentBashoId ?? 'none',
      rivalryCandidates.map(([a, b]) => `${a.rikishiId}:${b.rikishiId}`).join(','),
    ],
    enabled: rivalryCandidates.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const entries = await Promise.all(
        rivalryCandidates.map(async ([a, b]) => {
          const h2h = await getHeadToHead(a.rikishiId, b.rikishiId).catch(() => null);
          if (!h2h || h2h.totalMatches <= 0) return null;

          return {
            rikishiA: a.rikishiId,
            shikonaA: a.shikona,
            rikishiB: b.rikishiId,
            shikonaB: b.shikona,
            totalMatches: h2h.totalMatches,
            aWins: h2h.rikishiAWins,
            bWins: h2h.rikishiBWins,
            closeness: h2h.totalMatches > 0 ? 1 - Math.abs(h2h.rikishiAWins - h2h.rikishiBWins) / h2h.totalMatches : 0,
          };
        }),
      );

      return pickFeaturedRivalry(entries);
    },
  });

  const featuredSummary = featuredSummaryQuery.data ?? null;
  const featuredLegacySummary = useMemo(
    () => summarizeLegacyAchievements(featuredLegacyQuery.data ?? []),
    [featuredLegacyQuery.data],
  );
  const featuredProfile = useMemo(() => {
    if (!featuredSummary) return null;
    return getVerifiedProfileForIdentity(featuredSummary.rikishiId, featuredSummary.shikona);
  }, [featuredSummary]);
  const featuredRivalry = featuredRivalryQuery.data ?? null;
  const featuredRivalryInsight = useMemo(() => {
    if (!featuredRivalry) return null;
    return buildRivalryInsight({
      winsA: featuredRivalry.aWins,
      winsB: featuredRivalry.bWins,
      totalMatches: featuredRivalry.totalMatches,
      labelA: featuredRivalry.shikonaA,
      labelB: featuredRivalry.shikonaB,
    });
  }, [featuredRivalry]);

  const stablePath = featuredSummary?.heya ? `/stables/${encodeURIComponent(stableSlug(featuredSummary.heya))}` : null;
  const featuredRecordsPath = featuredSummary ? `/rikishi/${encodeURIComponent(featuredSummary.rikishiId)}#records` : null;

  if (editorialQuery.isLoading && !currentSnapshot) {
    return (
      <section aria-label="Worth exploring now">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <LoadingCard />
          <LoadingCard />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          <LoadingCard />
          <LoadingCard />
        </div>
      </section>
    );
  }

  const currentTitle = currentBashoId ? `Start with ${bashoDisplayName(currentBashoId)}` : 'Start with the latest basho';
  const currentSummary = currentLeader
    ? `${currentLeader.shikona} leads the latest visible Makuuchi snapshot at ${currentLeader.wins}-${currentLeader.losses}${currentChaser ? `, with ${currentChaser.shikona} next at ${currentChaser.wins}-${currentChaser.losses}.` : '.'}`
    : currentJuryoLeader
      ? `The latest visible Juryo snapshot shows ${currentJuryoLeader.shikona} at ${currentJuryoLeader.wins}-${currentJuryoLeader.losses}.`
      : 'Start with the latest basho overview, then branch into the division that matters.';

  const currentActions = [
    currentBashoId ? { label: 'Open basho overview', to: `/basho/${encodeURIComponent(currentBashoId)}` } : { label: 'Open basho browser', to: '/basho' },
    currentBashoId ? { label: 'Open Makuuchi', to: `/basho/${encodeURIComponent(currentBashoId)}/makuuchi` } : { label: 'Browse basho', to: '/basho' },
    currentBashoId && currentJuryoRows.length > 0 ? { label: 'Open Juryo', to: `/basho/${encodeURIComponent(currentBashoId)}/juryo` } : { label: 'Analytics trail', to: '/analytics#championship-trail' },
  ];

  const wrestlerTitle = featuredSummary?.shikona ?? currentLeader?.shikona ?? sampleTitleLeader?.shikona ?? 'Featured rikishi';
  const wrestlerSummary = featuredSummary
    ? `${featuredSummary.heya ? `${featuredSummary.heya} stable. ` : ''}Peak published rank ${featuredSummary.highestRank.rank} in ${divisionLabel(featuredSummary.highestRank.division)}.${currentLeader && featuredSummary.rikishiId === currentLeader.rikishiId ? ' He is also the clearest current Makuuchi profile to open next.' : ''}`
    : currentLeader
      ? `${currentLeader.shikona} is the clearest current-profile entry point from the latest Makuuchi snapshot.`
      : 'Open a rikishi page for the cleanest mix of profile, rivalry, and records context.';

  const wrestlerWhy = currentLeader && featuredSummary?.rikishiId === currentLeader.rikishiId
    ? 'Tournament relevance first, then records, ranking history, and rivalry links.'
    : 'A strong front-door profile with fast paths into records, rank context, and heya browsing.';

  const wrestlerLookFirst = featuredSummary
    ? 'Open records first, then jump to ranking.'
    : 'Open the profile summary, then follow records or rivalry links.';

  const wrestlerGoNext = stablePath
    ? 'Then open the stable page for roster depth.'
    : 'Then use rivalry or basho links to keep the same wrestler in context.';

  const wrestlerBadges = [];
  if (currentLeader && featuredSummary?.rikishiId === currentLeader.rikishiId) {
    wrestlerBadges.push({ label: 'Current leader', variant: 'red' });
  }
  if (featuredProfile?.profileConfidence === 'verified') {
    wrestlerBadges.push({ label: 'Verified profile', variant: 'green' });
  }
  if (featuredSummary?.highestRank?.division) {
    wrestlerBadges.push({ label: `Peak ${divisionLabel(featuredSummary.highestRank.division)}`, variant: 'zinc' });
  }

  const wrestlerActions = [
    featuredSummary ? { label: 'Open profile', to: `/rikishi/${encodeURIComponent(featuredSummary.rikishiId)}` } : { label: 'Browse rikishi', to: '/rikishi' },
    featuredRecordsPath ? { label: 'Open records', to: featuredRecordsPath } : { label: 'Browse records', to: '/analytics#championship-trail' },
  ];
  if (stablePath) {
    wrestlerActions.push({ label: 'Open stable', to: stablePath });
  }

  const rivalryTitle = featuredRivalry ? `${featuredRivalry.shikonaA} vs ${featuredRivalry.shikonaB}` : 'Featured rivalry entry point';
  const rivalrySummary = featuredRivalry && featuredRivalryInsight
    ? `${featuredRivalryInsight.detail}${currentBashoId ? ` This pair also sits inside the latest Makuuchi mix from ${bashoDisplayName(currentBashoId)}.` : ''}`
    : 'When one profile is not enough, the compare surface is the cleanest next step.';

  const rivalryWhy = featuredRivalry
    ? 'It turns a current homepage signal into an actual pair-level story.'
    : 'The rivalry explorer is the best pair-first browse surface in the product.';

  const rivalryLookFirst = featuredRivalry
    ? 'Start with the comparison overview and recent form.'
    : 'Start with the featured rivalry cards, then open one comparison page.';

  const rivalryGoNext = currentBashoId
    ? 'Then jump back to the current division page for standings context.'
    : 'Then widen out into the explorer or the wrestler records panels.';

  const rivalryBadges = [];
  if (featuredRivalryInsight) {
    rivalryBadges.push({ label: featuredRivalryInsight.label, variant: getRivalryStateVariant(featuredRivalryInsight.state) });
  }
  if (featuredRivalry?.totalMatches) {
    rivalryBadges.push({ label: `${featuredRivalry.totalMatches} bouts`, variant: 'zinc' });
  }

  const rivalryActions = [
    featuredRivalry
      ? { label: 'Open comparison', to: `/compare/${encodeURIComponent(featuredRivalry.rikishiA)}/${encodeURIComponent(featuredRivalry.rikishiB)}` }
      : { label: 'Open rivalry explorer', to: '/rivalries' },
    { label: 'Browse rivalries', to: '/rivalries' },
  ];
  if (currentBashoId) {
    rivalryActions.push({ label: 'Current Makuuchi', to: `/basho/${encodeURIComponent(currentBashoId)}/makuuchi` });
  }

  const milestoneUsesImported = featuredLegacySummary && (
    (featuredLegacySummary.topDivisionYushoCount ?? 0) > 0 ||
    (featuredLegacySummary.specialPrizeCount ?? 0) > 0
  );

  const milestoneTitle = milestoneUsesImported && featuredSummary
    ? `${featuredSummary.shikona}'s record layer`
    : sampleTitleLeader
      ? `${sampleTitleLeader.shikona} leads the recent title sample`
      : 'Records and milestones worth opening';

  const milestoneSummary = milestoneUsesImported && featuredSummary
    ? `${featuredSummary.shikona} carries ${featuredLegacySummary.topDivisionYushoCount ?? 0} imported top-division yusho${featuredLegacySummary.specialPrizeCount ? ` and ${featuredLegacySummary.specialPrizeCount} imported special prizes` : ''}. That context now sits beside the routeable milestone view instead of hiding in metadata.`
    : sampleTitleLeader
      ? `${sampleTitleLeader.shikona} appears as champion ${sampleTitleLeader.titles} time${sampleTitleLeader.titles === 1 ? '' : 's'} in the recent visible sample. This is a sample signal, not an all-career title table.`
      : 'The records layer works best when you move between wrestler pages, the championship trail, and leaderboard slices.';

  const milestoneWhy = milestoneUsesImported
    ? 'Routeable milestones stay separate from imported totals, but both are now easy to browse.'
    : sampleTitleLeader
      ? 'A fast milestone entry point that branches into analytics and a wrestler page immediately.'
      : 'Records are now browseable enough to act as a real homepage entry point.';

  const milestoneLookFirst = milestoneUsesImported
    ? 'Open the wrestler records section first.'
    : sampleTitleLeader
      ? 'Open the wrestler records section, then use the championship trail.'
      : 'Start with the championship trail or a records panel.';

  const milestoneGoNext = milestoneUsesImported
    ? 'Then use leaderboard or analytics for broader context.'
    : sampleTitleLeader
      ? 'Then use the analytics trail or the latest sampled basho.'
      : 'Then move into analytics or the leaderboard.';

  const milestoneBadges = [];
  if (milestoneUsesImported && featuredLegacySummary?.topDivisionYushoCount !== null) {
    milestoneBadges.push({ label: `${featuredLegacySummary.topDivisionYushoCount} top-division yusho`, variant: 'amber' });
  }
  if (milestoneUsesImported && featuredLegacySummary?.specialPrizeCount) {
    milestoneBadges.push({ label: `${featuredLegacySummary.specialPrizeCount} special prizes`, variant: 'blue' });
  }
  if (!milestoneUsesImported && sampleTitleLeader?.titles) {
    milestoneBadges.push({ label: `${sampleTitleLeader.titles} sampled titles`, variant: 'amber' });
  }

  const milestoneActions = [];
  if (featuredRecordsPath) {
    milestoneActions.push({ label: 'Open records', to: featuredRecordsPath });
  } else if (sampleTitleLeader) {
    milestoneActions.push({ label: 'Open records', to: `/rikishi/${encodeURIComponent(sampleTitleLeader.rikishiId)}#records` });
  } else {
    milestoneActions.push({ label: 'Open analytics trail', to: '/analytics#championship-trail' });
  }
  if (featuredSummary) {
    milestoneActions.push({ label: 'Leaderboard slice', to: `/leaderboard?q=${encodeURIComponent(featuredSummary.rikishiId)}` });
  } else if (sampleTitleLeader) {
    milestoneActions.push({ label: 'Leaderboard slice', to: `/leaderboard?q=${encodeURIComponent(sampleTitleLeader.rikishiId)}` });
  }
  milestoneActions.push({ label: 'Analytics trail', to: '/analytics#championship-trail' });

  return (
    <section aria-label="Worth exploring now">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
        <div className="max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400">WORTH EXPLORING NOW</div>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Four fast places to start
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Editorial picks grounded in published standings, rivalry data, and the current records layer.
          </p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <EditorialCard
            eyebrow="Current now"
            icon={Calendar}
            tone="red"
            title={currentTitle}
            summary={currentSummary}
            why="The fastest database-first path into something current without pretending this is live coverage."
            lookFirst="Open the overview, then Makuuchi."
            goNext={featuredRivalry
              ? 'Then open the featured rivalry for head-to-head context.'
              : 'Then open the featured wrestler or championship trail.'}
            badges={[
              currentBashoId ? { label: bashoDisplayName(currentBashoId), variant: 'zinc' } : null,
              currentLeader ? { label: `${currentLeader.wins}-${currentLeader.losses}`, variant: 'amber' } : null,
              currentJuryoLeader ? { label: `Juryo: ${currentJuryoLeader.shikona}`, variant: 'blue' } : null,
            ].filter(Boolean)}
            actions={currentActions}
          />

          <EditorialCard
            eyebrow="Featured wrestler"
            icon={featuredProfile?.profileConfidence === 'verified' ? ShieldCheck : Flame}
            tone="amber"
            title={wrestlerTitle}
            summary={wrestlerSummary}
            why={wrestlerWhy}
            lookFirst={wrestlerLookFirst}
            goNext={wrestlerGoNext}
            badges={wrestlerBadges}
            actions={wrestlerActions}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EditorialCard
            eyebrow="Featured rivalry"
            icon={Swords}
            tone="blue"
            title={rivalryTitle}
            summary={rivalrySummary}
            why={rivalryWhy}
            lookFirst={rivalryLookFirst}
            goNext={rivalryGoNext}
            badges={rivalryBadges}
            actions={rivalryActions}
          />

          <EditorialCard
            eyebrow="Featured milestone"
            icon={milestoneUsesImported ? Layers3 : Trophy}
            tone="green"
            title={milestoneTitle}
            summary={milestoneSummary}
            why={milestoneWhy}
            lookFirst={milestoneLookFirst}
            goNext={milestoneGoNext}
            badges={milestoneBadges}
            actions={milestoneActions}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
          <Link
            to="/analytics#championship-trail"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Open championship trail
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/stables"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Browse stable rooms
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/rivalries"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Browse rivalry explorer
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
