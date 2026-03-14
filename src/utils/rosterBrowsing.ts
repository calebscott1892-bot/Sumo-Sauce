import {
  getVerifiedProfileForIdentity,
  type VerifiedProfile,
} from '@/data/verifiedProfiles';
import type { RikishiDirectoryEntry } from '../../shared/api/v1';

export const ROSTER_DIVISION_ORDER = [
  'Makuuchi',
  'Juryo',
  'Makushita',
  'Sandanme',
  'Jonidan',
  'Jonokuchi',
  'Historical',
] as const;

export type RosterDivision = (typeof ROSTER_DIVISION_ORDER)[number];

export type EnrichedRosterEntry = RikishiDirectoryEntry & {
  profile: VerifiedProfile | null;
  heyaName: string | null;
  stableSlug: string | null;
  division: string | null;
  activeRoster: boolean;
  sekitori: boolean;
  lastVerifiedBasho: string | null;
};

export type StableSummary = {
  name: string;
  slug: string;
  members: EnrichedRosterEntry[];
  activeMembers: EnrichedRosterEntry[];
  activeCount: number;
  totalTrackedCount: number;
  sekitoriCount: number;
  divisions: string[];
  divisionCounts: Record<string, number>;
  latestVerifiedBasho: string | null;
  verifiedCount: number;
};

export type DivisionRosterSummary = {
  division: RosterDivision;
  activeCount: number;
  stableCount: number;
  entries: EnrichedRosterEntry[];
};

function divisionSortIndex(division: string | null | undefined): number {
  if (!division) return Number.MAX_SAFE_INTEGER;
  const index = ROSTER_DIVISION_ORDER.indexOf(division as RosterDivision);
  return index === -1 ? Number.MAX_SAFE_INTEGER - 1 : index;
}

function normalizeStableName(value: string | null | undefined): string | null {
  const next = String(value || '').trim();
  return next || null;
}

export function stableSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function enrichRosterEntry(entry: RikishiDirectoryEntry): EnrichedRosterEntry {
  const profile = getVerifiedProfileForIdentity(entry.rikishiId, entry.shikona);
  const heyaName = normalizeStableName(profile?.heya ?? entry.heya);
  const division = profile?.division ?? null;

  return {
    ...entry,
    profile,
    heyaName,
    stableSlug: heyaName ? stableSlug(heyaName) : null,
    division,
    activeRoster: profile?.status === 'active',
    sekitori: division === 'Makuuchi' || division === 'Juryo',
    lastVerifiedBasho: profile?.lastVerifiedBasho ?? null,
  };
}

export function compareRosterEntries(a: EnrichedRosterEntry, b: EnrichedRosterEntry): number {
  return (
    divisionSortIndex(a.division) - divisionSortIndex(b.division) ||
    a.shikona.localeCompare(b.shikona) ||
    a.rikishiId.localeCompare(b.rikishiId)
  );
}

export function buildRosterEntries(directory: readonly RikishiDirectoryEntry[]): EnrichedRosterEntry[] {
  return directory.map(enrichRosterEntry);
}

export function buildStableSummaries(directory: readonly RikishiDirectoryEntry[]): StableSummary[] {
  const grouped = new Map<string, EnrichedRosterEntry[]>();

  for (const entry of buildRosterEntries(directory)) {
    if (!entry.heyaName) continue;
    const existing = grouped.get(entry.heyaName) ?? [];
    existing.push(entry);
    grouped.set(entry.heyaName, existing);
  }

  return [...grouped.entries()]
    .map(([name, entries]) => {
      const members = [...entries].sort(compareRosterEntries);
      const activeMembers = members.filter((entry) => entry.activeRoster);
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
        sekitoriCount: activeMembers.filter((entry) => entry.sekitori).length,
        divisions: Object.keys(divisionCounts).sort((a, b) => divisionSortIndex(a) - divisionSortIndex(b)),
        divisionCounts,
        latestVerifiedBasho,
        verifiedCount: members.filter((entry) => entry.profile?.profileConfidence === 'verified').length,
      };
    })
    .sort((a, b) =>
      b.activeCount - a.activeCount ||
      b.sekitoriCount - a.sekitoriCount ||
      a.name.localeCompare(b.name),
    );
}

export function findStableSummaryBySlug(
  directory: readonly RikishiDirectoryEntry[],
  slug: string,
): StableSummary | null {
  return buildStableSummaries(directory).find((stable) => stable.slug === slug) ?? null;
}

export function buildDivisionRosterSummaries(
  directory: readonly RikishiDirectoryEntry[],
): DivisionRosterSummary[] {
  const grouped = new Map<RosterDivision, EnrichedRosterEntry[]>();

  for (const entry of buildRosterEntries(directory)) {
    if (!entry.activeRoster || !entry.division) continue;
    if (!ROSTER_DIVISION_ORDER.includes(entry.division as RosterDivision)) continue;
    const division = entry.division as RosterDivision;
    const existing = grouped.get(division) ?? [];
    existing.push(entry);
    grouped.set(division, existing);
  }

  return ROSTER_DIVISION_ORDER
    .filter((division) => division !== 'Historical')
    .map((division) => {
      const entries = [...(grouped.get(division) ?? [])].sort(compareRosterEntries);
      return {
        division,
        activeCount: entries.length,
        stableCount: new Set(entries.map((entry) => entry.heyaName).filter(Boolean)).size,
        entries,
      };
    });
}

export function getStablemates(
  directory: readonly RikishiDirectoryEntry[],
  stableName: string | null | undefined,
  currentRikishiId: string,
  limit = 6,
): EnrichedRosterEntry[] {
  if (!stableName) return [];

  return buildRosterEntries(directory)
    .filter((entry) => entry.heyaName === stableName && entry.rikishiId !== currentRikishiId)
    .sort(compareRosterEntries)
    .slice(0, limit);
}
