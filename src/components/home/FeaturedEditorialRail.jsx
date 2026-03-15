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
import { buildRivalryInsight, getRivalryStateVariant } from '@/utils/rivalry';
import { summarizeLegacyAchievements } from '@/utils/recordsMilestones';
import { bashoDisplayName, divisionLabel, recentBashoIds } from '@/utils/basho';
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
      className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
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
    <article className={`rounded-2xl border p-5 ${toneClasses[tone] ?? toneClasses.zinc}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20">
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
          <h3 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{summary}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm leading-relaxed">
        <p className="text-zinc-400">
          <span className="font-semibold text-white">Why this is worth exploring:</span> {why}
        </p>
        <p className="text-zinc-400">
          <span className="font-semibold text-white">What to look at first:</span> {lookFirst}
        </p>
        <p className="text-zinc-400">
          <span className="font-semibold text-white">Where to go next:</span> {goNext}
        </p>
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
  return <div className="h-72 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]" />;
}

export default function FeaturedEditorialRail() {
  const recentIds = useMemo(() => recentBashoIds(5), []);

  const editorialQuery = useQuery({
    queryKey: ['home-editorial-snapshots', recentIds.join(',')],
    staleTime: 10 * 60 * 1000,
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

  const currentTitle = currentBashoId ? `Worth opening first: ${bashoDisplayName(currentBashoId)}` : 'Worth opening first: latest basho overview';
  const currentSummary = currentLeader
    ? `The latest published Makuuchi snapshot currently shows ${currentLeader.shikona} at ${currentLeader.wins}-${currentLeader.losses}${currentChaser ? `, with ${currentChaser.shikona} next at ${currentChaser.wins}-${currentChaser.losses}.` : '.'}`
    : currentJuryoLeader
      ? `Makuuchi is not currently loaded here, but the latest published Juryo snapshot shows ${currentJuryoLeader.shikona} at ${currentJuryoLeader.wins}-${currentJuryoLeader.losses}.`
      : 'If you want the most immediate tournament-first entry point, start with the latest basho overview and branch into a division from there.';

  const currentActions = [
    currentBashoId ? { label: 'Open basho overview', to: `/basho/${encodeURIComponent(currentBashoId)}` } : { label: 'Open basho browser', to: '/basho' },
    currentBashoId ? { label: 'Open Makuuchi', to: `/basho/${encodeURIComponent(currentBashoId)}/makuuchi` } : { label: 'Browse basho', to: '/basho' },
    currentBashoId && currentJuryoRows.length > 0 ? { label: 'Open Juryo', to: `/basho/${encodeURIComponent(currentBashoId)}/juryo` } : { label: 'Analytics trail', to: '/analytics#championship-trail' },
  ];

  const wrestlerTitle = featuredSummary?.shikona ?? currentLeader?.shikona ?? sampleTitleLeader?.shikona ?? 'Featured rikishi';
  const wrestlerSummary = featuredSummary
    ? `${featuredSummary.heya ? `${featuredSummary.heya} stable. ` : ''}Peak published rank ${featuredSummary.highestRank.rank} in ${divisionLabel(featuredSummary.highestRank.division)}.${currentLeader && featuredSummary.rikishiId === currentLeader.rikishiId ? ' He is also the current top visible Makuuchi entry point on the homepage.' : ''}`
    : currentLeader
      ? `${currentLeader.shikona} is the clearest current-profile entry point from the latest published Makuuchi snapshot.`
      : 'Open a rikishi page when you want the cleanest combination of profile identity, career shape, rivalry links, and records context.';

  const wrestlerWhy = currentLeader && featuredSummary?.rikishiId === currentLeader.rikishiId
    ? 'This gives you a tournament-relevant profile to open first, then the page expands cleanly into records, ranking history, and rivalries.'
    : 'This is a strong front-door profile because it leads quickly into records, ranking context, and stable-level browsing without forcing you to decide between pages first.';

  const wrestlerLookFirst = featuredSummary
    ? 'Open the records section first, then jump to ranking if you want to understand how the career arc led there.'
    : 'Open the profile summary first, then follow the records and rivalry links from inside the page.';

  const wrestlerGoNext = stablePath
    ? 'After the profile, check the stable page if you want roster depth and a broader heya context.'
    : 'After the profile, use the rivalry or basho links to keep the same wrestler in context.';

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
    ? `${featuredRivalryInsight.detail}${currentBashoId ? ` This pair also sits inside the latest published Makuuchi mix from ${bashoDisplayName(currentBashoId)}.` : ''}`
    : 'When one profile is not enough, the compare surface is the cleanest next step. Use it for head-to-head totals, recent form, and style context.';

  const rivalryWhy = featuredRivalry
    ? 'This is worth opening because it turns a current-looking homepage signal into an actual pair-level story instead of two separate wrestler pages.'
    : 'The rivalry explorer is the best editorial browse surface when you want the product to suggest a meaningful pair rather than a single profile.';

  const rivalryLookFirst = featuredRivalry
    ? 'Start with the comparison overview and recent-form section before diving into kimarite or era context.'
    : 'Start with the featured rivalry cards on the explorer, then open one comparison page in full.';

  const rivalryGoNext = currentBashoId
    ? 'After the compare page, jump back to the current basho division page if you want to see where the pairing sits inside the latest tournament picture.'
    : 'After the compare page, use the rivalry explorer for adjacent series or open the wrestler records panels for broader context.';

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
    ? `${featuredSummary.shikona} carries ${featuredLegacySummary.topDivisionYushoCount ?? 0} imported top-division yusho${featuredLegacySummary.specialPrizeCount ? ` and ${featuredLegacySummary.specialPrizeCount} imported special prizes` : ''}. That broader achievement context now sits beside the routeable profile milestones instead of hiding as incidental metadata.`
    : sampleTitleLeader
      ? `Across the recent Makuuchi sample visible on the analytics surface, ${sampleTitleLeader.shikona} appears as champion ${sampleTitleLeader.titles} time${sampleTitleLeader.titles === 1 ? '' : 's'}. This is a recent sample signal, not an all-career title table.`
      : 'The records layer now works best when you move between wrestler pages, the championship trail, and leaderboard slices instead of treating achievements as one isolated number.';

  const milestoneWhy = milestoneUsesImported
    ? 'This is the most direct example of the new records pass: routeable milestones stay separate from imported achievement totals, but both are now easy to browse.'
    : sampleTitleLeader
      ? 'This is worth opening when you want a high-signal milestone entry point that can branch into analytics and a wrestler records page immediately.'
      : 'The records and milestone surfaces are now browseable enough to act as a homepage entry point, not just a detail panel.';

  const milestoneLookFirst = milestoneUsesImported
    ? 'Open the wrestler records section first and read the milestone snapshot before jumping to the supporting basho links.'
    : sampleTitleLeader
      ? 'Open the records section on the wrestler page first, then use the analytics championship trail for the broader sample view.'
      : 'Start with the championship trail or a records panel, then widen out into leaderboard or basho context.';

  const milestoneGoNext = milestoneUsesImported
    ? 'After the records panel, use the leaderboard slice for imported context and analytics for the recent championship trail.'
    : sampleTitleLeader
      ? 'After the records panel, use the latest sampled basho or the analytics trail to see how the milestone appears in context.'
      : 'After the first milestone surface, move into analytics or the leaderboard depending on whether you want sample context or imported totals.';

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
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400">WORTH EXPLORING NOW</div>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Start with a curated signal, not a cold directory page
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            These homepage picks are grounded in currently published standings, visible rivalry data, and the records layer already inside the product. They are editorial entry points, not invented live-storytelling.
          </p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <EditorialCard
            eyebrow="Current now"
            icon={Calendar}
            tone="red"
            title={currentTitle}
            summary={currentSummary}
            why="This is the fastest database-first path into something that feels current without pretending the homepage is a live ticker."
            lookFirst="Start with the basho overview, then open the Makuuchi division table for the actual standings picture."
            goNext={featuredRivalry
              ? 'If the leading names feel like a real pairing, open the featured rivalry next for head-to-head context.'
              : 'From the basho overview, jump into a featured wrestler page or the analytics championship trail.'}
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
            to="/rivalries"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Browse rivalry explorer
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/stables"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Browse stable rooms
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
