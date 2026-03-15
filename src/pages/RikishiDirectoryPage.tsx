import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpDown, Building2, Layers3, Search, Users } from 'lucide-react';
import StableSummaryCard from '@/components/stables/StableSummaryCard';
import RikishiDiscoveryRow from '@/components/search/RikishiDiscoveryRow';
import EmptyState from '@/components/ui/EmptyState';
import PageMeta from '@/components/ui/PageMeta';
import { PremiumBadge, PremiumPageHeader, PremiumSectionShell } from '@/components/ui/premium';
import { trackDirectoryView } from '@/utils/analytics';
import {
  buildPublishedDivisionSummaries,
  buildPublishedStableSummaries,
  getPublishedProfileEntries,
  type PublishedProfileEntry,
} from '@/utils/publishedProfileBrowsing';

type SortKey = 'shikona' | 'heya' | 'id';
type SortDir = 'asc' | 'desc';

export default function RikishiDirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    trackDirectoryView();
  }, []);

  const directory = useMemo(() => getPublishedProfileEntries(), []);
  const stableSummaries = useMemo(() => buildPublishedStableSummaries(directory), [directory]);
  const divisionSummaries = useMemo(() => buildPublishedDivisionSummaries(directory), [directory]);

  const shikonaFilter = searchParams.get('q') ?? '';
  const heyaFilter = searchParams.get('heya') ?? '';
  const divisionFilter = searchParams.get('division') ?? '';
  const rosterFilter = searchParams.get('roster') === 'active' ? 'active' : 'all';
  const sortKey = (searchParams.get('sort') as SortKey) || 'shikona';
  const sortDir = (searchParams.get('dir') as SortDir) || 'asc';

  const heyaOptions = useMemo(() => stableSummaries.map((stable) => stable.name), [stableSummaries]);
  const featuredStables = useMemo(() => stableSummaries.slice(0, 4), [stableSummaries]);
  const activeRosterCount = useMemo(
    () => divisionSummaries.reduce((sum, division) => sum + division.activeCount, 0),
    [divisionSummaries],
  );
  const routeableCount = useMemo(
    () => directory.filter((entry) => entry.routeable).length,
    [directory],
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

  const filtered = useMemo(() => {
    const normalizedQuery = shikonaFilter.trim().toLowerCase();

    return directory.filter((entry) => {
      if (normalizedQuery) {
        const matchesQuery =
          entry.shikona.toLowerCase().includes(normalizedQuery) ||
          String(entry.rikishiId ?? '').toLowerCase().includes(normalizedQuery) ||
          String(entry.heya ?? '').toLowerCase().includes(normalizedQuery) ||
          String(entry.division ?? '').toLowerCase().includes(normalizedQuery);
        if (!matchesQuery) return false;
      }

      if (heyaFilter && entry.heya !== heyaFilter) return false;
      if (divisionFilter && entry.division !== divisionFilter) return false;
      if (rosterFilter === 'active' && entry.status !== 'active') return false;
      return true;
    });
  }, [directory, divisionFilter, heyaFilter, rosterFilter, shikonaFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case 'heya':
          comparison = String(a.heya ?? '').localeCompare(String(b.heya ?? ''));
          break;
        case 'id':
          comparison = String(a.rikishiId ?? '').localeCompare(String(b.rikishiId ?? ''));
          break;
        case 'shikona':
        default:
          comparison = a.shikona.localeCompare(b.shikona);
          break;
      }

      if (comparison !== 0) {
        return sortDir === 'asc' ? comparison : -comparison;
      }

      return a.shikona.localeCompare(b.shikona);
    });
    return copy;
  }, [filtered, sortDir, sortKey]);

  const hasFilters = Boolean(
    shikonaFilter.trim() ||
    heyaFilter ||
    divisionFilter ||
    rosterFilter !== 'all',
  );

  return (
    <div data-testid="rikishi-directory-page" className="mx-auto max-w-6xl space-y-5 p-4 text-zinc-200 sm:space-y-6 sm:p-6">
      <PageMeta
        title="Sumo Sauce - Rikishi Directory"
        description={`Browse ${directory.length.toLocaleString()} published rikishi profiles in Sumo Sauce, including profile-only entries that do not yet have a routeable career page.`}
      />

      <PremiumPageHeader
        accentLabel="RIKISHI DIRECTORY"
        title="Rikishi Directory"
        subtitle="Browse the full published profile layer, then open routeable career pages where they exist."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Rikishi Directory' },
        ]}
        actions={(
          <Link
            to="/stables"
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            Browse stables -&gt;
          </Link>
        )}
      >
        <div className="flex flex-col gap-2 text-sm text-zinc-400 sm:flex-row sm:flex-wrap sm:gap-4">
          <span><span className="font-semibold text-white">{directory.length.toLocaleString()}</span> published profiles</span>
          <span><span className="font-semibold text-white">{routeableCount.toLocaleString()}</span> routeable rikishi pages</span>
          <span><span className="font-semibold text-white">{activeRosterCount}</span> active roster entries</span>
          <span><span className="font-semibold text-white">{stableSummaries.length}</span> stables tracked</span>
        </div>
      </PremiumPageHeader>

      <PremiumSectionShell
        title="Roster entry points"
        subtitle="Start from a division, a stable cluster, or the full active roster without losing sight of profile-only entries."
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {divisionSummaries.map((division) => (
              <button
                key={division.division}
                type="button"
                onClick={() => {
                  updateParam('division', division.division);
                  updateParam('roster', 'active');
                }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:border-red-600/40 hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <PremiumBadge variant={division.division === 'Makuuchi' ? 'red' : division.division === 'Juryo' ? 'blue' : division.division === 'Makushita' ? 'amber' : 'zinc'}>
                    {division.division}
                  </PremiumBadge>
                  <span className="text-xs text-zinc-500">{division.routeableCount} routeable</span>
                </div>
                <div className="mt-3 font-display text-2xl font-bold tracking-tight text-white">{division.activeCount}</div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  Active published profiles in the current {division.division} layer.
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Users className="h-4 w-4 text-red-400" />
                Published profile lens
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                This directory now shows the full published profile dataset. Routeable rikishi pages still open when a matching rikishi id exists.
              </p>
              <button
                type="button"
                onClick={() => updateParam('roster', rosterFilter === 'active' ? '' : 'active')}
                className="mt-4 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
              >
                {rosterFilter === 'active' ? 'Show full published directory' : 'Browse active roster only'}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {featuredStables.map((stable) => (
                <StableSummaryCard key={stable.slug} stable={stable} compact />
              ))}
            </div>
          </div>
        </div>
      </PremiumSectionShell>

      <PremiumSectionShell
        title="Filter the directory"
        subtitle="Search by shikona, rikishi id, heya, or division, then narrow by stable and active-roster context."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm xl:col-span-2">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <Search className="h-3.5 w-3.5" />
              Search name / id / heya
            </span>
            <input
              type="text"
              value={shikonaFilter}
              onChange={(event) => updateParam('q', event.target.value)}
              placeholder="Hakuho, 3312, Kise..."
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-red-600/50"
            />
          </label>

          <label className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <Building2 className="h-3.5 w-3.5" />
              Heya
            </span>
            <select
              value={heyaFilter}
              onChange={(event) => updateParam('heya', event.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-600/50"
            >
              <option value="">All heya</option>
              {heyaOptions.map((heya) => (
                <option key={heya} value={heya}>{heya}</option>
              ))}
            </select>
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
              <option value="">All divisions</option>
              {divisionSummaries.map((division) => (
                <option key={division.division} value={division.division}>{division.division}</option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort
            </span>
            <div className="grid gap-2">
              <select
                value={sortKey}
                onChange={(event) => updateParam('sort', event.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-600/50"
              >
                <option value="shikona">Shikona</option>
                <option value="heya">Heya</option>
                <option value="id">ID</option>
              </select>
              <button
                type="button"
                onClick={() => updateParam('dir', sortDir === 'asc' ? 'desc' : 'asc')}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
              >
                {sortDir === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <PremiumBadge variant={rosterFilter === 'active' ? 'amber' : 'zinc'}>
            {rosterFilter === 'active' ? 'Active roster context' : 'Full published directory'}
          </PremiumBadge>
          <button
            type="button"
            onClick={() => updateParam('roster', rosterFilter === 'active' ? '' : 'active')}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          >
            {rosterFilter === 'active' ? 'Show full directory' : 'Active roster only'}
          </button>
          {hasFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              Reset filters
            </button>
          ) : null}
        </div>
      </PremiumSectionShell>

      <PremiumSectionShell
        title="Roster results"
        subtitle="Published profiles render here directly, even when a routeable career page is not yet available."
        trailing={<PremiumBadge variant="zinc">{sorted.length} shown</PremiumBadge>}
      >
        {sorted.length === 0 ? (
          <EmptyState
            message="No rikishi match the current filters"
            description="Try a different shikona, heya, or division filter, or switch back to the full published directory."
            onReset={resetFilters}
            suggestions={[['Browse stables', '/stables'], ['Browse basho', '/basho']]}
          />
        ) : (
          <div className="space-y-2">
            {sorted.map((entry: PublishedProfileEntry) => (
              <RikishiDiscoveryRow key={entry.key} entry={entry} />
            ))}
          </div>
        )}
      </PremiumSectionShell>

      {featuredStables.length > 0 && (
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Stable browsing stays connected</div>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Use the stable directory when you want roster depth and heya context after finding a published profile here.
              </p>
            </div>
            <Link
              to="/stables"
              className="inline-flex items-center gap-1 text-sm font-medium text-red-400 transition-colors hover:text-red-300"
            >
              Open stable directory
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
