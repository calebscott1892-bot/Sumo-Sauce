import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trackBashoTimelineView } from '@/utils/analytics';
import { Calendar, Search, ChevronRight } from 'lucide-react';
import { recentBashoIds, parseBashoId, bashoTournamentName, bashoLabel, bashoDisplayName } from '@/utils/basho';
import PageMeta from '@/components/ui/PageMeta';

const ALL_BASHO_IDS = recentBashoIds(300); // ~50 years of basho

type BashoGroup = {
  year: number;
  bashoIds: string[];
};

export default function BashoTimelinePage() {
  useEffect(() => { trackBashoTimelineView(); }, []);

  const [searchTerm, setSearchTerm] = useState('');

  const groups = useMemo((): BashoGroup[] => {
    let ids = ALL_BASHO_IDS;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      ids = ids.filter((id) => {
        const parsed = parseBashoId(id);
        if (!parsed) return false;
        return (
          id.includes(q) ||
          bashoTournamentName(id).toLowerCase().includes(q) ||
          bashoLabel(id).toLowerCase().includes(q) ||
          String(parsed.year).includes(q)
        );
      });
    }

    const byYear = new Map<number, string[]>();
    for (const id of ids) {
      const parsed = parseBashoId(id);
      if (!parsed) continue;
      const arr = byYear.get(parsed.year) ?? [];
      arr.push(id);
      byYear.set(parsed.year, arr);
    }

    return Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, bashoIds]) => ({ year, bashoIds }));
  }, [searchTerm]);

  const tournamentColor = (month: number): string => {
    switch (month) {
      case 1: return 'border-blue-600 bg-blue-950/30';
      case 3: return 'border-pink-600 bg-pink-950/30';
      case 5: return 'border-emerald-600 bg-emerald-950/30';
      case 7: return 'border-amber-600 bg-amber-950/30';
      case 9: return 'border-orange-600 bg-orange-950/30';
      case 11: return 'border-purple-600 bg-purple-950/30';
      default: return 'border-zinc-700 bg-zinc-950';
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title="SumoWatch — Basho Timeline"
        description="Browse the complete history of professional sumo tournaments in chronological order."
      />

      <nav className="mb-2 flex items-center gap-1 text-sm text-zinc-400">
        <Link className="text-red-400 hover:text-red-300" to="/">Home</Link>
        <span>/</span>
        <span className="text-zinc-200">Timeline</span>
      </nav>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-7 w-7 text-blue-500" />
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">BASHO TIMELINE</span>
            <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl">Basho Timeline</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Browse every grand sumo tournament chronologically — {ALL_BASHO_IDS.length} basho across {groups.length} years.
            </p>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by year, name (Hatsu, Natsu…), or month…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          aria-label="Search tournaments"
        />
      </div>

      {/* Timeline */}
      {groups.length === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <Calendar className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">No tournaments match your search.</p>
        </div>
      )}

      <div className="relative space-y-8">
        {/* Vertical timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-800 hidden sm:block" aria-hidden="true" />

        {groups.map((group) => (
          <div key={group.year} className="relative">
            {/* Year marker */}
            <div className="flex items-center gap-3 mb-3 sm:pl-10">
              <div className="hidden sm:flex absolute left-0 h-9 w-9 items-center justify-center rounded-full border-2 border-red-600 bg-zinc-950 text-xs font-bold text-red-400">
                {String(group.year).slice(2)}
              </div>
              <h2 className="text-xl font-bold text-white">{group.year}</h2>
              <span className="text-xs text-zinc-500">{group.bashoIds.length} basho</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 sm:pl-10">
              {group.bashoIds.map((id) => {
                const parsed = parseBashoId(id);
                const month = parsed?.month ?? 0;
                const name = bashoTournamentName(id);
                const label = bashoLabel(id);

                return (
                  <Link
                    key={id}
                    to={`/basho/${encodeURIComponent(id)}`}
                    className={`group flex items-center justify-between rounded-lg border p-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${tournamentColor(month)}`}
                  >
                    <div>
                      <div className="font-semibold text-zinc-100">{name}</div>
                      <div className="text-xs text-zinc-400">{label}</div>
                      <div className="text-[10px] text-zinc-600 font-mono">{id}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-zinc-300" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
