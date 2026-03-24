import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Layers3, Search, ShieldCheck, Users } from 'lucide-react';
import StableSummaryCard from '@/components/stables/StableSummaryCard';
import EmptyState from '@/components/ui/EmptyState';
import PageMeta from '@/components/ui/PageMeta';
import { PremiumBadge, PremiumPageHeader, PremiumSectionShell } from '@/components/ui/premium';
import { buildPublishedStableSummaries, getPublishedProfileEntries } from '@/utils/publishedProfileBrowsing';

export default function StablesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const divisionFilter = searchParams.get('division') ?? '';

  const stableSummaries = useMemo(
    () => buildPublishedStableSummaries(getPublishedProfileEntries()),
    [],
  );
  const divisionOptions = useMemo(
    () => [...new Set(stableSummaries.flatMap((stable) => stable.divisions))],
    [stableSummaries],
  );

  const filteredStables = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return stableSummaries.filter((stable) => {
      if (normalizedQuery && !stable.name.toLowerCase().includes(normalizedQuery)) {
        return false;
      }
      if (divisionFilter && !stable.divisions.includes(divisionFilter)) {
        return false;
      }
      return true;
    });
  }, [divisionFilter, query, stableSummaries]);

  const topCurrentStables = useMemo(() => filteredStables.slice(0, 6), [filteredStables]);
  const activeRosterCount = useMemo(
    () => stableSummaries.reduce((sum, stable) => sum + stable.activeCount, 0),
    [stableSummaries],
  );
  const sekitoriCount = useMemo(
    () => stableSummaries.reduce((sum, stable) => sum + stable.sekitoriCount, 0),
    [stableSummaries],
  );

  function updateParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }

  function resetFilters() {
    setSearchParams({}, { replace: true });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 text-zinc-200 sm:space-y-7 sm:p-6">
      <PageMeta
        title="Sumo Sauce — Stable Directory"
        description="Browse heya across the Sumo Sauce roster layer, compare active roster depth, and open stable pages."
      />

      <PremiumPageHeader
        accentLabel="HEYA DIRECTORY"
        title="Stable Directory"
        subtitle="Browse active roster depth by heya, then move into stable-level rosters and roster clusters."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Stables' },
        ]}
        actions={(
          <Link
            to="/rikishi?roster=active"
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Active roster →
          </Link>
        )}
      >
        <div className="flex flex-col gap-2 text-sm text-zinc-400 sm:flex-row sm:flex-wrap sm:gap-4">
          <span><span className="font-semibold text-white">{stableSummaries.length}</span> stables tracked</span>
          <span><span className="font-semibold text-white">{activeRosterCount}</span> active rikishi</span>
          <span><span className="font-semibold text-white">{sekitoriCount}</span> sekitori in stable view</span>
        </div>
      </PremiumPageHeader>

      <PremiumSectionShell
        title="Find a stable"
        subtitle="Stable pages are built from the published profile layer, with active roster depth and trust context where that coverage is available."
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
          <label className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <Search className="h-3.5 w-3.5" />
              Stable search
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => updateParam('q', event.target.value)}
              placeholder="Search by heya name..."
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-red-600/50"
            />
          </label>

          <label className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <Layers3 className="h-3.5 w-3.5" />
              Division
            </span>
            <select
              value={divisionFilter}
              onChange={(event) => updateParam('division', event.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-600/50"
            >
              <option value="">All roster layers</option>
              {divisionOptions.map((division) => (
                <option key={division} value={division}>{division}</option>
              ))}
            </select>
          </label>
        </div>

        {(query.trim() || divisionFilter) ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <PremiumBadge variant="zinc">{filteredStables.length} stables shown</PremiumBadge>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              Reset filters
            </button>
          </div>
        ) : null}
      </PremiumSectionShell>

      {topCurrentStables.length > 0 && (
        <PremiumSectionShell
          title="Largest active stables"
          subtitle="A fast way to start stable-level browsing from the deepest current rosters."
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {topCurrentStables.map((stable) => (
              <StableSummaryCard key={stable.slug} stable={stable} />
            ))}
          </div>
        </PremiumSectionShell>
      )}

      <PremiumSectionShell
        title="All tracked stables"
        subtitle="Browse stable pages for active roster depth, division mix, and direct paths back into rikishi and basho browsing."
      >
        {filteredStables.length === 0 ? (
          <EmptyState
            message="No stables match the current filters"
            description="Try a different heya name or clear the roster layer filter."
            onReset={resetFilters}
            suggestions={[['Browse rikishi', '/rikishi']]}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredStables.map((stable) => (
              <StableSummaryCard key={stable.slug} stable={stable} compact />
            ))}
          </div>
        )}
      </PremiumSectionShell>

      {stableSummaries.length > 0 && (
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Building2 className="h-4 w-4 text-red-400" />
                Stable-first browsing
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Use stable pages when you want roster depth, not just a single profile lookup.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Users className="h-4 w-4 text-red-400" />
                Active roster context
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Stable counts reflect active roster matches in the verified trust layer where that context is published.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-red-400" />
                Trust-aware depth
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Stable browsing keeps the same verified image and trust rules used across the rest of Sumo Sauce.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
