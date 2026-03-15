import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, Building2, Calendar, Swords, Trash2, Users } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import PageMeta from '@/components/ui/PageMeta';
import { PremiumBadge, PremiumPageHeader, PremiumSectionShell } from '@/components/ui/premium';
import {
  FAVORITES_CHANGED_EVENT,
  WATCHLIST_CHANGED_EVENT,
  getWatchlistEntries,
  removeWatchlistItem,
  type WatchlistEntry,
  type WatchlistType,
} from '@/utils/favorites';

const WATCHLIST_ORDER: WatchlistType[] = ['rikishi', 'rivalry', 'stable', 'basho'];

const TYPE_META: Record<
  WatchlistType,
  {
    label: string;
    detail: string;
    badge: 'red' | 'blue' | 'green' | 'amber' | 'zinc';
    browseLabel: string;
    browsePath: string;
    openLabel: string;
    icon: typeof Users;
  }
> = {
  rikishi: {
    label: 'Rikishi',
    detail: 'Profiles, records, and matchup context worth revisiting.',
    badge: 'red',
    browseLabel: 'Browse rikishi',
    browsePath: '/rikishi',
    openLabel: 'Open profile',
    icon: Users,
  },
  rivalry: {
    label: 'Rivalry',
    detail: 'Saved pair-level compare pages for head-to-head follow-up.',
    badge: 'green',
    browseLabel: 'Rivalry explorer',
    browsePath: '/rivalries',
    openLabel: 'Open comparison',
    icon: Swords,
  },
  stable: {
    label: 'Stable',
    detail: 'Heya pages saved for roster depth and stable-level browsing.',
    badge: 'amber',
    browseLabel: 'Browse stables',
    browsePath: '/stables',
    openLabel: 'Open stable',
    icon: Building2,
  },
  basho: {
    label: 'Basho',
    detail: 'Tournament surfaces saved for current or historical follow-up.',
    badge: 'blue',
    browseLabel: 'Basho browser',
    browsePath: '/basho',
    openLabel: 'Open basho',
    icon: Calendar,
  },
};

function formatSavedAt(savedAt: number): string {
  if (!savedAt) return 'Saved earlier on this device';
  return `Saved ${new Date(savedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function WatchlistEntryCard({
  entry,
  onRemove,
}: {
  entry: WatchlistEntry;
  onRemove: (type: WatchlistType, id: string) => void;
}) {
  const meta = TYPE_META[entry.type];
  const Icon = meta.icon;

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PremiumBadge variant={meta.badge}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </PremiumBadge>
            <span className="text-xs text-zinc-500">{formatSavedAt(entry.savedAt)}</span>
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white">{entry.label}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{meta.detail}</p>
        </div>

        <button
          type="button"
          onClick={() => onRemove(entry.type, entry.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
          aria-label={`Remove ${entry.label} from watchlist`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={entry.path}
          className="inline-flex items-center gap-1 rounded-full border border-red-600/35 bg-red-950/18 px-3 py-1.5 text-xs font-medium text-red-100 transition-colors hover:border-red-500/45 hover:text-white"
        >
          {meta.openLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          to={meta.browsePath}
          className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
        >
          {meta.browseLabel}
        </Link>
      </div>
    </article>
  );
}

export default function WatchlistPage() {
  const [entries, setEntries] = useState<WatchlistEntry[]>(() => getWatchlistEntries());

  useEffect(() => {
    const handler = () => setEntries(getWatchlistEntries());
    window.addEventListener(FAVORITES_CHANGED_EVENT, handler);
    window.addEventListener(WATCHLIST_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, handler);
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, handler);
    };
  }, []);

  const counts = useMemo(() => {
    return entries.reduce((acc, entry) => {
      acc[entry.type] = (acc[entry.type] ?? 0) + 1;
      return acc;
    }, {} as Partial<Record<WatchlistType, number>>);
  }, [entries]);

  const grouped = useMemo(() => {
    return WATCHLIST_ORDER.map((type) => ({
      type,
      entries: entries.filter((entry) => entry.type === type),
    })).filter((group) => group.entries.length > 0);
  }, [entries]);

  const savedTypeCount = grouped.length;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 text-zinc-200 sm:space-y-6 sm:p-6">
      <PageMeta
        title="SumoWatch - Watchlist"
        description="Local-first saved wrestlers, rivalries, stables, and basho surfaces on SumoWatch."
        noIndex
      />

      <PremiumPageHeader
        accentLabel="PERSONAL WATCHLIST"
        title="Saved Collections"
        subtitle="Keep the rikishi, rivalry, stable, and basho surfaces you want to revisit in one local-first research shelf."
        badge="Stored on this device"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Watchlist' },
        ]}
      >
        <div className="flex flex-col gap-2 text-sm text-zinc-400 sm:flex-row sm:flex-wrap sm:gap-4">
          <span><span className="font-semibold text-white">{entries.length}</span> saved items</span>
          <span><span className="font-semibold text-white">{savedTypeCount}</span> watchlist lanes in use</span>
          <span>Local-first only: nothing here touches the backend or canonical data.</span>
        </div>
      </PremiumPageHeader>

      <PremiumSectionShell
        title="Watchlist overview"
        subtitle="Use this page as a lightweight return point into the exact surfaces you care about most."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {WATCHLIST_ORDER.map((type) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            return (
              <div key={type} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon className="h-4 w-4 text-red-400" />
                  {meta.label}
                </div>
                <div className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
                  {counts[type] ?? 0}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">{meta.detail}</p>
              </div>
            );
          })}
        </div>
      </PremiumSectionShell>

      {entries.length === 0 ? (
        <EmptyState
          message="Your watchlist is empty"
          description="Save a rikishi, rivalry, stable, or basho page from the product header and it will appear here on this device."
          suggestions={[
            ['Browse rikishi', '/rikishi'],
            ['Rivalry explorer', '/rivalries'],
            ['Browse stables', '/stables'],
            ['Open basho browser', '/basho'],
          ]}
        />
      ) : (
        <PremiumSectionShell
          title="Saved items"
          subtitle="Grouped by surface so the watchlist feels like a working collection, not a flat dump of links."
          trailing={<PremiumBadge variant="zinc">{entries.length} total</PremiumBadge>}
        >
          <div className="space-y-6">
            {grouped.map((group) => {
              const meta = TYPE_META[group.type];
              return (
                <section key={group.type} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold tracking-tight text-white">{meta.label}</h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        {group.entries.length} saved {meta.label.toLowerCase()}{group.entries.length === 1 ? '' : 's'} ready to reopen.
                      </p>
                    </div>
                    <Link
                      to={meta.browsePath}
                      className="inline-flex items-center gap-1 text-sm font-medium text-red-400 transition-colors hover:text-red-300"
                    >
                      {meta.browseLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {group.entries.map((entry) => (
                      <WatchlistEntryCard
                        key={`${entry.type}-${entry.id}`}
                        entry={entry}
                        onRemove={(type, id) => removeWatchlistItem(type, id)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </PremiumSectionShell>
      )}

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Bookmark className="h-4 w-4 text-red-400" />
          How this watchlist works
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
          This is a local-first convenience layer. It helps you collect research targets and reopening paths without changing trust metadata, canonical profile JSON, or any backend state.
        </p>
      </section>
    </div>
  );
}
