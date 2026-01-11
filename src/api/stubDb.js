const PREFIX = 'sumowatch_db_v1:';
const LOG_KEY = `${PREFIX}logs`;

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function log(msg) {
  const line = `[stub] ${msg}`;

  // eslint-disable-next-line no-console
  console.log(line);

  if (!hasLocalStorage()) return;
  try {
    // Keep an in-memory capture for automation/debugging.
    window.__STUB_LOGS__ = window.__STUB_LOGS__ || [];
    window.__STUB_LOGS__.push({ ts: Date.now(), line });
    if (window.__STUB_LOGS__.length > 500) {
      window.__STUB_LOGS__.splice(0, window.__STUB_LOGS__.length - 500);
    }

    // Also persist last N logs to localStorage for post-mortem.
    const existing = ensureArray(readJson(LOG_KEY, []));
    existing.push({ ts: Date.now(), line });
    const trimmed = existing.length > 500 ? existing.slice(existing.length - 500) : existing;
    writeJson(LOG_KEY, trimmed);
  } catch {
    // ignore
  }
}

export function readStubLogs() {
  return ensureArray(readJson(LOG_KEY, []));
}

export function clearStubLogs() {
  writeJson(LOG_KEY, []);
  if (hasLocalStorage() && Array.isArray(window.__STUB_LOGS__)) {
    window.__STUB_LOGS__ = [];
  }
}

function keyForTable(entity) {
  return `${PREFIX}table:${entity}`;
}

function keyForCounter(entity) {
  return `${PREFIX}counter:${entity}`;
}

function readJson(key, fallback) {
  if (!hasLocalStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function loadTable(entity) {
  const rows = ensureArray(readJson(keyForTable(entity), []));
  return rows;
}

export function saveTable(entity, rows) {
  writeJson(keyForTable(entity), ensureArray(rows));
}

export function nextId(entity) {
  const current = parseInt(readJson(keyForCounter(entity), '0'), 10);
  const next = Number.isFinite(current) ? current + 1 : 1;
  writeJson(keyForCounter(entity), String(next));
  return `${entity.toLowerCase()}_${next}`;
}

function coerceComparable(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v);
  // Date-ish strings sort well when parsed.
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  const n = Number(s);
  if (!Number.isNaN(n)) return n;
  return s.toLowerCase();
}

function sortRows(rows, sort) {
  if (!sort || typeof sort !== 'string') return rows;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  if (!field) return rows;

  const copy = [...rows];
  copy.sort((a, b) => {
    const av = coerceComparable(a?.[field]);
    const bv = coerceComparable(b?.[field]);

    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
  return copy;
}

export function ensureSeed(entity, seedRows = []) {
  const existing = loadTable(entity);
  if (existing.length > 0) return;
  if (!seedRows || seedRows.length === 0) return;
  saveTable(entity, seedRows);
  log(`${entity}.seed count=${seedRows.length}`);
}

export function makeEntityApi(entity, { allowBulkCreate = false } = {}) {
  return {
    async list(sort, limit) {
      ensureSeed(entity, []);
      const rows = loadTable(entity);
      const sorted = sortRows(rows, sort);
      const lim = typeof limit === 'number' && Number.isFinite(limit) ? limit : undefined;
      const out = lim ? sorted.slice(0, lim) : sorted;
      log(`${entity}.list sort=${sort || 'none'} limit=${limit ?? 'none'} => ${out.length}`);
      return out;
    },

    async create(payload) {
      const rows = loadTable(entity);
      const id = payload?.id ? String(payload.id) : nextId(entity);
      const created = { ...payload, id };
      rows.push(created);
      saveTable(entity, rows);
      log(`${entity}.create id=${id}`);
      return created;
    },

    async update(id, patch) {
      const rows = loadTable(entity);
      const targetId = String(id || '').trim();
      if (!targetId) {
        log(`${entity}.update id=<missing> (noop)`);
        return { ...(patch || {}) };
      }

      let found = false;
      const next = rows.map((r) => {
        if (r?.id === targetId) {
          found = true;
          return { ...r, ...(patch || {}) };
        }
        return r;
      });

      // Safety: if update called for missing id, create it.
      if (!found) {
        next.push({ id: targetId, ...(patch || {}) });
      }

      saveTable(entity, next);
      log(`${entity}.update id=${targetId} found=${found ? 'yes' : 'no'}`);
      return next.find((r) => r?.id === targetId) || { id: targetId, ...(patch || {}) };
    },

    async delete(id) {
      const rows = loadTable(entity);
      const targetId = String(id || '').trim();
      const before = rows.length;
      const next = targetId ? rows.filter((r) => r?.id !== targetId) : rows;
      saveTable(entity, next);
      log(`${entity}.delete id=${targetId || '<missing>'} removed=${before - next.length}`);
      return { ok: true };
    },

    async bulkCreate(items) {
      if (!allowBulkCreate) {
        log(`${entity}.bulkCreate not-supported`);
        return Object.assign([], { created: 0 });
      }

      const arr = Array.isArray(items) ? items : [];
      const rows = loadTable(entity);
      const created = [];

      for (const item of arr) {
        const id = item?.id ? String(item.id) : nextId(entity);
        const obj = { ...item, id };
        rows.push(obj);
        created.push(obj);
      }

      saveTable(entity, rows);
      log(`${entity}.bulkCreate count=${created.length}`);
      // Safest: return an array (iterable) but also expose created count.
      return Object.assign(created, { created: created.length });
    },
  };
}

export function authStorageKey() {
  return `${PREFIX}auth:user`;
}

export function loadAuthUser() {
  return readJson(authStorageKey(), null);
}

export function saveAuthUser(user) {
  writeJson(authStorageKey(), user);
}

export function stubLog() {
  return { log };
}
