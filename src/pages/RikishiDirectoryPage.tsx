import { useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowUpDown } from 'lucide-react';
import { getRikishiDirectory } from '@/pages/rikishi/api';
import EmptyState from '@/components/ui/EmptyState';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import { PremiumPageHeader } from '@/components/ui/premium';
import type { RikishiDirectoryEntry } from '../../shared/api/v1';

type SortKey = 'shikona' | 'heya' | 'id';
type SortDir = 'asc' | 'desc';

/**
 * Full rikishi directory — searchable, sortable table with URL-persisted filters.
 */
export default function RikishiDirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const shikonaFilter = searchParams.get('q') ?? '';
  const heyaFilter = searchParams.get('heya') ?? '';
  const sortKey = (searchParams.get('sort') as SortKey) || 'shikona';
  const sortDir = (searchParams.get('dir') as SortDir) || 'asc';

  const { data: directory = [], isLoading, error } = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000,
  });

  function updateParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    }, { replace: true });
  }

  function resetFilters() {
    setSearchParams({}, { replace: true });
  }

  // Derive unique heya values
  const heyaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const entry of directory) {
      if (entry.heya) set.add(entry.heya);
    }
    return [...set].sort();
  }, [directory]);

  // Filter
  const filtered = useMemo(() => {
    let result = directory;
    if (shikonaFilter.trim()) {
      const q = shikonaFilter.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.shikona.toLowerCase().includes(q) ||
          e.rikishiId.toLowerCase().includes(q),
      );
    }
    if (heyaFilter) {
      result = result.filter((e) => e.heya === heyaFilter);
    }
    return result;
  }, [directory, shikonaFilter, heyaFilter]);

  // Sort
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'shikona':
          cmp = a.shikona.localeCompare(b.shikona);
          break;
        case 'heya':
          cmp = (a.heya ?? '').localeCompare(b.heya ?? '');
          break;
        case 'id':
          cmp = a.rikishiId.localeCompare(b.rikishiId);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const handleSort = useCallback(
    (key: SortKey) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (sortKey === key) {
          next.set('dir', sortDir === 'asc' ? 'desc' : 'asc');
        } else {
          next.set('sort', key);
          next.set('dir', 'asc');
        }
        return next;
      }, { replace: true });
    },
    [sortKey, sortDir, setSearchParams],
  );

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const hasFilters = Boolean(shikonaFilter.trim() || heyaFilter);

  if (error) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  return (
    <div data-testid="rikishi-directory-page" className="stagger-children mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title="Sumo Sauce — Rikishi Directory"
        description={`Browse all ${directory.length.toLocaleString()} rikishi in the Sumo Sauce dataset. Search by name, filter by heya, and sort.`}
      />

      <PremiumPageHeader
        accentLabel="RIKISHI DIRECTORY"
        title="Rikishi Directory"
        subtitle={`${directory.length.toLocaleString()} wrestlers in the dataset`}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Rikishi Directory' },
        ]}
      />

      {/* Filters */}
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="dir-search" className="mb-1 block text-xs text-zinc-400">
              <Search className="mr-1 inline h-3 w-3" />
              Search name / id
            </label>
            <input
              id="dir-search"
              type="text"
              value={shikonaFilter}
              onChange={(e) => updateParam('q', e.target.value)}
              placeholder="Hakuho, rks_0001…"
              className="w-52 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="dir-heya" className="mb-1 block text-xs text-zinc-400">
              Heya
            </label>
            <select
              id="dir-heya"
              value={heyaFilter}
              onChange={(e) => updateParam('heya', e.target.value)}
              className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
            >
              <option value="">All heya</option>
              {heyaOptions.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>{sorted.length} of {directory.length}</span>
              <button
                type="button"
                onClick={resetFilters}
                className="text-red-400 hover:text-red-300"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          message="No rikishi match your search"
          description="Try a different name, id, or heya filter."
          onReset={resetFilters}
          suggestions={[['← Back to Home', '/'], ['Browse basho', '/basho']]}
        />
      ) : (
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm">
                <tr className="border-b border-white/[0.04] text-left text-zinc-400">
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-2 hover:text-zinc-200"
                    onClick={() => handleSort('shikona')}
                  >
                    <ArrowUpDown className="mr-1 inline h-3 w-3" />
                    Shikona{sortIndicator('shikona')}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-2 hover:text-zinc-200"
                    onClick={() => handleSort('heya')}
                  >
                    Heya{sortIndicator('heya')}
                  </th>
                  <th
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-2 hover:text-zinc-200"
                    onClick={() => handleSort('id')}
                  >
                    ID{sortIndicator('id')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry) => (
                  <tr
                    key={entry.rikishiId}
                    className="border-b border-white/[0.04] text-zinc-200 transition-colors hover:bg-white/[0.04] cursor-pointer"
                  >
                    <td className="whitespace-nowrap px-3 py-2">
                      <Link
                        to={`/rikishi/${encodeURIComponent(entry.rikishiId)}`}
                        className="font-medium text-red-300 hover:text-red-200"
                      >
                        {entry.shikona}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-zinc-400">{entry.heya ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500">{entry.rikishiId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Showing {sorted.length} of {directory.length} rikishi
          </div>
        </section>
      )}
    </div>
  );
}
