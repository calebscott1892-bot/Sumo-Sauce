const KEY_PREFIX = 'sumowatch_v1:';

let memoryStore = new Map();

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function getItem(key) {
  if (hasLocalStorage()) return window.localStorage.getItem(key);
  return memoryStore.get(key) ?? null;
}

function setItem(key, value) {
  if (hasLocalStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }
  memoryStore.set(key, value);
}

export function nowIso() {
  // Deterministic enough for UI; used only in meta blocks.
  return new Date().toISOString();
}

export function stableHash(input) {
  const str = String(input ?? '');
  // djb2-ish, deterministic across sessions.
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  // Force unsigned 32-bit.
  return h >>> 0;
}

export function nextId(namespace = 'id') {
  const key = `${KEY_PREFIX}counter:${namespace}`;
  const current = parseInt(getItem(key) || '0', 10);
  const next = Number.isFinite(current) ? current + 1 : 1;
  setItem(key, String(next));
  return `${namespace}_${String(next).padStart(6, '0')}`;
}

export function stableId(namespace, value) {
  const h = stableHash(`${namespace}:${value}`);
  return `${namespace}_${h.toString(16).padStart(8, '0')}`;
}

export function keyPrefix() {
  return KEY_PREFIX;
}
