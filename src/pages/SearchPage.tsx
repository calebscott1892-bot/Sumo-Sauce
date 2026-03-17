import { useState, useMemo, useCallback, useEffect, useDeferredValue, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Search, Users, X } from 'lucide-react';
import { recentBashoIds, bashoDisplayName, bashoTournamentName } from '@/utils/basho';
import { getPublishedProfileEntries, resolvePublishedProfileEntries, searchPublishedProfileEntries } from '@/utils/publishedProfileBrowsing';
import { getRikishiDirectory } from '@/pages/rikishi/api';
import { trackSearchPageView, trackSearchUsage } from '@/utils/analytics';
import PageMeta from '@/components/ui/PageMeta';
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
  const lastTrackedQueryRef = useRef('');
  const urlQuery = searchParams.get('q') ?? '';
  const urlTab = (searchParams.get('tab') as Tab) || 'rikishi';
  const normalizedUrlTab = TABS.some((t) => t.key === urlTab) ? urlTab : 'rikishi';

  const [query, setQuery] = useState(urlQuery);
  const [tab, setTab] = useState<Tab>(normalizedUrlTab);
  const deferredQuery = useDeferredValue(query);
  const publishedEntries = useMemo(() => getPublishedProfileEntries(), []);
  const domainDirectoryQuery = useQuery({
    queryKey: ['domain-rikishi-directory-for-search-page'],
    queryFn: getRikishiDirectory,
    staleTime: 5 * 60 * 1000,
  });
  const directory = useMemo(
    () => resolvePublishedProfileEntries(publishedEntries, domainDirectoryQuery.data ?? []),
    [publishedEntries, domainDirectoryQuery.data],
  );

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

  const allBasho = useMemo(() => recentBashoIds(200), []);
  const lowerQuery = deferredQuery.toLowerCase().trim();
  const isRefreshingResults = query !== deferredQuery;

  const rikishiResults = useMemo(
    () => searchPublishedProfileEntries(directory, lowerQuery, lowerQuery ? 40 : 24),
    [directory, lowerQuery],
  );

  const bashoResults = useMemo(() => {
    if (!lowerQuery) return allBasho.slice(0, 24);
    return allBasho
      .filter((id) => {
        const display = bashoDisplayName(id).toLowerCase();
        const tournament = bashoTournamentName(id).toLowerCase();
        return id.includes(lowerQuery) || display.includes(lowerQuery) || tournament.includes(lowerQuery);
      })
      .slice(0, 36);
  }, [allBasho, lowerQuery]);

  const resultCounts = {
    rikishi: rikishiResults.length,
    basho: bashoResults.length,
  };

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  useEffect(() => {
    trackSearchPageView();
  }, []);

  useEffect(() => {
    const trimmed = lowerQuery.trim();
    if (trimmed.length < 2) return;

    const trackingKey = `${tab}:${trimmed}:${resultCounts[tab]}`;
    if (lastTrackedQueryRef.current === trackingKey) return;

    trackSearchUsage(trimmed, resultCounts[tab], { surface: 'search_page', tab });
    lastTrackedQueryRef.current = trackingKey;
  }, [lowerQuery, resultCounts, tab]);

  return (
    <div className="stagger-children mx-auto max-w-6xl space-y-5 p-4 text-zinc-200 sm:space-y-6 sm:p-6">
      <PageMeta
        title="Sumo Sauce - Search"
        description="Search published rikishi profiles and basho in Sumo Sauce."
      />

      <PremiumPageHeader
        accentLabel="SEARCH"
        title="Search"
        subtitle="Search the published profile layer or jump into basho by tournament name or YYYYMM id."
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search rikishi, basho, or tournament names..."
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
            <h2 className="font-display text-base font-bold tracking-tight text-white">Published search index</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-400">
              Rikishi results come from the published profile dataset, so this search can render the same profile layer the homepage counts describe.
            </p>
          </div>
          <div className="text-left text-xs text-zinc-500 sm:text-right">
            <div>{directory.length.toLocaleString()} published profiles</div>
            <div>{directory.filter((entry) => entry.routeable).length.toLocaleString()} routeable rikishi pages</div>
            <div>{allBasho.length.toLocaleString()} basho available</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-1 sm:border-b sm:border-white/[0.04]">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors sm:justify-start sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 ${
              tab === item.key
                ? 'border-red-500 bg-red-950/18 text-white sm:bg-transparent'
                : 'border-white/[0.08] text-zinc-400 hover:text-zinc-200 sm:border-transparent'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            <span className="ml-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400">
              {resultCounts[item.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <span className="leading-relaxed">
          {tab === 'rikishi'
            ? 'Routeable results open wrestler pages. Profile-only results stay visible here and in the directory until routeable career data is available.'
            : 'Browse basho by tournament name, calendar label, or raw YYYYMM id.'}
        </span>
        <span>{isRefreshingResults ? 'Refreshing results...' : `Showing ${resultCounts[tab]} result${resultCounts[tab] === 1 ? '' : 's'}`}</span>
      </div>

      {tab === 'rikishi' && (
        <section aria-busy={isRefreshingResults}>
          {rikishiResults.length === 0 ? (
            <EmptyState
              message="No rikishi found"
              description={
                query
                  ? `No published profiles match "${query}". Try a different shikona, heya, division, or rikishi id.`
                  : 'Search by shikona, rikishi id, heya, or division to explore the published profile directory.'
              }
              onReset={handleClear}
              suggestions={[['Browse full directory', '/rikishi']]}
            />
          ) : (
            <div className="space-y-2">
              {rikishiResults.map((entry) => (
                <RikishiDiscoveryRow key={entry.key} entry={entry} />
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
              {bashoResults.map((id) => (
                <Link
                  key={id}
                  to={`/basho/${encodeURIComponent(id)}`}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:border-blue-600 hover:bg-white/[0.06]/80 sm:p-4"
                >
                  <div className="font-semibold text-zinc-100">{bashoDisplayName(id)}</div>
                  <div className="mt-1 text-xs text-zinc-500">{id}</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
