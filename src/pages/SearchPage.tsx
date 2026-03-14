import { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, Calendar, X } from 'lucide-react';
import { getRikishiDirectory } from '@/pages/rikishi/api';
import { recentBashoIds, bashoDisplayName, bashoTournamentName } from '@/utils/basho';
import { searchSortedRikishiDirectory, sortRikishiDirectory } from '@/utils/rikishiDiscovery';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import EmptyState from '@/components/ui/EmptyState';
import RikishiDiscoveryRow from '@/components/search/RikishiDiscoveryRow';
import { PremiumPageHeader } from '@/components/ui/premium';

type Tab = 'rikishi' | 'basho';

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'rikishi', label: 'Rikishi', icon: Users },
  { key: 'basho', label: 'Basho', icon: Calendar },
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const urlTab = (searchParams.get('tab') as Tab) || 'rikishi';
  const normalizedUrlTab = TABS.some((t) => t.key === urlTab) ? urlTab : 'rikishi';

  const [query, setQuery] = useState(urlQuery);
  const [tab, setTab] = useState<Tab>(normalizedUrlTab);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    setTab(normalizedUrlTab);
  }, [normalizedUrlTab]);

  useEffect(() => {
    const params: Record<string, string> = {};
    const nextQuery = deferredQuery.trim();
    if (nextQuery) params.q = nextQuery;
    if (tab !== 'rikishi') params.tab = tab;

    const nextParams = new URLSearchParams(params);
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [deferredQuery, tab, setSearchParams, searchParams]);

  const { data: directory = [], isLoading: dirLoading, error: dirError } = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000,
  });

  const allBasho = useMemo(() => recentBashoIds(200), []);
  const sortedDirectory = useMemo(() => sortRikishiDirectory(directory), [directory]);

  const lowerQuery = deferredQuery.toLowerCase().trim();
  const isRefreshingResults = query !== deferredQuery;

  const rikishiResults = useMemo(() => {
    return searchSortedRikishiDirectory(sortedDirectory, lowerQuery, lowerQuery ? 40 : 24);
  }, [sortedDirectory, lowerQuery]);

  const bashoResults = useMemo(() => {
    if (!lowerQuery) return allBasho.slice(0, 24);
    return allBasho.filter((id) => {
      const display = bashoDisplayName(id).toLowerCase();
      const tournament = bashoTournamentName(id).toLowerCase();
      return id.includes(lowerQuery) || display.includes(lowerQuery) || tournament.includes(lowerQuery);
    }).slice(0, 36);
  }, [allBasho, lowerQuery]);

  const resultCounts = {
    rikishi: rikishiResults.length,
    basho: bashoResults.length,
  };

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  if (dirError) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  return (
    <div className="stagger-children mx-auto max-w-6xl space-y-5 p-4 text-zinc-200 sm:space-y-6 sm:p-6">
      <PageMeta
        title="SumoWatch — Search"
        description="Search across rikishi, basho, and rivalries in the SumoWatch dataset."
      />

      <PremiumPageHeader
        accentLabel="SEARCH"
        title="Search"
        subtitle="Find rikishi and basho quickly, with trust-aware context kept visible but readable on smaller screens."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Search' },
        ]}
      >
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rikishi, basho, tournaments…"
            className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-10 pr-11 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </PremiumPageHeader>

      <section className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.035] to-white/[0.015] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold tracking-tight text-white">Universal discovery</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-400">
              Search by shikona, rikishi id, heya, basho id, or tournament name. Rikishi results include safe trust cues from the verified profile layer when that context exists.
            </p>
          </div>
          <div className="text-left text-xs text-zinc-500 sm:text-right">
            <div>{directory.length.toLocaleString()} rikishi indexed</div>
            <div>{allBasho.length.toLocaleString()} basho available</div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-1 sm:border-b sm:border-white/[0.04]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors sm:justify-start sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 ${
              tab === t.key
                ? 'border-red-500 bg-red-950/18 text-white sm:bg-transparent'
                : 'border-white/[0.08] text-zinc-400 hover:text-zinc-200 sm:border-transparent'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <span className="ml-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400">
              {resultCounts[t.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <span className="leading-relaxed">
          {tab === 'rikishi'
            ? 'Rikishi rows show division, heya, trust cues, and official photo availability when safely verified.'
            : 'Browse basho by tournament name, calendar label, or raw YYYYMM id.'}
        </span>
        <span>{isRefreshingResults ? 'Refreshing results…' : `Showing ${resultCounts[tab]} result${resultCounts[tab] === 1 ? '' : 's'}`}</span>
      </div>

      {/* Results */}
      {tab === 'rikishi' && (
        <section aria-busy={dirLoading || isRefreshingResults}>
          {dirLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
              ))}
            </div>
          ) : rikishiResults.length === 0 ? (
            <EmptyState
              message="No rikishi found"
              description={query ? `No rikishi match "${query}". Try a different shikona, heya, or rikishi id.` : 'Search by shikona, rikishi id, or heya to start exploring the rikishi directory.'}
              onReset={handleClear}
              suggestions={[['Browse full directory', '/rikishi']]}
            />
          ) : (
            <div className="space-y-2">
              {rikishiResults.map((r) => (
                <RikishiDiscoveryRow key={r.rikishiId} entry={r} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'basho' && (
        <section>
          {bashoResults.length === 0 ? (
            <EmptyState
              message="No basho found"
              description={`No basho match "${query}".`}
              onReset={handleClear}
            />
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {bashoResults.map((id) => {
                return (
                  <Link
                    key={id}
                    to={`/basho/${encodeURIComponent(id)}`}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:border-blue-600 hover:bg-white/[0.06]/80 sm:p-4"
                  >
                    <div className="font-semibold text-zinc-100">{bashoDisplayName(id)}</div>
                    <div className="mt-1 text-xs text-zinc-500">{id}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
