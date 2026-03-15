import { bashoDisplayName } from '@/utils/basho';

/**
 * Local-first watchlist storage.
 * Preserves the older rikishi/basho keys so existing saves keep working.
 */

const RIKISHI_KEY = 'sumosauce:fav-rikishi';
const BASHO_KEY = 'sumosauce:fav-basho';
const WATCHLIST_KEY = 'sumosauce:watchlist';

export const FAVORITES_CHANGED_EVENT = 'sumosauce:favorites-changed';
export const WATCHLIST_CHANGED_EVENT = 'sumosauce:watchlist-changed';

export type WatchlistType = 'rikishi' | 'basho' | 'rivalry' | 'stable';

export type WatchlistEntry = {
  type: WatchlistType;
  id: string;
  label: string;
  path: string;
  savedAt: number;
};

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((value: unknown): value is string => typeof value === 'string'));
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // storage full or unavailable
  }
}

function isWatchlistType(value: unknown): value is WatchlistType {
  return value === 'rikishi' || value === 'basho' || value === 'rivalry' || value === 'stable';
}

function isWatchlistEntry(value: unknown): value is WatchlistEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    isWatchlistType((value as WatchlistEntry).type) &&
    typeof (value as WatchlistEntry).id === 'string' &&
    typeof (value as WatchlistEntry).label === 'string' &&
    typeof (value as WatchlistEntry).path === 'string' &&
    typeof (value as WatchlistEntry).savedAt === 'number'
  );
}

function readWatchlist(): WatchlistEntry[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWatchlistEntry);
  } catch {
    return [];
  }
}

function writeWatchlist(entries: WatchlistEntry[]): void {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(entries));
  } catch {
    // storage full or unavailable
  }
}

function emitWatchlistChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
  window.dispatchEvent(new CustomEvent(WATCHLIST_CHANGED_EVENT));
}

function watchlistKey(type: WatchlistType, id: string): string {
  return `${type}::${id}`;
}

function mergeWatchlistEntries(entries: WatchlistEntry[]): WatchlistEntry[] {
  const byKey = new Map<string, WatchlistEntry>();

  for (const entry of entries) {
    const key = watchlistKey(entry.type, entry.id);
    const existing = byKey.get(key);
    if (!existing || entry.savedAt >= existing.savedAt) {
      byKey.set(key, entry);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.savedAt - a.savedAt || a.label.localeCompare(b.label));
}

function getLegacyEntries(): WatchlistEntry[] {
  const entries: WatchlistEntry[] = [];

  for (const rikishiId of readSet(RIKISHI_KEY)) {
    entries.push({
      type: 'rikishi',
      id: rikishiId,
      label: rikishiId,
      path: buildRikishiWatchlistPath(rikishiId),
      savedAt: 0,
    });
  }

  for (const bashoId of readSet(BASHO_KEY)) {
    entries.push({
      type: 'basho',
      id: bashoId,
      label: bashoDisplayName(bashoId),
      path: buildBashoWatchlistPath(bashoId),
      savedAt: 0,
    });
  }

  return entries;
}

function syncLegacySets(entries: WatchlistEntry[]): void {
  const rikishi = new Set(entries.filter((entry) => entry.type === 'rikishi').map((entry) => entry.id));
  const basho = new Set(entries.filter((entry) => entry.type === 'basho').map((entry) => entry.id));
  writeSet(RIKISHI_KEY, rikishi);
  writeSet(BASHO_KEY, basho);
}

export function buildRikishiWatchlistPath(rikishiId: string): string {
  return `/rikishi/${encodeURIComponent(rikishiId)}`;
}

export function buildBashoWatchlistPath(bashoId: string): string {
  return `/basho/${encodeURIComponent(bashoId)}`;
}

export function buildStableWatchlistPath(slug: string): string {
  return `/stables/${encodeURIComponent(slug)}`;
}

export function buildRivalryWatchlistId(a: string, b: string): string {
  return [a, b].sort((left, right) => left.localeCompare(right)).join('::');
}

export function buildRivalryWatchlistPath(a: string, b: string): string {
  return `/compare/${encodeURIComponent(a)}/${encodeURIComponent(b)}`;
}

export function getWatchlistEntries(): WatchlistEntry[] {
  return mergeWatchlistEntries([...readWatchlist(), ...getLegacyEntries()]);
}

export function getWatchlistEntriesByType(type: WatchlistType): WatchlistEntry[] {
  return getWatchlistEntries().filter((entry) => entry.type === type);
}

export function isWatchlistItem(type: WatchlistType, id: string): boolean {
  return getWatchlistEntries().some((entry) => entry.type === type && entry.id === id);
}

export function toggleWatchlistItem(entry: Omit<WatchlistEntry, 'savedAt'> & { savedAt?: number }): boolean {
  const current = getWatchlistEntries();
  const exists = current.some((item) => item.type === entry.type && item.id === entry.id);
  const next = exists
    ? current.filter((item) => !(item.type === entry.type && item.id === entry.id))
    : mergeWatchlistEntries([
        {
          ...entry,
          savedAt: entry.savedAt ?? Date.now(),
        },
        ...current,
      ]);

  writeWatchlist(next);
  syncLegacySets(next);
  emitWatchlistChange();
  return !exists;
}

export function removeWatchlistItem(type: WatchlistType, id: string): void {
  const next = getWatchlistEntries().filter((entry) => !(entry.type === type && entry.id === id));
  writeWatchlist(next);
  syncLegacySets(next);
  emitWatchlistChange();
}

export function getFavoriteRikishi(): string[] {
  return getWatchlistEntriesByType('rikishi').map((entry) => entry.id);
}

export function isFavoriteRikishi(rikishiId: string): boolean {
  return isWatchlistItem('rikishi', rikishiId);
}

export function toggleFavoriteRikishi(rikishiId: string, label = rikishiId): boolean {
  return toggleWatchlistItem({
    type: 'rikishi',
    id: rikishiId,
    label,
    path: buildRikishiWatchlistPath(rikishiId),
  });
}

export function getFavoriteBasho(): string[] {
  return getWatchlistEntriesByType('basho').map((entry) => entry.id);
}

export function isFavoriteBasho(bashoId: string): boolean {
  return isWatchlistItem('basho', bashoId);
}

export function toggleFavoriteBasho(bashoId: string, label = bashoDisplayName(bashoId)): boolean {
  return toggleWatchlistItem({
    type: 'basho',
    id: bashoId,
    label,
    path: buildBashoWatchlistPath(bashoId),
  });
}

export function isFavoriteStable(slug: string): boolean {
  return isWatchlistItem('stable', slug);
}

export function toggleFavoriteStable(slug: string, label: string): boolean {
  return toggleWatchlistItem({
    type: 'stable',
    id: slug,
    label,
    path: buildStableWatchlistPath(slug),
  });
}

export function isFavoriteRivalry(a: string, b: string): boolean {
  return isWatchlistItem('rivalry', buildRivalryWatchlistId(a, b));
}

export function toggleFavoriteRivalry(a: string, b: string, label: string): boolean {
  return toggleWatchlistItem({
    type: 'rivalry',
    id: buildRivalryWatchlistId(a, b),
    label,
    path: buildRivalryWatchlistPath(a, b),
  });
}

export function useFavoritesListener(_callback: () => void): void {
  // kept for compatibility with older call sites
}
