/**
 * localStorage-based "recently viewed" tracker for rikishi, basho, and rivalries.
 * Pure client-side — no API calls or DB changes needed.
 * Follows the same pattern as favorites.ts.
 */

export type RecentItem = {
  id: string;
  /** Secondary label (shikona, basho display name, etc.) */
  label: string;
  /** Timestamp of the view */
  viewedAt: number;
};

const RIKISHI_KEY = 'sumosauce:recent-rikishi';
const BASHO_KEY = 'sumosauce:recent-basho';
const RIVALRY_KEY = 'sumosauce:recent-rivalry';
const MAX_ITEMS = 10;
const EVENT_NAME = 'sumosauce:recently-viewed';

function readList(key: string): RecentItem[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (v: unknown): v is RecentItem =>
        typeof v === 'object' &&
        v !== null &&
        typeof (v as RecentItem).id === 'string' &&
        typeof (v as RecentItem).label === 'string' &&
        typeof (v as RecentItem).viewedAt === 'number',
    );
  } catch {
    return [];
  }
}

function writeList(key: string, list: RecentItem[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    // storage full or unavailable — silently fail
  }
}

function addItem(key: string, id: string, label: string): void {
  const list = readList(key);
  // Remove existing entry for this id, then prepend
  const filtered = list.filter((item) => item.id !== id);
  filtered.unshift({ id, label, viewedAt: Date.now() });
  writeList(key, filtered);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

// ── Rikishi recently viewed ──

export function getRecentRikishi(): RecentItem[] {
  return readList(RIKISHI_KEY);
}

export function trackRikishiView(rikishiId: string, shikona: string): void {
  addItem(RIKISHI_KEY, rikishiId, shikona);
}

// ── Basho recently viewed ──

export function getRecentBasho(): RecentItem[] {
  return readList(BASHO_KEY);
}

export function trackBashoView(bashoId: string, displayName: string): void {
  addItem(BASHO_KEY, bashoId, displayName);
}

// ── Rivalry recently viewed ──

export function getRecentRivalries(): RecentItem[] {
  return readList(RIVALRY_KEY);
}

export function trackRivalryView(pairKey: string, label: string): void {
  addItem(RIVALRY_KEY, pairKey, label);
}

// ── Combined (for homepage "Continue Exploring") ──

export type RecentItemWithType = RecentItem & { type: 'rikishi' | 'basho' | 'rivalry' };

export function getAllRecent(limit = 8): RecentItemWithType[] {
  const rikishi = getRecentRikishi().map((r) => ({ ...r, type: 'rikishi' as const }));
  const basho = getRecentBasho().map((r) => ({ ...r, type: 'basho' as const }));
  const rivalry = getRecentRivalries().map((r) => ({ ...r, type: 'rivalry' as const }));

  return [...rikishi, ...basho, ...rivalry]
    .sort((a, b) => b.viewedAt - a.viewedAt)
    .slice(0, limit);
}
