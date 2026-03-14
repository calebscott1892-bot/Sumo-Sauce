export type SortableRikishi = {
  rikishiId?: string;
  shikona?: string;
};

export type SortableBasho = {
  bashoId?: string;
};

export type SortableBanzukeEntry = {
  bashoId?: string;
  division?: string;
  rankValue?: number;
  side?: string;
  rikishiId?: string;
};

export type SortableBout = {
  bashoId?: string;
  division?: string;
  day?: number;
  boutNo?: number;
  eastRikishiId?: string;
  westRikishiId?: string;
};

export type SortableKimarite = {
  kimariteId?: string;
};

function asKey(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

// Deterministic ordering helper used across build + verify.
export function compareRikishi(a: SortableRikishi, b: SortableRikishi): number {
  return (
    asKey(a.rikishiId).localeCompare(asKey(b.rikishiId)) ||
    asKey(a.shikona).localeCompare(asKey(b.shikona))
  );
}

export function sortRikishi<T extends SortableRikishi>(rows: T[]): T[] {
  return [...rows].sort(compareRikishi);
}

export function compareBasho(a: SortableBasho, b: SortableBasho): number {
  return asKey(a.bashoId).localeCompare(asKey(b.bashoId));
}

export function sortBasho<T extends SortableBasho>(rows: T[]): T[] {
  return [...rows].sort(compareBasho);
}

export function compareBanzukeEntries(a: SortableBanzukeEntry, b: SortableBanzukeEntry): number {
  return (
    asKey(a.bashoId).localeCompare(asKey(b.bashoId)) ||
    asKey(a.division).localeCompare(asKey(b.division)) ||
    (Number(a.rankValue ?? Number.MAX_SAFE_INTEGER) - Number(b.rankValue ?? Number.MAX_SAFE_INTEGER)) ||
    asKey(a.side).localeCompare(asKey(b.side)) ||
    asKey(a.rikishiId).localeCompare(asKey(b.rikishiId))
  );
}

export function sortBanzukeEntries<T extends SortableBanzukeEntry>(rows: T[]): T[] {
  return [...rows].sort(compareBanzukeEntries);
}

export function compareBouts(a: SortableBout, b: SortableBout): number {
  return (
    asKey(a.bashoId).localeCompare(asKey(b.bashoId)) ||
    asKey(a.division).localeCompare(asKey(b.division)) ||
    (Number(a.day ?? Number.MAX_SAFE_INTEGER) - Number(b.day ?? Number.MAX_SAFE_INTEGER)) ||
    (Number(a.boutNo ?? Number.MAX_SAFE_INTEGER) - Number(b.boutNo ?? Number.MAX_SAFE_INTEGER)) ||
    asKey(a.eastRikishiId).localeCompare(asKey(b.eastRikishiId)) ||
    asKey(a.westRikishiId).localeCompare(asKey(b.westRikishiId))
  );
}

export function sortBouts<T extends SortableBout>(rows: T[]): T[] {
  return [...rows].sort(compareBouts);
}

export function compareKimarite(a: SortableKimarite, b: SortableKimarite): number {
  return asKey(a.kimariteId).localeCompare(asKey(b.kimariteId));
}

export function sortKimarite<T extends SortableKimarite>(rows: T[]): T[] {
  return [...rows].sort(compareKimarite);
}
