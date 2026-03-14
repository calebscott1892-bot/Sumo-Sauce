import { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, Clock, Compass, Swords } from 'lucide-react';
import { trackEraAnalyticsView } from '@/utils/analytics';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { getRikishiDirectory, getCareerTimeline } from '@/pages/rikishi/api';
import { parseBashoId } from '@/utils/basho';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import { PremiumPageHeader, PremiumSectionShell, PremiumBadge } from '@/components/ui/premium';
import AnalyticsNav from '@/components/analytics/AnalyticsNav';
import AnalyticsTakeawayCard from '@/components/analytics/AnalyticsTakeawayCard';
import type { TimelineItem } from '../../shared/api/v1';

type EraData = {
  decade: string;
  bashoCount: number;
  uniqueRikishi: number;
  avgWinRate: number;
  topPerformers: { id: string; shikona: string; winRate: number; bouts: number }[];
};

function getDecade(bashoId: string): string {
  const parsed = parseBashoId(bashoId);
  if (!parsed) return 'Unknown';
  const decadeStart = Math.floor(parsed.year / 10) * 10;
  return `${decadeStart}s`;
}

export default function EraAnalyticsPage() {
  useEffect(() => { trackEraAnalyticsView(); }, []);

  const directoryQuery = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000,
  });

  const sampleIds = useMemo(() => {
    if (!directoryQuery.data?.length) return [];
    return directoryQuery.data.slice(0, 50);
  }, [directoryQuery.data]);

  const timelinesQuery = useQuery({
    queryKey: ['era-timelines', sampleIds.map((sample) => sample.rikishiId).join(',')],
    enabled: sampleIds.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const results: { id: string; shikona: string; timeline: TimelineItem[] }[] = [];
      const batchSize = 10;
      for (let i = 0; i < sampleIds.length; i += batchSize) {
        const batch = sampleIds.slice(i, i + batchSize);
        const batchData = await Promise.all(
          batch.map(async (entry) => {
            try {
              const timeline = await getCareerTimeline(entry.rikishiId);
              return { id: entry.rikishiId, shikona: entry.shikona, timeline };
            } catch {
              return { id: entry.rikishiId, shikona: entry.shikona, timeline: [] };
            }
          }),
        );
        results.push(...batchData);
      }
      return results;
    },
  });

  const eraData = useMemo((): EraData[] => {
    if (!timelinesQuery.data) return [];

    const byDecade = new Map<string, {
      bashoIds: Set<string>;
      rikishiIds: Set<string>;
      totalWins: number;
      totalBouts: number;
      performers: Map<string, { shikona: string; wins: number; bouts: number }>;
    }>();

    for (const rikishi of timelinesQuery.data) {
      for (const entry of rikishi.timeline) {
        const decade = getDecade(entry.bashoId);
        if (decade === 'Unknown') continue;

        if (!byDecade.has(decade)) {
          byDecade.set(decade, {
            bashoIds: new Set(),
            rikishiIds: new Set(),
            totalWins: 0,
            totalBouts: 0,
            performers: new Map(),
          });
        }

        const decadeData = byDecade.get(decade)!;
        decadeData.bashoIds.add(entry.bashoId);
        decadeData.rikishiIds.add(rikishi.id);
        const bouts = entry.wins + entry.losses;
        decadeData.totalWins += entry.wins;
        decadeData.totalBouts += bouts;

        const existing = decadeData.performers.get(rikishi.id) ?? { shikona: rikishi.shikona, wins: 0, bouts: 0 };
        existing.wins += entry.wins;
        existing.bouts += bouts;
        decadeData.performers.set(rikishi.id, existing);
      }
    }

    return Array.from(byDecade.entries())
      .map(([decade, data]) => {
        const topPerformers = Array.from(data.performers.entries())
          .map(([id, performer]) => ({
            id,
            shikona: performer.shikona,
            winRate: performer.bouts > 0 ? performer.wins / performer.bouts : 0,
            bouts: performer.bouts,
          }))
          .filter((performer) => performer.bouts >= 30)
          .sort((a, b) => b.winRate - a.winRate)
          .slice(0, 5);

        return {
          decade,
          bashoCount: data.bashoIds.size,
          uniqueRikishi: data.rikishiIds.size,
          avgWinRate: data.totalBouts > 0 ? data.totalWins / data.totalBouts : 0,
          topPerformers,
        };
      })
      .sort((a, b) => a.decade.localeCompare(b.decade));
  }, [timelinesQuery.data]);

  const chartData = useMemo(() => (
    eraData.map((era) => ({
      decade: era.decade,
      wrestlers: era.uniqueRikishi,
      basho: era.bashoCount,
      winRate: Number((era.avgWinRate * 100).toFixed(1)),
    }))
  ), [eraData]);

  const isLoading = directoryQuery.isLoading || timelinesQuery.isLoading;
  const loadedTimelineProfiles = timelinesQuery.data?.filter((entry) => entry.timeline.length > 0).length ?? 0;
  const strongestEra = [...eraData].sort((a, b) => b.avgWinRate - a.avgWinRate)[0] ?? null;
  const busiestEra = [...eraData].sort((a, b) => b.uniqueRikishi - a.uniqueRikishi)[0] ?? null;
  const sampleStandout = eraData
    .flatMap((era) => era.topPerformers.map((performer) => ({ ...performer, decade: era.decade })))
    .sort((a, b) => b.winRate - a.winRate || b.bouts - a.bouts)[0] ?? null;

  if (directoryQuery.error || timelinesQuery.error) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  return (
    <div className="stagger-children mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title="SumoWatch — Era Analytics"
        description="Guided era analytics on SumoWatch — sampled decade trends, participation context, and standout performers."
      />

      <PremiumPageHeader
        accentLabel="ERA ANALYTICS"
        title="Era Analytics"
        subtitle="Use this page as a sampled decade-by-decade view of participation and performance. It is meant to show directional patterns from loaded timelines, not claim complete historical coverage."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Analytics', to: '/analytics' },
          { label: 'Eras' },
        ]}
      >
        <AnalyticsNav current="eras" />

        {!isLoading && (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsTakeawayCard
              eyebrow="Sample scope"
              value={String(loadedTimelineProfiles)}
              title="Profiles with loaded timelines"
              detail={`This era surface is built from the current sampled timeline set, currently drawn from ${sampleIds.length} directory entries with ${loadedTimelineProfiles} loaded timelines.`}
              variant="blue"
            />
            <AnalyticsTakeawayCard
              eyebrow="Highest sampled era"
              value={strongestEra ? `${(strongestEra.avgWinRate * 100).toFixed(1)}%` : '—'}
              title={strongestEra ? strongestEra.decade : 'No era data'}
              detail="Read this as the strongest average win-rate decade inside the current sampled timeline set."
              variant="green"
            />
            <AnalyticsTakeawayCard
              eyebrow="Widest participation"
              value={busiestEra ? String(busiestEra.uniqueRikishi) : '—'}
              title={busiestEra ? `${busiestEra.decade} sampled rikishi` : 'No participation data'}
              detail="This is the busiest decade in the current sample by unique loaded rikishi."
              variant="amber"
              to="/timeline"
              cta="Open basho timeline"
            />
            <AnalyticsTakeawayCard
              eyebrow="Sample standout"
              value={sampleStandout?.shikona ?? '—'}
              title={sampleStandout ? `${(sampleStandout.winRate * 100).toFixed(1)}% win rate in ${sampleStandout.decade}` : 'No standout performer'}
              detail="Highest sampled performer by win rate among decade leaders with at least thirty published bouts."
              variant="red"
              to={sampleStandout ? `/rikishi/${encodeURIComponent(sampleStandout.id)}` : undefined}
              cta={sampleStandout ? 'Open profile' : undefined}
            />
          </div>
        )}
      </PremiumPageHeader>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      )}

      {!isLoading && eraData.length > 0 && (
        <>
          <PremiumSectionShell
            title="How To Read This Page"
            subtitle="Start with participation, then read win-rate trend, then use the decade cards to jump into actual rikishi profiles."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <div className="text-2xl font-bold text-white">{eraData.length}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-500">Decades</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {eraData.reduce((sum, era) => sum + era.bashoCount, 0)}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-500">Sampled basho</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {new Set(eraData.flatMap((era) => era.topPerformers.map((performer) => performer.id))).size}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-500">Era leaders</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {eraData.length > 0 ? `${(eraData[eraData.length - 1].avgWinRate * 100).toFixed(0)}%` : '—'}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-500">Latest sampled era rate</div>
              </div>
            </div>
          </PremiumSectionShell>

          <PremiumSectionShell
            title="Participation By Era"
            subtitle="Read this first if you want to know where the sample is densest before trusting any decade-level performance comparison."
            trailing={(
              <Link
                to="/timeline"
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
              >
                Basho timeline
              </Link>
            )}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <AnalyticsTakeawayCard
                eyebrow="Read this as"
                title="Sample density, not universal coverage"
                detail="A decade with more sampled rikishi and basho will naturally produce more stable-looking averages. Thin decades deserve more caution."
                variant="blue"
              />
              <AnalyticsTakeawayCard
                eyebrow="Go next"
                title={busiestEra ? `${busiestEra.decade} stands out` : 'No busy era yet'}
                detail="Use the basho timeline when you want a tournament-first browse after identifying a decade that looks especially dense."
                variant="amber"
                to="/timeline"
                cta="Open timeline"
              />
            </div>

            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="decade" stroke="#a1a1aa" fontSize={12} />
                  <YAxis stroke="#a1a1aa" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                    labelStyle={{ color: '#f4f4f5' }}
                  />
                  <Bar dataKey="wrestlers" fill="#ef4444" name="Wrestlers" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="basho" fill="#3b82f6" name="Tournaments" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PremiumSectionShell>

          <PremiumSectionShell
            title="Win-Rate Trend"
            subtitle="Use this to compare direction and relative strength across decades, while remembering that the page is still bounded by its sampled timeline set."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <AnalyticsTakeawayCard
                eyebrow="Highest sampled decade"
                value={strongestEra ? `${(strongestEra.avgWinRate * 100).toFixed(1)}%` : '—'}
                title={strongestEra ? strongestEra.decade : 'No strongest era'}
                detail="This is the decade with the strongest sampled average win rate in the currently loaded dataset."
                variant="green"
              />
              <AnalyticsTakeawayCard
                eyebrow="Next question"
                title={sampleStandout ? sampleStandout.shikona : 'Era leaders'}
                detail="After spotting a strong era, move into the leading rikishi card below to inspect an actual profile instead of staying in the abstract trend view."
                variant="red"
                to={sampleStandout ? `/rikishi/${encodeURIComponent(sampleStandout.id)}` : '/rikishi'}
                cta="Open profile"
              />
            </div>

            <div className="mt-5 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="decade" stroke="#a1a1aa" fontSize={12} />
                  <YAxis stroke="#a1a1aa" fontSize={12} domain={[40, 60]} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                    labelStyle={{ color: '#f4f4f5' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="winRate"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="Avg Win %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </PremiumSectionShell>

          <PremiumSectionShell
            title="Top Performers By Era"
            subtitle="This is where the page becomes actionable: each decade card lets you leave the aggregate view and inspect the actual rikishi driving that sampled era."
          >
            <div className="space-y-4">
              {eraData.map((era) => (
                <div
                  key={era.decade}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors duration-150 hover:border-white/[0.12]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">{era.decade}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                        <PremiumBadge variant="zinc">{era.bashoCount} basho</PremiumBadge>
                        <PremiumBadge variant="zinc">{era.uniqueRikishi} sampled rikishi</PremiumBadge>
                        <PremiumBadge variant="green">{(era.avgWinRate * 100).toFixed(1)}% avg win rate</PremiumBadge>
                      </div>
                    </div>

                    {era.topPerformers.length >= 2 ? (
                      <Link
                        to={`/compare/${encodeURIComponent(era.topPerformers[0].id)}/${encodeURIComponent(era.topPerformers[1].id)}`}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                      >
                        Compare #{1} vs #{2}
                      </Link>
                    ) : null}
                  </div>

                  {era.topPerformers.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {era.topPerformers.map((performer, index) => (
                        <Link
                          key={performer.id}
                          to={`/rikishi/${encodeURIComponent(performer.id)}`}
                          className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-colors hover:border-red-600"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 text-right text-xs text-zinc-600">#{index + 1}</span>
                            <span className="font-medium text-zinc-100">{performer.shikona}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-emerald-400">{(performer.winRate * 100).toFixed(1)}%</span>
                            <span className="ml-2 text-xs text-zinc-500">{performer.bouts} bouts</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500">No qualifying performers in this sampled era.</p>
                  )}
                </div>
              ))}
            </div>
          </PremiumSectionShell>

          <PremiumSectionShell
            title="Go Next"
            subtitle="Choose the next surface that turns the era-level pattern into a concrete follow-up."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <AnalyticsTakeawayCard
                eyebrow="Recent baseline"
                title="Global analytics"
                detail="Return to the recent-sample overview when you want current Makuuchi context instead of decade framing."
                variant="blue"
                to="/analytics"
                cta="Open page"
                icon={<Compass className="h-4 w-4" />}
              />
              <AnalyticsTakeawayCard
                eyebrow="Tournament-first"
                title="Basho timeline"
                detail="Use the timeline when you want to browse tournament chronology rather than sampled decade averages."
                variant="amber"
                to="/timeline"
                cta="Open timeline"
                icon={<Clock className="h-4 w-4" />}
              />
              <AnalyticsTakeawayCard
                eyebrow="Profiles"
                title={sampleStandout?.shikona ?? 'Browse rikishi'}
                detail="Move into a wrestler page when the sampled era trend points you toward one standout rikishi."
                variant="green"
                to={sampleStandout ? `/rikishi/${encodeURIComponent(sampleStandout.id)}` : '/rikishi'}
                cta="Open profile"
                icon={<Award className="h-4 w-4" />}
              />
              <AnalyticsTakeawayCard
                eyebrow="Head to head"
                title="Rivalry explorer"
                detail="Switch to rivalries when your next question is about how strong rikishi relate to one another rather than how eras differ."
                variant="red"
                to="/rivalries"
                cta="Open rivalries"
                icon={<Swords className="h-4 w-4" />}
              />
            </div>
          </PremiumSectionShell>
        </>
      )}

      {!isLoading && eraData.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <Clock className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">No era data available.</p>
        </div>
      )}
    </div>
  );
}
