import { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { trackRivalryExplorerView } from '@/utils/analytics';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, Flame, MoveRight, Scale, Search, Trophy } from 'lucide-react';
import { getRikishiDirectory, getHeadToHead } from '@/pages/rikishi/api';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import EmptyState from '@/components/ui/EmptyState';
import { PremiumBadge, PremiumPageHeader, PremiumSectionShell } from '@/components/ui/premium';
import { buildRivalryInsight, getRivalryStateVariant } from '@/utils/rivalry';

type RivalryEntry = {
  rikishiA: string;
  shikonaA: string;
  heyaA: string | null;
  rikishiB: string;
  shikonaB: string;
  heyaB: string | null;
  totalMatches: number;
  aWins: number;
  bWins: number;
  closeness: number;
};

type SortKey = 'matches' | 'closeness';
type ViewKey = 'all' | 'balanced' | 'decisive';

function sortDirectoryForRivalries(
  directory: { rikishiId: string; shikona: string; heya: string | null }[],
): { rikishiId: string; shikona: string; heya: string | null }[] {
  return [...directory].sort((a, b) => {
    const numericA = Number.parseInt(a.rikishiId, 10);
    const numericB = Number.parseInt(b.rikishiId, 10);
    const safeA = Number.isFinite(numericA) ? numericA : Number.MAX_SAFE_INTEGER;
    const safeB = Number.isFinite(numericB) ? numericB : Number.MAX_SAFE_INTEGER;
    return safeA - safeB || a.shikona.localeCompare(b.shikona);
  });
}

function topPairs(
  directory: { rikishiId: string; shikona: string; heya: string | null }[],
  maxPairs: number,
): Array<[typeof directory[number], typeof directory[number]]> {
  const top = sortDirectoryForRivalries(directory).slice(0, Math.min(directory.length, 80));
  const pairs: Array<[typeof directory[number], typeof directory[number]]> = [];
  for (let i = 0; i < top.length && pairs.length < maxPairs; i += 1) {
    for (let j = i + 1; j < top.length && pairs.length < maxPairs; j += 1) {
      pairs.push([top[i], top[j]]);
    }
  }
  return pairs;
}

function FeaturedRivalryCard({
  title,
  rivalry,
}: {
  title: string;
  rivalry: RivalryEntry | null;
}) {
  if (!rivalry) return null;

  const insight = buildRivalryInsight({
    winsA: rivalry.aWins,
    winsB: rivalry.bWins,
    totalMatches: rivalry.totalMatches,
    labelA: rivalry.shikonaA,
    labelB: rivalry.shikonaB,
  });

  return (
    <Link
      to={`/compare/${encodeURIComponent(rivalry.rikishiA)}/${encodeURIComponent(rivalry.rikishiB)}`}
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-red-600/40 hover:bg-white/[0.04]"
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{title}</div>
      <div className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
        {rivalry.shikonaA} vs {rivalry.shikonaB}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <PremiumBadge variant={getRivalryStateVariant(insight.state)}>{insight.label}</PremiumBadge>
        <PremiumBadge variant="zinc">{rivalry.totalMatches} bouts</PremiumBadge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">{insight.detail}</p>
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors group-hover:text-zinc-300">
        Open comparison
        <MoveRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

function RivalryRow({
  rivalry,
}: {
  rivalry: RivalryEntry;
}) {
  const insight = buildRivalryInsight({
    winsA: rivalry.aWins,
    winsB: rivalry.bWins,
    totalMatches: rivalry.totalMatches,
    labelA: rivalry.shikonaA,
    labelB: rivalry.shikonaB,
  });

  return (
    <Link
      to={`/compare/${encodeURIComponent(rivalry.rikishiA)}/${encodeURIComponent(rivalry.rikishiB)}`}
      className="block rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-red-600 hover:bg-white/[0.04]"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start">
          <div className="min-w-0">
            <div className="font-semibold text-zinc-100">{rivalry.shikonaA}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
              <span className="font-mono text-zinc-400">{rivalry.rikishiA}</span>
              <span>{rivalry.heyaA ?? 'Heya unpublished'}</span>
            </div>
          </div>

          <div className="text-left sm:text-center">
            <div className="font-display text-2xl font-bold tracking-tight text-white">
              <span className={rivalry.aWins > rivalry.bWins ? 'text-emerald-400' : 'text-zinc-300'}>{rivalry.aWins}</span>
              <span className="mx-2 text-zinc-600">-</span>
              <span className={rivalry.bWins > rivalry.aWins ? 'text-emerald-400' : 'text-zinc-300'}>{rivalry.bWins}</span>
            </div>
            <div className="text-xs text-zinc-500">{rivalry.totalMatches} bouts</div>
          </div>

          <div className="min-w-0 text-left sm:text-right">
            <div className="font-semibold text-zinc-100">{rivalry.shikonaB}</div>
            <div className="mt-1 flex flex-wrap justify-start gap-x-3 gap-y-1 text-xs text-zinc-500 sm:justify-end">
              <span>{rivalry.heyaB ?? 'Heya unpublished'}</span>
              <span className="font-mono text-zinc-400">{rivalry.rikishiB}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <PremiumBadge variant={getRivalryStateVariant(insight.state)}>{insight.label}</PremiumBadge>
          <PremiumBadge variant="zinc">{Math.round(rivalry.closeness * 100)}% balance</PremiumBadge>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="flex h-full">
          <div className="bg-red-500 transition-all" style={{ width: `${insight.aShare}%` }} />
          <div className="bg-blue-500 transition-all" style={{ width: `${insight.bShare}%` }} />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm leading-relaxed text-zinc-400">{insight.detail}</p>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
          Open comparison
          <MoveRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function pickDistinctFeatured(
  list: RivalryEntry[],
  sortFn: (entries: RivalryEntry[]) => RivalryEntry[],
  exclude: Set<string>,
): RivalryEntry | null {
  const next = sortFn(list).find((item) => !exclude.has(`${item.rikishiA}-${item.rikishiB}`));
  if (!next) return null;
  exclude.add(`${next.rikishiA}-${next.rikishiB}`);
  return next;
}

export default function RivalryExplorerPage() {
  useEffect(() => { trackRivalryExplorerView(); }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const urlSort = searchParams.get('sort') === 'closeness' ? 'closeness' : 'matches';
  const urlView = searchParams.get('view') === 'balanced'
    ? 'balanced'
    : searchParams.get('view') === 'decisive'
      ? 'decisive'
      : 'all';

  const [searchTerm, setSearchTerm] = useState(urlQuery);
  const [sortBy, setSortBy] = useState<SortKey>(urlSort);
  const [viewBy, setViewBy] = useState<ViewKey>(urlView);
  const deferredSearch = useDeferredValue(searchTerm);

  useEffect(() => {
    setSearchTerm(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    setSortBy(urlSort);
  }, [urlSort]);

  useEffect(() => {
    setViewBy(urlView);
  }, [urlView]);

  useEffect(() => {
    const params: Record<string, string> = {};
    const nextQuery = deferredSearch.trim();
    if (nextQuery) params.q = nextQuery;
    if (sortBy !== 'matches') params.sort = sortBy;
    if (viewBy !== 'all') params.view = viewBy;
    const nextParams = new URLSearchParams(params);
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [deferredSearch, sortBy, viewBy, setSearchParams, searchParams]);

  const directoryQuery = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000,
  });

  const candidateQuery = deferredSearch.trim().toLowerCase();

  const candidatePool = useMemo(() => {
    if (!directoryQuery.data?.length) return [];
    const sorted = sortDirectoryForRivalries(directoryQuery.data);

    if (!candidateQuery) {
      return sorted.slice(0, Math.min(sorted.length, 80));
    }

    const matches = sorted.filter((entry) =>
      entry.shikona.toLowerCase().includes(candidateQuery) ||
      entry.rikishiId.toLowerCase().includes(candidateQuery) ||
      (entry.heya ?? '').toLowerCase().includes(candidateQuery),
    );

    if (matches.length >= 18) {
      return matches.slice(0, 18);
    }

    const focused = [...matches];
    const used = new Set(matches.map((entry) => entry.rikishiId));
    for (const entry of sorted) {
      if (used.has(entry.rikishiId)) continue;
      focused.push(entry);
      used.add(entry.rikishiId);
      if (focused.length >= 18) break;
    }

    return focused;
  }, [candidateQuery, directoryQuery.data]);

  const candidatePairs = useMemo(() => {
    if (!candidatePool.length) return [];
    return topPairs(candidatePool, candidateQuery ? 90 : 120);
  }, [candidatePool, candidateQuery]);

  const h2hQuery = useQuery({
    queryKey: ['rivalry-explorer-h2h', candidatePairs.map(([a, b]) => `${a.rikishiId}:${b.rikishiId}`).join(',')],
    enabled: candidatePairs.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<RivalryEntry[]> => {
      const results: RivalryEntry[] = [];
      const batchSize = 15;
      for (let i = 0; i < candidatePairs.length; i += batchSize) {
        const batch = candidatePairs.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async ([aEntry, bEntry]) => {
            try {
              const h2h = await getHeadToHead(aEntry.rikishiId, bEntry.rikishiId);
              if (h2h.totalMatches < 5) return null;
              const closeness = h2h.totalMatches > 0
                ? 1 - Math.abs(h2h.rikishiAWins - h2h.rikishiBWins) / h2h.totalMatches
                : 0;
              return {
                rikishiA: aEntry.rikishiId,
                shikonaA: aEntry.shikona,
                heyaA: aEntry.heya,
                rikishiB: bEntry.rikishiId,
                shikonaB: bEntry.shikona,
                heyaB: bEntry.heya,
                totalMatches: h2h.totalMatches,
                aWins: h2h.rikishiAWins,
                bWins: h2h.rikishiBWins,
                closeness,
              } as RivalryEntry;
            } catch {
              return null;
            }
          }),
        );
        results.push(...batchResults.filter(Boolean) as RivalryEntry[]);
      }
      return results;
    },
  });

  const allRivalries = h2hQuery.data ?? [];
  const query = candidateQuery;

  const rivalries = useMemo(() => {
    let list = allRivalries;

    if (viewBy !== 'all') {
      list = list.filter((entry) => {
        const insight = buildRivalryInsight({
          winsA: entry.aWins,
          winsB: entry.bWins,
          totalMatches: entry.totalMatches,
          labelA: entry.shikonaA,
          labelB: entry.shikonaB,
        });
        if (viewBy === 'balanced') return insight.state === 'even' || insight.state === 'balanced';
        return insight.state === 'dominant';
      });
    }

    if (query) {
      list = list.filter((r) =>
        r.shikonaA.toLowerCase().includes(query) ||
        r.shikonaB.toLowerCase().includes(query) ||
        r.rikishiA.toLowerCase().includes(query) ||
        r.rikishiB.toLowerCase().includes(query) ||
        (r.heyaA ?? '').toLowerCase().includes(query) ||
        (r.heyaB ?? '').toLowerCase().includes(query),
      );
    }

    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'closeness') return b.closeness - a.closeness || b.totalMatches - a.totalMatches;
      return b.totalMatches - a.totalMatches || b.closeness - a.closeness;
    });

    return sorted;
  }, [allRivalries, query, sortBy, viewBy]);

  const featured = useMemo(() => {
    const source = rivalries.length > 0 ? rivalries : allRivalries;
    const exclude = new Set<string>();
    return {
      mostContested: pickDistinctFeatured(
        source,
        (entries) => [...entries].sort((a, b) => b.totalMatches - a.totalMatches || b.closeness - a.closeness),
        exclude,
      ),
      closest: pickDistinctFeatured(
        source,
        (entries) => [...entries].sort((a, b) => b.closeness - a.closeness || b.totalMatches - a.totalMatches),
        exclude,
      ),
      decisive: pickDistinctFeatured(
        source,
        (entries) => [...entries].sort((a, b) => {
          const marginA = Math.abs(a.aWins - a.bWins) / Math.max(a.totalMatches, 1);
          const marginB = Math.abs(b.aWins - b.bWins) / Math.max(b.totalMatches, 1);
          return marginB - marginA || b.totalMatches - a.totalMatches;
        }),
        exclude,
      ),
    };
  }, [allRivalries, rivalries]);

  const topSummary = featured.mostContested;
  const closestSummary = featured.closest;

  const toggleSort = useCallback(() => {
    setSortBy((prev) => (prev === 'matches' ? 'closeness' : 'matches'));
  }, []);

  if (directoryQuery.error || h2hQuery.error) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  return (
    <div className="stagger-children mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title="SumoWatch — Rivalry Explorer"
        description="Browse sampled head-to-head rivalries in SumoWatch and jump into deeper rikishi comparisons."
      />

      <PremiumPageHeader
        accentLabel="HEAD TO HEAD"
        title="Rivalry Explorer"
        subtitle="Browse a sampled discovery surface for published head-to-head series. Start with a featured rivalry or filter by shikona, rikishi id, or heya, then open compare pages for exact pair-level context."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Rivalries' },
        ]}
      >
        {!h2hQuery.isLoading && allRivalries.length > 0 && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Sampled rivalries</div>
              <div className="mt-2 font-display text-2xl font-bold tracking-tight text-white">{allRivalries.length}</div>
              <div className="mt-1 text-sm text-zinc-500">Series with five or more published bouts in the current sample.</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Most contested</div>
              <div className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
                {topSummary ? `${topSummary.totalMatches}` : '—'}
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                {topSummary ? `${topSummary.shikonaA} vs ${topSummary.shikonaB}` : 'Waiting for rivalry data'}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Closest sampled series</div>
              <div className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
                {closestSummary ? `${Math.round(closestSummary.closeness * 100)}%` : '—'}
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                {closestSummary ? `${closestSummary.shikonaA} vs ${closestSummary.shikonaB}` : 'Waiting for rivalry data'}
              </div>
            </div>
          </div>
        )}
      </PremiumPageHeader>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="font-display text-lg font-bold tracking-tight text-white">Sampled rivalry coverage</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Rivalry Explorer builds a high-signal sample from the current published rikishi directory, then loads head-to-head
              series from that sample. It is useful for discovery, but it should not be treated as an exhaustive historical rivalry index.
            </p>
          </div>
          <div className="text-sm text-zinc-500 lg:text-right">
            <div>{candidatePool.length} rikishi sampled</div>
            <div>{candidatePairs.length} pair lookups attempted</div>
          </div>
        </div>
      </section>

      <PremiumSectionShell
        title="Find a rivalry worth opening"
        subtitle="This explorer is built from current published head-to-head results across a sampled directory set. It is a browse surface, not a claim that every historical rivalry is already indexed."
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by shikona, rikishi id, or heya..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              aria-label="Search rivalries"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleSort}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-white/[0.15] hover:text-white"
              aria-label={`Sort by ${sortBy === 'matches' ? 'closeness' : 'total matches'}`}
            >
              <ArrowUpDown className="h-4 w-4" />
              Sort: {sortBy === 'matches' ? 'Most matches' : 'Closest record'}
            </button>
            <button
              type="button"
              onClick={() => setViewBy('all')}
              className={`inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm transition-colors ${
                viewBy === 'all'
                  ? 'border-red-600/50 bg-red-950/20 text-white'
                  : 'border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:border-white/[0.15] hover:text-white'
              }`}
            >
              All rivalries
            </button>
            <button
              type="button"
              onClick={() => setViewBy('balanced')}
              className={`inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm transition-colors ${
                viewBy === 'balanced'
                  ? 'border-amber-600/50 bg-amber-950/20 text-white'
                  : 'border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:border-white/[0.15] hover:text-white'
              }`}
            >
              Balanced
            </button>
            <button
              type="button"
              onClick={() => setViewBy('decisive')}
              className={`inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm transition-colors ${
                viewBy === 'decisive'
                  ? 'border-red-600/50 bg-red-950/20 text-white'
                  : 'border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:border-white/[0.15] hover:text-white'
              }`}
            >
              Decisive
            </button>
          </div>
        </div>
      </PremiumSectionShell>

      {h2hQuery.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      )}

      {!h2hQuery.isLoading && allRivalries.length > 0 && (
        <PremiumSectionShell
          title="Featured rivalry entry points"
          subtitle="These are good places to start if you want one high-volume series, one balanced matchup, and one clearly tilted head-to-head from the current sample."
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <FeaturedRivalryCard title="Most contested" rivalry={featured.mostContested} />
            <FeaturedRivalryCard title="Closest visible series" rivalry={featured.closest} />
            <FeaturedRivalryCard title="Most decisive visible edge" rivalry={featured.decisive} />
          </div>
        </PremiumSectionShell>
      )}

      {!h2hQuery.isLoading && (
        <PremiumSectionShell
          title="All sampled rivalries"
          subtitle="Open a row to move into the full comparison view. The summary badge tells you whether the series is balanced, tilted, or firmly controlled by one side."
          trailing={<PremiumBadge variant="zinc">{rivalries.length} shown</PremiumBadge>}
        >
          {rivalries.length === 0 ? (
            <EmptyState
              message="No rivalries match the current filters."
              description="Try a different shikona, clear the search term, or switch back to all rivalries in the current sample."
              onReset={searchTerm || viewBy !== 'all' || sortBy !== 'matches'
                ? () => {
                    setSearchTerm('');
                    setViewBy('all');
                    setSortBy('matches');
                  }
                : undefined}
              suggestions={[
                ['Browse rikishi', '/rikishi'],
                ['Open homepage', '/'],
              ]}
            />
          ) : (
            <div className="space-y-3">
              {rivalries.map((rivalry) => (
                <RivalryRow key={`${rivalry.rikishiA}-${rivalry.rikishiB}`} rivalry={rivalry} />
              ))}
            </div>
          )}
        </PremiumSectionShell>
      )}

      {!h2hQuery.isLoading && allRivalries.length > 0 && (
        <PremiumSectionShell
          title="How to use this feature well"
          subtitle="Treat rivalry discovery as a browse-first database surface. Start with a series that looks interesting here, then open the comparison page to inspect head-to-head totals, recent form, and style context."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Trophy className="h-4 w-4 text-red-400" />
                Most contested
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Start here when you want a rivalry that accumulated real volume, not just a short hot streak.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Scale className="h-4 w-4 text-amber-400" />
                Balanced
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Use the balanced filter when you want tightly contested series where the next bout could plausibly flip the story.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Flame className="h-4 w-4 text-red-400" />
                Decisive
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Use decisive rivalries when you want to inspect one rikishi&apos;s control over a long-running head-to-head.
              </p>
            </div>
          </div>
        </PremiumSectionShell>
      )}

      {!h2hQuery.isLoading && allRivalries.length === 0 && (
        <EmptyState
          message="No rivalry data is visible yet."
          description="The explorer could not build any 5+ bout rivalries from the current published head-to-head surface."
          suggestions={[
            ['Browse rikishi', '/rikishi'],
            ['Go home', '/'],
          ]}
        />
      )}
    </div>
  );
}
