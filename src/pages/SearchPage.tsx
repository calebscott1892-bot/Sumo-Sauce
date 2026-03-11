import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, Calendar, Swords, X } from 'lucide-react';
import { getRikishiDirectory } from '@/pages/rikishi/api';
import { recentBashoIds, bashoDisplayName, bashoTournamentName, parseBashoId } from '@/utils/basho';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import EmptyState from '@/components/ui/EmptyState';
import { PremiumPageHeader } from '@/components/ui/premium';

type Tab = 'rikishi' | 'basho';

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'rikishi', label: 'Rikishi', icon: Users },
  { key: 'basho', label: 'Basho', icon: Calendar },
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const initialTab = (searchParams.get('tab') as Tab) || 'rikishi';

  const [query, setQuery] = useState(initialQ);
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.key === initialTab) ? initialTab : 'rikishi');

  // Sync URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (tab !== 'rikishi') params.tab = tab;
    setSearchParams(params, { replace: true });
  }, [query, tab, setSearchParams]);

  const { data: directory = [], isLoading: dirLoading, error: dirError } = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000,
  });

  const allBasho = useMemo(() => recentBashoIds(200), []);

  const lowerQuery = query.toLowerCase().trim();

  const rikishiResults = useMemo(() => {
    if (!lowerQuery) return directory.slice(0, 50);
    return directory.filter(
      (r) =>
        r.shikona.toLowerCase().includes(lowerQuery) ||
        r.rikishiId.toLowerCase().includes(lowerQuery) ||
        (r.heya ?? '').toLowerCase().includes(lowerQuery),
    ).slice(0, 50);
  }, [directory, lowerQuery]);

  const bashoResults = useMemo(() => {
    if (!lowerQuery) return allBasho.slice(0, 50);
    return allBasho.filter((id) => {
      const display = bashoDisplayName(id).toLowerCase();
      const tournament = bashoTournamentName(id).toLowerCase();
      return id.includes(lowerQuery) || display.includes(lowerQuery) || tournament.includes(lowerQuery);
    }).slice(0, 50);
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
    <div className="stagger-children mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title="Sumo Sauce — Search"
        description="Search across rikishi, basho, and rivalries in the Sumo Sauce dataset."
      />

      <PremiumPageHeader
        accentLabel="SEARCH"
        title="Search"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Search' },
        ]}
      >
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rikishi, basho, tournaments…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2.5 pl-10 pr-10 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.04]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-red-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
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

      {/* Results */}
      {tab === 'rikishi' && (
        <section>
          {dirLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.02]" />
              ))}
            </div>
          ) : rikishiResults.length === 0 ? (
            <EmptyState
              message="No rikishi found"
              description={`No rikishi match "${query}".`}
              onReset={handleClear}
            />
          ) : (
            <div className="space-y-1">
              {rikishiResults.map((r) => (
                <Link
                  key={r.rikishiId}
                  to={`/rikishi/${encodeURIComponent(r.rikishiId)}`}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-red-600 hover:bg-white/[0.06]/80"
                >
                  <div>
                    <div className="font-semibold text-zinc-100">{r.shikona}</div>
                    <div className="text-xs text-zinc-500">
                      {r.rikishiId}
                      {r.heya && <span className="ml-2">· {r.heya}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600">→</span>
                </Link>
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
                const parsed = parseBashoId(id);
                return (
                  <Link
                    key={id}
                    to={`/basho/${encodeURIComponent(id)}`}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-blue-600 hover:bg-white/[0.06]/80"
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
