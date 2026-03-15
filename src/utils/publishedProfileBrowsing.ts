import { getAllVerifiedProfiles, type VerifiedProfile } from '@/data/verifiedProfiles';

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

export function searchPublishedProfileEntries(
  entries: readonly PublishedProfileEntry[],
  rawQuery: string,
  limit: number,
): PublishedProfileEntry[] {
  const query = normalize(rawQuery);
  if (!query) return entries.slice(0, limit);

  return entries
    .map((entry) => {
      const score = Math.min(
        scoreField(normalize(entry.shikona), query, 0, 1, 3),
        scoreField(normalize(entry.rikishiId), query, 0, 1, 2),
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
