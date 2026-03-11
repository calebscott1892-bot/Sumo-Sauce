import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, Search, Filter } from 'lucide-react';
import {
  recentBashoIds,
  bashoTournamentName,
  bashoLabel,
  parseBashoId,
} from '@/utils/basho';
import EmptyState from '@/components/ui/EmptyState';
import PageMeta from '@/components/ui/PageMeta';

type BashoEntry = {
  bashoId: string;
  year: number;
  month: number;
  tournament: string;
  label: string;
};

const TOURNAMENT_MONTHS: Record<number, string> = {
  1: 'Hatsu (January)',
  3: 'Haru (March)',
  5: 'Natsu (May)',
  7: 'Nagoya (July)',
  9: 'Aki (September)',
  11: 'Kyushu (November)',
};

/**
 * Historical basho browser — searchable grid of all basho in the dataset.
 * Filters by year and tournament month, state preserved in URL query params.
 */
export default function BashoBrowserPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const yearFilter = searchParams.get('year') ?? '';
  const monthFilter = searchParams.get('month') ?? '';
  const searchQuery = searchParams.get('q') ?? '';

  // Generate the full list of basho (2000–present ≈ 145+)
  const allBasho = useMemo<BashoEntry[]>(() => {
    const ids = recentBashoIds(300); // generous upper bound
    return ids.map((id) => {
      const parsed = parseBashoId(id)!;
      return {
        bashoId: id,
        year: parsed.year,
        month: parsed.month,
        tournament: bashoTournamentName(id),
        label: bashoLabel(id),
      };
    });
  }, []);

  // Derive available years for the filter
  const availableYears = useMemo(() => {
    const years = [...new Set(allBasho.map((b) => b.year))];
    return years.sort((a, b) => b - a);
  }, [allBasho]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = allBasho;
    if (yearFilter) {
      const y = Number(yearFilter);
      result = result.filter((b) => b.year === y);
    }
    if (monthFilter) {
      const m = Number(monthFilter);
      result = result.filter((b) => b.month === m);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (b) =>
          b.bashoId.includes(q) ||
          b.tournament.toLowerCase().includes(q) ||
          b.label.toLowerCase().includes(q) ||
          String(b.year).includes(q),
      );
    }
    return result;
  }, [allBasho, yearFilter, monthFilter, searchQuery]);

  const hasFilters = Boolean(yearFilter || monthFilter || searchQuery.trim());

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

  // Group by year for visual structure
  const grouped = useMemo(() => {
    const map = new Map<number, BashoEntry[]>();
    for (const b of filtered) {
      const arr = map.get(b.year) || [];
      arr.push(b);
      map.set(b.year, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  return (
    <div data-testid="basho-browser-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title="SumoWatch — Basho Browser"
        description="Browse all historical sumo basho tournaments from 2000 to present. Search and filter by year, tournament name, or month."
      />

      {/* Breadcrumbs */}
      <nav className="mb-2 flex items-center gap-1 text-sm text-zinc-400">
        <Link className="text-red-400 hover:text-red-300" to="/">Home</Link>
        <span>/</span>
        <span className="text-zinc-200">Basho Browser</span>
      </nav>

      {/* Hero */}
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-7 w-7 text-red-500" />
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">TOURNAMENT BROWSER</span>
            <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl">Basho Browser</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {allBasho.length} tournaments from 2000 to present
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="basho-search" className="mb-1 block text-xs text-zinc-400">
              <Search className="mr-1 inline h-3 w-3" />
              Search
            </label>
            <input
              id="basho-search"
              type="text"
              value={searchQuery}
              onChange={(e) => updateParam('q', e.target.value)}
              placeholder="Hatsu, 2020, 202301…"
              className="w-48 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="basho-year" className="mb-1 block text-xs text-zinc-400">
              <Filter className="mr-1 inline h-3 w-3" />
              Year
            </label>
            <select
              id="basho-year"
              value={yearFilter}
              onChange={(e) => updateParam('year', e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
            >
              <option value="">All years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="basho-month" className="mb-1 block text-xs text-zinc-400">
              Tournament
            </label>
            <select
              id="basho-month"
              value={monthFilter}
              onChange={(e) => updateParam('month', e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
            >
              <option value="">All tournaments</option>
              {Object.entries(TOURNAMENT_MONTHS).map(([m, name]) => (
                <option key={m} value={m}>{name}</option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>{filtered.length} of {allBasho.length}</span>
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

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          message="No basho match your filters"
          description="Try adjusting the year, tournament, or search query."
          onReset={resetFilters}
          suggestions={[['← Back to Home', '/']]}
        />
      ) : (
        grouped.map(([year, bashos]) => (
          <section key={year}>
            <h2 className="mb-3 text-lg font-bold text-white">{year}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {bashos.map((b) => (
                <Link
                  key={b.bashoId}
                  to={`/basho/${b.bashoId}`}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-red-600 hover:bg-red-950/10 hover:shadow-lg hover:shadow-red-950/10"
                >
                  <div className="text-base font-bold text-white transition-colors group-hover:text-red-300">
                    {b.tournament}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{b.label}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-zinc-600">{b.bashoId}</div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
