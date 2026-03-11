import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trackRivalryExplorerView } from '@/utils/analytics';
import { useQuery } from '@tanstack/react-query';
import { Swords, Search, ArrowUpDown, Trophy } from 'lucide-react';
import { getRikishiDirectory, getHeadToHead } from '@/pages/rikishi/api';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import { PremiumPageHeader } from '@/components/ui/premium';

type RivalryEntry = {
  rikishiA: string;
  shikonaA: string;
  rikishiB: string;
  shikonaB: string;
  totalMatches: number;
  aWins: number;
  bWins: number;
  closeness: number; // 1.0 = perfectly even
};

const WELL_KNOWN_PAIRS: [string, string][] = [];

/** Generate candidate pairs from the directory. */
function topPairs(directory: { rikishiId: string; shikona: string }[], maxPairs: number): [string, string, string, string][] {
  // Pick top N rikishi by ID prefix (lower IDs = higher profile)
  const top = directory.slice(0, Math.min(directory.length, 80));
  const pairs: [string, string, string, string][] = [];
  for (let i = 0; i < top.length && pairs.length < maxPairs; i++) {
    for (let j = i + 1; j < top.length && pairs.length < maxPairs; j++) {
      pairs.push([top[i].rikishiId, top[i].shikona, top[j].rikishiId, top[j].shikona]);
    }
  }
  return pairs;
}

type SortKey = 'matches' | 'closeness';

export default function RivalryExplorerPage() {
  useEffect(() => { trackRivalryExplorerView(); }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('matches');

  const directoryQuery = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000,
  });

  const candidatePairs = useMemo(() => {
    if (!directoryQuery.data?.length) return [];
    return topPairs(directoryQuery.data, 120);
  }, [directoryQuery.data]);

  const h2hQuery = useQuery({
    queryKey: ['rivalry-explorer-h2h', candidatePairs.map((p) => `${p[0]}:${p[2]}`).join(',')],
    enabled: candidatePairs.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<RivalryEntry[]> => {
      const results: RivalryEntry[] = [];
      // Fetch in small batches to avoid flooding
      const batchSize = 15;
      for (let i = 0; i < candidatePairs.length; i += batchSize) {
        const batch = candidatePairs.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async ([idA, nameA, idB, nameB]) => {
            try {
              const h2h = await getHeadToHead(idA, idB);
              if (h2h.totalMatches < 5) return null;
              const maxWins = Math.max(h2h.rikishiAWins, h2h.rikishiBWins);
              const closeness = h2h.totalMatches > 0
                ? 1 - Math.abs(h2h.rikishiAWins - h2h.rikishiBWins) / h2h.totalMatches
                : 0;
              return {
                rikishiA: idA,
                shikonaA: nameA,
                rikishiB: idB,
                shikonaB: nameB,
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

  const rivalries = useMemo(() => {
    let list = h2hQuery.data ?? [];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.shikonaA.toLowerCase().includes(q) ||
          r.shikonaB.toLowerCase().includes(q) ||
          r.rikishiA.toLowerCase().includes(q) ||
          r.rikishiB.toLowerCase().includes(q),
      );
    }

    list = [...list].sort((a, b) => {
      if (sortBy === 'closeness') return b.closeness - a.closeness || b.totalMatches - a.totalMatches;
      return b.totalMatches - a.totalMatches || b.closeness - a.closeness;
    });

    return list;
  }, [h2hQuery.data, searchTerm, sortBy]);

  const toggleSort = useCallback(() => {
    setSortBy((prev) => (prev === 'matches' ? 'closeness' : 'matches'));
  }, []);

  if (directoryQuery.error || h2hQuery.error) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  return (
    <div className="stagger-children mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title="Sumo Sauce — Rivalry Explorer"
        description="Explore the greatest rivalries in professional sumo. Search and compare head-to-head records."
      />

      <PremiumPageHeader
        accentLabel="HEAD TO HEAD"
        title="Rivalry Explorer"
        subtitle="Discover the most contested head-to-head matchups in sumo history."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Rivalries' },
        ]}
      />

      {/* Controls */}
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search rikishi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              aria-label="Search rivalries"
            />
          </div>
          <button
            type="button"
            onClick={toggleSort}
            className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-white/[0.15] hover:text-white"
            aria-label={`Sort by ${sortBy === 'matches' ? 'closeness' : 'total matches'}`}
          >
            <ArrowUpDown className="h-4 w-4" />
            Sort: {sortBy === 'matches' ? 'Most matches' : 'Closest record'}
          </button>
        </div>
      </section>

      {/* Loading */}
      {h2hQuery.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      )}

      {/* Results */}
      {!h2hQuery.isLoading && (
        <div className="space-y-3">
          {rivalries.length === 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
              <Swords className="mx-auto h-10 w-10 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-400">
                {searchTerm ? 'No rivalries match your search.' : 'No rivalry data available.'}
              </p>
            </div>
          )}

          {rivalries.map((rivalry) => {
            const aWinPct = rivalry.totalMatches > 0 ? (rivalry.aWins / rivalry.totalMatches) * 100 : 50;
            const isEven = rivalry.aWins === rivalry.bWins;
            return (
              <Link
                key={`${rivalry.rikishiA}-${rivalry.rikishiB}`}
                to={`/compare/${encodeURIComponent(rivalry.rikishiA)}/${encodeURIComponent(rivalry.rikishiB)}`}
                className="block rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-red-600 hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-100">{rivalry.shikonaA}</div>
                    <div className="text-xs text-zinc-500">{rivalry.rikishiA}</div>
                  </div>

                  <div className="mx-4 flex flex-col items-center">
                    <div className="flex items-center gap-2 text-lg font-bold">
                      <span className={rivalry.aWins > rivalry.bWins ? 'text-emerald-400' : 'text-zinc-300'}>
                        {rivalry.aWins}
                      </span>
                      <span className="text-zinc-600">-</span>
                      <span className={rivalry.bWins > rivalry.aWins ? 'text-emerald-400' : 'text-zinc-300'}>
                        {rivalry.bWins}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500">{rivalry.totalMatches} bouts</div>
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <div className="font-semibold text-zinc-100">{rivalry.shikonaB}</div>
                    <div className="text-xs text-zinc-500">{rivalry.rikishiB}</div>
                  </div>
                </div>

                {/* Split bar */}
                <div className="mt-3 h-2 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
                  <div
                    className="h-2 rounded-l-full bg-red-500 transition-all"
                    style={{ width: `${aWinPct}%` }}
                  />
                  <div
                    className="h-2 rounded-r-full bg-blue-500 transition-all"
                    style={{ width: `${100 - aWinPct}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-zinc-500">
                  <span>{aWinPct.toFixed(0)}%</span>
                  <span className={isEven ? 'text-amber-400' : 'text-zinc-500'}>
                    {isEven ? 'Even' : rivalry.aWins > rivalry.bWins ? `${rivalry.shikonaA} leads` : `${rivalry.shikonaB} leads`}
                  </span>
                  <span>{(100 - aWinPct).toFixed(0)}%</span>
                </div>
              </Link>
            );
          })}

          {rivalries.length > 0 && (
            <p className="text-center text-xs text-zinc-600 pt-2">
              Showing {rivalries.length} rivalries (5+ bouts)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
