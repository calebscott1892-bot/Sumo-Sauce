import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, Layers, LineChart, Trophy, TrendingDown, TrendingUp } from 'lucide-react';
import type { RankProgressionItem, TimelineItem } from '@/pages/rikishi/types';
import { bashoLabel, divisionLabel } from '@/utils/basho';
import {
  CAREER_DIVISION_ORDER,
  countDistinctBasho,
  describeCareerMovement,
  findFirstDivisionEntry,
  findLatestYusho,
  sortCareerRowsChronologically,
} from '@/utils/careerProgression';
import { PremiumBadge } from '@/components/ui/premium';
import type { Division } from '../../../shared/api/v1';

type Props = {
  timeline: TimelineItem[];
  rankProgression: RankProgressionItem[];
  highestRank: {
    division: Division;
    rank: string;
    bashoId: string;
  };
};

const DIVISION_COLORS: Record<Division, string> = {
  makuuchi: 'bg-red-500',
  juryo: 'bg-amber-500',
  makushita: 'bg-emerald-500',
  sandanme: 'bg-blue-500',
  jonidan: 'bg-violet-500',
  jonokuchi: 'bg-zinc-500',
};

function MilestoneCard({
  label,
  value,
  detail,
  to,
  variant = 'zinc',
}: {
  label: string;
  value: string;
  detail: string;
  to?: string;
  variant?: 'amber' | 'green' | 'blue' | 'zinc';
}) {
  const body = (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 transition-colors hover:border-white/[0.12]">
      <div className="flex items-center gap-2">
        <PremiumBadge variant={variant}>{label}</PremiumBadge>
      </div>
      <div className="mt-3 font-display text-lg font-bold tracking-tight text-white">{value}</div>
      <p className="mt-1 text-sm leading-relaxed text-zinc-500">{detail}</p>
      {to ? (
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-red-400">
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

export default function HistoricalRankExplorer({ timeline, rankProgression, highestRank }: Props) {
  const progressionChrono = useMemo(
    () => sortCareerRowsChronologically(rankProgression),
    [rankProgression],
  );
  const timelineChrono = useMemo(
    () => sortCareerRowsChronologically(timeline),
    [timeline],
  );

  const divisionStats = useMemo(() => {
    const counts = new Map<string, number>();
    const uniqueBasho = new Map<string, Set<string>>();

    for (const item of timelineChrono) {
      const division = item.division;
      counts.set(division, (counts.get(division) ?? 0) + 1);
      if (!uniqueBasho.has(division)) uniqueBasho.set(division, new Set());
      uniqueBasho.get(division)?.add(item.bashoId);
    }

    return CAREER_DIVISION_ORDER
      .filter((division) => counts.has(division))
      .map((division) => ({
        division,
        entries: counts.get(division) ?? 0,
        bashoCount: uniqueBasho.get(division)?.size ?? 0,
      }));
  }, [timelineChrono]);

  const totalBasho = useMemo(() => countDistinctBasho(timelineChrono), [timelineChrono]);
  const yushoCount = useMemo(() => progressionChrono.filter((item) => item.yusho).length, [progressionChrono]);
  const maxEntries = Math.max(...divisionStats.map((item) => item.bashoCount), 1);

  const latestEntry = timelineChrono.at(-1) ?? null;
  const previousEntry = timelineChrono.at(-2) ?? null;
  const latestMovement = latestEntry ? describeCareerMovement(previousEntry, latestEntry) : null;

  const firstSekitori = useMemo(() => {
    const sorted = timelineChrono;
    return sorted.find((item) => item.division === 'makuuchi' || item.division === 'juryo') ?? null;
  }, [timelineChrono]);
  const makuuchiDebut = useMemo(() => findFirstDivisionEntry(timelineChrono, 'makuuchi'), [timelineChrono]);
  const latestYusho = useMemo(() => findLatestYusho(progressionChrono), [progressionChrono]);

  const recentWindow = progressionChrono.slice(-3);
  const recentKachiKoshi = recentWindow.filter((item) => item.kachiKoshi || item.yusho).length;
  const recentMakeKoshi = recentWindow.filter((item) => item.makeKoshi).length;

  if (divisionStats.length === 0 || !latestEntry) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.015] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-red-500" />
            <h2 className="font-display text-xl font-bold tracking-tight text-white">Progression Snapshot</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-500">
            Rank history is easier to read when you start with the milestones: peak rank, latest movement, and the divisions this rikishi has crossed.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to={`/basho/${encodeURIComponent(latestEntry.bashoId)}`}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Latest basho
          </Link>
          <Link
            to="/analytics/eras"
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Era analytics
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <PremiumBadge variant={latestMovement?.variant ?? 'zinc'}>{latestMovement?.label ?? 'Current position'}</PremiumBadge>
            <PremiumBadge variant="zinc">
              {divisionLabel(latestEntry.division)} {latestEntry.rank}
            </PremiumBadge>
          </div>
          <p className="mt-3 text-base leading-relaxed text-zinc-200">
            {latestMovement?.detail ?? `Latest published basho: ${bashoLabel(latestEntry.bashoId)}.`}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3">
              <div className="flex items-center gap-1 text-xs text-amber-400">
                <Award className="h-3 w-3" />
                Highest rank
              </div>
              <div className="mt-1 font-bold text-amber-200">{highestRank.rank}</div>
              <div className="text-[11px] text-amber-300/70">
                {divisionLabel(highestRank.division)} · {bashoLabel(highestRank.bashoId)}
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="text-xs text-zinc-400">Career span</div>
              <div className="mt-1 font-bold text-zinc-100">{totalBasho} basho</div>
              <div className="text-[11px] text-zinc-500">{divisionStats.length} divisions reached</div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="text-xs text-zinc-400">Recent run</div>
              <div className="mt-1 font-bold text-zinc-100">{recentKachiKoshi}-{recentMakeKoshi}</div>
              <div className="text-[11px] text-zinc-500">Winning vs losing basho across the last 3 appearances</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Layers className="h-4 w-4 text-red-400" />
            Division journey
          </div>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
            This shows where the wrestler has actually spent time, not just the peak.
          </p>
          <div className="mt-4 space-y-3">
            {divisionStats.map((item) => {
              const pct = (item.bashoCount / maxEntries) * 100;
              return (
                <div key={item.division}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-zinc-200">{divisionLabel(item.division)}</span>
                    <span className="text-zinc-500">{item.bashoCount} basho</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-2 rounded-full ${DIVISION_COLORS[item.division]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MilestoneCard
          label="Peak"
          value={highestRank.rank}
          detail={`${divisionLabel(highestRank.division)} at ${bashoLabel(highestRank.bashoId)}.`}
          to={`/basho/${encodeURIComponent(highestRank.bashoId)}/${encodeURIComponent(highestRank.division)}`}
          variant="amber"
        />

        {firstSekitori ? (
          <MilestoneCard
            label="Sekitori debut"
            value={`${divisionLabel(firstSekitori.division)} ${firstSekitori.rank}`}
            detail={`First salaried division appearance in ${bashoLabel(firstSekitori.bashoId)}.`}
            to={`/basho/${encodeURIComponent(firstSekitori.bashoId)}/${encodeURIComponent(firstSekitori.division)}`}
            variant="green"
          />
        ) : (
          <MilestoneCard
            label="Sekitori debut"
            value="Not yet reached"
            detail="No salaried-division appearance is published in the current timeline."
          />
        )}

        {makuuchiDebut ? (
          <MilestoneCard
            label="Top-division debut"
            value={makuuchiDebut.rank}
            detail={`First Makuuchi appearance in ${bashoLabel(makuuchiDebut.bashoId)}.`}
            to={`/basho/${encodeURIComponent(makuuchiDebut.bashoId)}/makuuchi`}
            variant="blue"
          />
        ) : (
          <MilestoneCard
            label="Top-division debut"
            value="Not yet reached"
            detail="No Makuuchi appearance is published in the current career timeline."
          />
        )}

        {latestYusho ? (
          <MilestoneCard
            label="Latest yusho"
            value={`${divisionLabel(latestYusho.division)} ${latestYusho.rank}`}
            detail={`Championship result in ${bashoLabel(latestYusho.bashoId)}.`}
            to={`/basho/${encodeURIComponent(latestYusho.bashoId)}/${encodeURIComponent(latestYusho.division)}`}
            variant="amber"
          />
        ) : (
          <MilestoneCard
            label="Latest yusho"
            value={yushoCount > 0 ? `${yushoCount} total` : 'No yusho in feed'}
            detail={yushoCount > 0 ? 'A yusho is recorded in the progression feed, but the latest item could not be resolved.' : 'No championship marker is published in the current progression feed.'}
          />
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-500">
        <Link
          to={`/basho/${encodeURIComponent(latestEntry.bashoId)}/${encodeURIComponent(latestEntry.division)}`}
          className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
        >
          Latest division page
        </Link>
        <Link
          to="/timeline"
          className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
        >
          Basho timeline
        </Link>
        <span className="inline-flex items-center gap-1">
          {latestMovement?.state === 'promotion' ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          ) : latestMovement?.state === 'demotion' ? (
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
          ) : (
            <Trophy className="h-3.5 w-3.5 text-zinc-500" />
          )}
          Milestones and movement are derived only from the published career timeline and rank progression feed.
        </span>
      </div>
    </section>
  );
}
