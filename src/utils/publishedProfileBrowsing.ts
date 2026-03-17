import { getAllVerifiedProfiles, type VerifiedProfile } from '@/data/verifiedProfiles';
import type { RikishiDirectoryEntry } from '../../shared/api/v1';

const DIVISION_ORDER = [
  'Makuuchi',
  'Juryo',
  'Makushita',
  'Sandanme',
  'Jonidan',
  'Jonokuchi',
  'Historical',
] as const;

const DIVISION_INDEX = new Map(DIVISION_ORDER.map((division, index) => [division, index]));

export type PublishedProfileEntry = {
  key: string;
  rikishiId: string | null;
  shikona: string;
  heya: string | null;
  division: string | null;
  status: string;
  lastVerifiedBasho: string | null;
  routeable: boolean;
  profile: VerifiedProfile;
};

export type ResolvedPublishedProfileEntry = PublishedProfileEntry & {
  routeableDomainId: string | null;
  routeable: boolean;
};

export type PublishedDivisionSummary = {
  division: (typeof DIVISION_ORDER)[number];
  activeCount: number;
  routeableCount: number;
  entries: PublishedProfileEntry[];
};

export type PublishedStableSummary = {
  name: string;
  slug: string;
  members: PublishedProfileEntry[];
  activeMembers: PublishedProfileEntry[];
  activeCount: number;
  totalTrackedCount: number;
  sekitoriCount: number;
  divisions: string[];
  divisionCounts: Record<string, number>;
  latestVerifiedBasho: string | null;
  verifiedCount: number;
  routeableCount: number;
};

function normalize(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function stripDiacritics(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeShikonaKey(value: string | null | undefined): string {
  return stripDiacritics(normalize(value))
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeyaKey(value: string | null | undefined): string {
  return stripDiacritics(normalize(value))
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function primaryShikonaKey(value: string | null | undefined): string {
  const normalized = normalizeShikonaKey(value);
  if (!normalized) return '';
  return normalized.split(/[\s-]+/)[0] ?? '';
}

function stableSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function divisionSortIndex(division: string | null | undefined): number {
  if (!division) return Number.MAX_SAFE_INTEGER;
  return DIVISION_INDEX.get(division as (typeof DIVISION_ORDER)[number]) ?? Number.MAX_SAFE_INTEGER - 1;
}

function entrySort(a: PublishedProfileEntry, b: PublishedProfileEntry): number {
  return (
    divisionSortIndex(a.division) - divisionSortIndex(b.division) ||
    a.shikona.localeCompare(b.shikona) ||
    (a.heya ?? '').localeCompare(b.heya ?? '') ||
    String(a.rikishiId ?? '').localeCompare(String(b.rikishiId ?? ''))
  );
}

function scoreField(value: string, query: string, exact: number, prefix: number, partial: number): number {
  if (!value) return Number.POSITIVE_INFINITY;
  if (value === query) return exact;
  if (value.startsWith(query)) return prefix;
  if (value.includes(query)) return partial;
  return Number.POSITIVE_INFINITY;
}

const publishedEntries = [...getAllVerifiedProfiles()]
  .map((profile): PublishedProfileEntry => ({
    key: profile.rikishiId ? `id:${profile.rikishiId}` : `profile:${normalize(profile.shikona)}`,
    rikishiId: profile.rikishiId,
    shikona: profile.shikona,
    heya: profile.heya,
    division: profile.division,
    status: profile.status,
    lastVerifiedBasho: profile.lastVerifiedBasho,
    routeable: Boolean(profile.rikishiId),
    profile,
  }))
  .sort(entrySort);

export function getPublishedProfileEntries(): readonly PublishedProfileEntry[] {
  return publishedEntries;
}

export function findPublishedProfileEntryByRikishiId(
  rikishiId: string | null | undefined,
  entries: readonly PublishedProfileEntry[] = publishedEntries,
): PublishedProfileEntry | null {
  const normalizedId = String(rikishiId || '').trim();
  if (!normalizedId) return null;
  return entries.find((entry) => entry.rikishiId === normalizedId) ?? null;
}

export function searchPublishedProfileEntries(
  entries: readonly ResolvedPublishedProfileEntry[],
  rawQuery: string,
  limit: number,
): ResolvedPublishedProfileEntry[] {
  const query = normalize(rawQuery);
  if (!query) return entries.slice(0, limit);

  return entries
    .map((entry) => {
      const score = Math.min(
        scoreField(normalize(entry.shikona), query, 0, 1, 3),
        scoreField(primaryShikonaKey(entry.shikona), query, 0, 1, 2),
        scoreField(normalize(entry.rikishiId), query, 0, 1, 2),
        scoreField(normalize(entry.routeableDomainId), query, 0, 1, 2),
        scoreField(normalize(entry.heya), query, 2, 4, 5),
        scoreField(normalize(entry.division), query, 3, 5, 6),
      );

      return { entry, score };
    })
    .filter((result) => Number.isFinite(result.score))
    .sort(
      (a, b) =>
        a.score - b.score ||
        Number(b.entry.routeable) - Number(a.entry.routeable) ||
        entrySort(a.entry, b.entry),
    )
    .slice(0, limit)
    .map((result) => result.entry);
}

type DomainResolverMaps = {
  byDomainId: Map<string, RikishiDirectoryEntry>;
  byFullNameAndHeya: Map<string, RikishiDirectoryEntry[]>;
  byShortNameAndHeya: Map<string, RikishiDirectoryEntry[]>;
  byFullName: Map<string, RikishiDirectoryEntry[]>;
  byShortName: Map<string, RikishiDirectoryEntry[]>;
};

function buildDomainResolverMaps(domainDirectory: readonly RikishiDirectoryEntry[]): DomainResolverMaps {
  const byDomainId = new Map<string, RikishiDirectoryEntry>();
  const byFullNameAndHeya = new Map<string, RikishiDirectoryEntry[]>();
  const byShortNameAndHeya = new Map<string, RikishiDirectoryEntry[]>();
  const byFullName = new Map<string, RikishiDirectoryEntry[]>();
  const byShortName = new Map<string, RikishiDirectoryEntry[]>();

  for (const row of domainDirectory) {
    const domainId = String(row.rikishiId || '').trim();
    if (!domainId) continue;

    byDomainId.set(domainId, row);

    const fullNameKey = normalizeShikonaKey(row.shikona);
    const shortNameKey = primaryShikonaKey(row.shikona);
    const heyaKey = normalizeHeyaKey(row.heya);
    if (!fullNameKey) continue;

    const fullBucket = byFullName.get(fullNameKey) ?? [];
    fullBucket.push(row);
    byFullName.set(fullNameKey, fullBucket);

    if (shortNameKey) {
      const shortBucket = byShortName.get(shortNameKey) ?? [];
      shortBucket.push(row);
      byShortName.set(shortNameKey, shortBucket);
    }

    if (heyaKey) {
      const fullKey = `${fullNameKey}::${heyaKey}`;
      const fullHeyaBucket = byFullNameAndHeya.get(fullKey) ?? [];
      fullHeyaBucket.push(row);
      byFullNameAndHeya.set(fullKey, fullHeyaBucket);

      if (shortNameKey) {
        const shortKey = `${shortNameKey}::${heyaKey}`;
        const shortHeyaBucket = byShortNameAndHeya.get(shortKey) ?? [];
        shortHeyaBucket.push(row);
        byShortNameAndHeya.set(shortKey, shortHeyaBucket);
      }
    }
  }

  return {
    byDomainId,
    byFullNameAndHeya,
    byShortNameAndHeya,
    byFullName,
    byShortName,
  };
}

function resolveDomainIdForEntry(
  entry: PublishedProfileEntry,
  maps: DomainResolverMaps,
): string | null {
  const publishedId = String(entry.rikishiId || '').trim();
  const fullShikonaKey = normalizeShikonaKey(entry.shikona);
  const shortShikonaKey = primaryShikonaKey(entry.shikona);
  const heyaKey = normalizeHeyaKey(entry.heya);

  // If a published ID already exists in live domain IDs, use it directly.
  if (publishedId && maps.byDomainId.has(publishedId)) {
    return publishedId;
  }

  if (!fullShikonaKey) return null;

  // Prefer full shikona + heya exact matches when available.
  if (heyaKey) {
    const strictMatches = maps.byFullNameAndHeya.get(`${fullShikonaKey}::${heyaKey}`) ?? [];
    if (strictMatches.length === 1) return strictMatches[0].rikishiId;

    if (shortShikonaKey) {
      const shortStrictMatches = maps.byShortNameAndHeya.get(`${shortShikonaKey}::${heyaKey}`) ?? [];
      if (shortStrictMatches.length === 1) return shortStrictMatches[0].rikishiId;
    }
  }

  // Fallback to unique full shikona-only match.
  const fullNameMatches = maps.byFullName.get(fullShikonaKey) ?? [];
  if (fullNameMatches.length === 1) {
    return fullNameMatches[0].rikishiId;
  }

  // Final fallback: unique short shikona-only match.
  if (shortShikonaKey) {
    const shortNameMatches = maps.byShortName.get(shortShikonaKey) ?? [];
    if (shortNameMatches.length === 1) {
      return shortNameMatches[0].rikishiId;
    }
  }

  return null;
}

export function resolvePublishedProfileEntries(
  entries: readonly PublishedProfileEntry[],
  domainDirectory: readonly RikishiDirectoryEntry[],
): ResolvedPublishedProfileEntry[] {
  const maps = buildDomainResolverMaps(domainDirectory);

  return entries.map((entry) => {
    const routeableDomainId = resolveDomainIdForEntry(entry, maps);
    return {
      ...entry,
      routeableDomainId,
      routeable: Boolean(routeableDomainId),
    };
  });
}

export function findResolvedPublishedProfileEntryByAnyId(
  id: string | null | undefined,
  entries: readonly ResolvedPublishedProfileEntry[],
): ResolvedPublishedProfileEntry | null {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return null;

  return entries.find(
    (entry) => entry.rikishiId === normalizedId || entry.routeableDomainId === normalizedId,
  ) ?? null;
}

export function buildPublishedDivisionSummaries(
  entries: readonly PublishedProfileEntry[] = publishedEntries,
): PublishedDivisionSummary[] {
  return DIVISION_ORDER
    .filter((division) => division !== 'Historical')
    .map((division) => {
      const divisionEntries = entries
        .filter((entry) => entry.status === 'active' && entry.division === division)
        .sort(entrySort);

      return {
        division,
        activeCount: divisionEntries.length,
        routeableCount: divisionEntries.filter((entry) => entry.routeable).length,
        entries: divisionEntries,
      };
    });
}

export function buildPublishedStableSummaries(
  entries: readonly PublishedProfileEntry[] = publishedEntries,
): PublishedStableSummary[] {
  const grouped = new Map<string, PublishedProfileEntry[]>();

  for (const entry of entries) {
    if (!entry.heya) continue;
    const existing = grouped.get(entry.heya) ?? [];
    existing.push(entry);
    grouped.set(entry.heya, existing);
  }

  return [...grouped.entries()]
    .map(([name, groupedEntries]) => {
      const members = [...groupedEntries].sort(entrySort);
      const activeMembers = members.filter((entry) => entry.status === 'active');
      const divisionCounts: Record<string, number> = {};
      let latestVerifiedBasho: string | null = null;

      for (const entry of members) {
        if (entry.lastVerifiedBasho && (!latestVerifiedBasho || entry.lastVerifiedBasho > latestVerifiedBasho)) {
          latestVerifiedBasho = entry.lastVerifiedBasho;
        }
      }

      for (const entry of activeMembers) {
        if (!entry.division) continue;
        divisionCounts[entry.division] = (divisionCounts[entry.division] || 0) + 1;
      }

      return {
        name,
        slug: stableSlug(name),
        members,
        activeMembers,
        activeCount: activeMembers.length,
        totalTrackedCount: members.length,
        sekitoriCount: activeMembers.filter((entry) => entry.division === 'Makuuchi' || entry.division === 'Juryo').length,
        divisions: Object.keys(divisionCounts).sort((a, b) => divisionSortIndex(a) - divisionSortIndex(b)),
        divisionCounts,
        latestVerifiedBasho,
        verifiedCount: members.filter((entry) => entry.profile.profileConfidence === 'verified').length,
        routeableCount: members.filter((entry) => entry.routeable).length,
      };
    })
    .sort((a, b) =>
      b.activeCount - a.activeCount ||
      b.sekitoriCount - a.sekitoriCount ||
      a.name.localeCompare(b.name),
    );
}

export function findPublishedStableSummaryBySlug(
  slug: string,
  entries: readonly PublishedProfileEntry[] = publishedEntries,
): PublishedStableSummary | null {
  const normalizedSlug = stableSlug(slug);
  return buildPublishedStableSummaries(entries).find((stable) => stable.slug === normalizedSlug) ?? null;
}
