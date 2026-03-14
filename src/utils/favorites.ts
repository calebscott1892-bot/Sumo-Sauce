/**
 * localStorage-based favorites system for rikishi and basho.
 * Pure client-side — no API calls or DB changes needed.
 */

const RIKISHI_KEY = 'sumosauce:fav-rikishi';
const BASHO_KEY = 'sumosauce:fav-basho';

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((v: unknown) => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // storage full or unavailable — silently fail
  }
}

// ── Rikishi favorites ──

export function getFavoriteRikishi(): string[] {
  return Array.from(readSet(RIKISHI_KEY));
}

export function isFavoriteRikishi(rikishiId: string): boolean {
  return readSet(RIKISHI_KEY).has(rikishiId);
}

export function toggleFavoriteRikishi(rikishiId: string): boolean {
  const set = readSet(RIKISHI_KEY);
  const wasPresent = set.has(rikishiId);
  if (wasPresent) {
    set.delete(rikishiId);
  } else {
    set.add(rikishiId);
  }
  writeSet(RIKISHI_KEY, set);
  window.dispatchEvent(new CustomEvent('sumosauce:favorites-changed'));
  return !wasPresent; // true = now favorited
}

// ── Basho favorites ──

export function getFavoriteBasho(): string[] {
  return Array.from(readSet(BASHO_KEY));
}

export function isFavoriteBasho(bashoId: string): boolean {
  return readSet(BASHO_KEY).has(bashoId);
}

export function toggleFavoriteBasho(bashoId: string): boolean {
  const set = readSet(BASHO_KEY);
  const wasPresent = set.has(bashoId);
  if (wasPresent) {
    set.delete(bashoId);
  } else {
    set.add(bashoId);
  }
  writeSet(BASHO_KEY, set);
  window.dispatchEvent(new CustomEvent('sumosauce:favorites-changed'));
  return !wasPresent;
}

// ── Hook helper for re-rendering on change ──

export function useFavoritesListener(callback: () => void): void {
  if (typeof window === 'undefined') return;
  // This should be used in a useEffect in the consuming component
  // window.addEventListener('sumosauce:favorites-changed', callback);
  // return () => window.removeEventListener('sumosauce:favorites-changed', callback);
}
