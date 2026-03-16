import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Layers3, ShieldCheck, Users } from 'lucide-react';
import { formatVerifiedBasho } from '@/data/verifiedProfiles';
import RikishiDiscoveryRow from '@/components/search/RikishiDiscoveryRow';
import EmptyState from '@/components/ui/EmptyState';
import ErrorCard from '@/components/ui/ErrorCard';
import PageMeta from '@/components/ui/PageMeta';
import { PremiumBadge, PremiumPageHeader, PremiumSectionShell } from '@/components/ui/premium';
import { latestBashoId } from '@/utils/basho';
import { isFavoriteStable, toggleFavoriteStable } from '@/utils/favorites';
import { findPublishedStableSummaryBySlug, getPublishedProfileEntries, type PublishedProfileEntry } from '@/utils/publishedProfileBrowsing';

export default function StablePage() {
  const params = useParams();
  const slug = String(params.slug || '').trim();
  const [isSaved, setIsSaved] = useState(() => isFavoriteStable(slug));

  const publishedEntries = useMemo(() => getPublishedProfileEntries(), []);
  const stable = useMemo(
    () => (slug ? findPublishedStableSummaryBySlug(slug, publishedEntries) : null),
    [publishedEntries, slug],
  );

  const latestTournamentId = latestBashoId();
  const groupedRoster = useMemo(() => {
    const grouped = new Map<string, PublishedProfileEntry[]>();
    if (!stable) return grouped;
    for (const entry of stable.activeMembers) {
      const key = entry.division ?? 'Unpublished';
      const existing = grouped.get(key) ?? [];
      existing.push(entry);
      grouped.set(key, existing);
    }
    return grouped;
  }, [stable]);

  const otherTrackedMembers = useMemo(
    () => stable?.members.filter((entry) => entry.status !== 'active') ?? [],
    [stable],
  );

  useEffect(() => {
    setIsSaved(isFavoriteStable(slug));
  }, [slug]);

  if (!slug) {
    return <ErrorCard code="INVALID_INPUT" message="Invalid stable slug." backTo="/stables" backLabel="← Stable directory" />;
  }

  if (!stable) {
    return <ErrorCard code="NOT_FOUND" message="Stable not found." backTo="/stables" backLabel="← Stable directory" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 text-zinc-200 sm:space-y-7 sm:p-6">
      <PageMeta
        title={`SumoWatch — ${stable.name} stable`}
        description={`Browse ${stable.name} stable on SumoWatch: active roster depth, division mix, and stable-linked rikishi browsing.`}
      />

      <PremiumPageHeader
        accentLabel="HEYA PROFILE"
        title={stable.name}
        subtitle={`${stable.activeCount} active rikishi · ${stable.sekitoriCount} sekitori`}
        badge="Stable roster"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Stables', to: '/stables' },
          { label: stable.name },
        ]}
        actions={(
          <>
            <Link
              to="/watchlist"
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              Watchlist
            </Link>
            <Link
              to={`/rikishi?heya=${encodeURIComponent(stable.name)}&roster=active`}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              Active roster →
            </Link>
            <Link
              to={`/rikishi?heya=${encodeURIComponent(stable.name)}`}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              All tracked members →
            </Link>
          </>
        )}
        favorite={{
          active: isSaved,
          onToggle: () => {
            toggleFavoriteStable(slug, `${stable.name} stable`);
            setIsSaved(!isSaved);
          },
          ariaLabel: isSaved ? `Remove ${stable.name} stable from watchlist` : `Save ${stable.name} stable to watchlist`,
        }}
      >
        <div className="flex flex-col gap-2 text-sm text-zinc-400 sm:flex-row sm:flex-wrap sm:gap-4">
          <span><span className="font-semibold text-white">{stable.totalTrackedCount}</span> tracked rikishi</span>
          <span><span className="font-semibold text-white">{stable.routeableCount}</span> routeable rikishi pages</span>
          <span><span className="font-semibold text-white">{stable.divisions.length}</span> roster layers represented</span>
          {stable.latestVerifiedBasho ? (
            <span>Latest verified context <span className="font-semibold text-white">{formatVerifiedBasho(stable.latestVerifiedBasho)}</span></span>
          ) : null}
        </div>
      </PremiumPageHeader>

      <PremiumSectionShell
        title="Stable overview"
        subtitle="A roster-first stable read, with the quickest paths back into rikishi and basho browsing."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Users className="h-4 w-4 text-red-400" />
              Active roster
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-white">{stable.activeCount}</p>
            <p className="mt-1 text-sm text-zinc-500">Active rikishi published in the trust layer for this stable.</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Layers3 className="h-4 w-4 text-red-400" />
              Division depth
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {stable.divisions.length > 0 ? (
                stable.divisions.map((division) => (
                  <PremiumBadge key={division} variant={division === 'Makuuchi' ? 'red' : division === 'Juryo' ? 'blue' : division === 'Makushita' ? 'amber' : 'zinc'}>
                    {division} {stable.divisionCounts[division] ?? 0}
                  </PremiumBadge>
                ))
              ) : (
                <PremiumBadge variant="zinc">Roster divisions unpublished</PremiumBadge>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-red-400" />
              Trust-linked coverage
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-white">{stable.verifiedCount}</p>
            <p className="mt-1 text-sm text-zinc-500">Tracked members with verified profile coverage in the trust layer.</p>
          </div>
        </div>
      </PremiumSectionShell>

      <PremiumSectionShell
        title="Active stable roster"
        subtitle="Grouped by current published division so the stable reads like a roster, not a list of names."
      >
        {stable.activeMembers.length === 0 ? (
          <EmptyState
            message="No active stable roster is published yet"
            description="Tracked members exist, but no active roster context is currently published for this stable."
            suggestions={[['Browse all stables', '/stables']]}
          />
        ) : (
          <div className="space-y-6">
            {stable.divisions.map((division) => {
              const entries = groupedRoster.get(division) ?? [];
              return (
                <section key={division} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold tracking-tight text-white">{division}</h2>
                      <p className="mt-1 text-sm text-zinc-500">{entries.length} active rikishi from this stable in the current roster layer.</p>
                    </div>
                    {latestTournamentId && division !== 'Historical' ? (
                      <Link
                        to={`/basho/${encodeURIComponent(latestTournamentId)}/${encodeURIComponent(division.toLowerCase())}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-red-400 transition-colors hover:text-red-300"
                      >
                        Latest {division} basho
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    {entries.map((entry) => (
                      <RikishiDiscoveryRow key={entry.rikishiId} entry={entry} compact />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </PremiumSectionShell>

      <PremiumSectionShell
        title="Browse from this stable"
        subtitle="Jump back into roster, division, and tournament pages without losing context."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link
            to={`/rikishi?heya=${encodeURIComponent(stable.name)}&roster=active`}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-red-600/40 hover:bg-white/[0.04]"
          >
            <div className="text-sm font-semibold text-white">Active stable roster</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">Open the directory with this stable and active roster context already applied.</p>
          </Link>

          <Link
            to={`/rikishi?heya=${encodeURIComponent(stable.name)}`}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-red-600/40 hover:bg-white/[0.04]"
          >
            <div className="text-sm font-semibold text-white">All tracked members</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">Switch back to the full routeable directory for every tracked member tied to this stable.</p>
          </Link>

          {latestTournamentId && stable.divisions[0] && stable.divisions[0] !== 'Historical' ? (
            <Link
              to={`/basho/${encodeURIComponent(latestTournamentId)}/${encodeURIComponent(stable.divisions[0].toLowerCase())}`}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-red-600/40 hover:bg-white/[0.04]"
            >
              <div className="text-sm font-semibold text-white">Latest lead division</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">Open the latest basho standings for this stable&apos;s highest current roster layer.</p>
            </Link>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-sm font-semibold text-white">Latest basho division</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">No current stable division context is published yet for a direct basho jump.</p>
            </div>
          )}

          <Link
            to="/stables"
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-red-600/40 hover:bg-white/[0.04]"
          >
            <div className="text-sm font-semibold text-white">Back to stable directory</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">Compare this heya against the rest of the stable layer.</p>
          </Link>
        </div>
      </PremiumSectionShell>

      {otherTrackedMembers.length > 0 && (
        <PremiumSectionShell
          title="Other tracked members"
          subtitle="These rikishi are tied to the same stable in the published profile layer but do not currently carry active roster context in the active snapshot."
        >
          <div className="grid gap-2">
            {otherTrackedMembers.map((entry) => (
              <RikishiDiscoveryRow key={entry.rikishiId} entry={entry} compact />
            ))}
          </div>
        </PremiumSectionShell>
      )}
    </div>
  );
}
