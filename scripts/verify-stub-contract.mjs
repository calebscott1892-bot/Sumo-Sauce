// Deterministic contract verification for the owned compat client.
//
// This script runs in Node, so we provide a minimal window+localStorage polyfill
// before importing the client.

import assert from 'node:assert/strict';

function makeLocalStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(String(key), String(value));
    },
    removeItem(key) {
      map.delete(String(key));
    },
    clear() {
      map.clear();
    },
    key(i) {
      return Array.from(map.keys())[i] ?? null;
    },
    get length() {
      return map.size;
    },
    _dumpKeys() {
      return Array.from(map.keys());
    },
  };
}

// Polyfill window/localStorage for stubDb.
globalThis.window = {
  localStorage: makeLocalStorage(),
};

// Helper: fresh-ish state
function clearDbPrefix(prefix) {
  const keys = window.localStorage._dumpKeys();
  for (const k of keys) {
    if (k.startsWith(prefix)) window.localStorage.removeItem(k);
  }
}

// Clear then re-import to force seeds deterministically.
clearDbPrefix('sumowatch_db_v1:');
const { base44: base44Fresh } = await import(`../src/api/base44Client.js?cachebust=${Date.now()}`);

// 1) auth.me() returns stable demo user
const me = await base44Fresh.auth.me();
assert.equal(me.id, 'user_1');
assert.equal(me.email, 'demo@sumowatch.local');

// 2) list sorting works for rank and -rank
const wrestlersAsc = await base44Fresh.entities.Wrestler.list('rank', 500);
assert.ok(Array.isArray(wrestlersAsc));
assert.ok(wrestlersAsc.length >= 5);
assert.equal(wrestlersAsc[0].rank, 1);
assert.equal(wrestlersAsc[0].shikona, 'Hakuho');

const wrestlersDesc = await base44Fresh.entities.Wrestler.list('-rank', 500);
assert.ok(Array.isArray(wrestlersDesc));
assert.ok(wrestlersDesc.length >= 5);
assert.equal(wrestlersDesc[0].rank, 5);

// 3) update merges patch and returns updated record
const updated = await base44Fresh.entities.Wrestler.update('wrestler_1', { country: 'Testland' });
assert.equal(updated.id, 'wrestler_1');
assert.equal(updated.country, 'Testland');

const wrestlersAfter = await base44Fresh.entities.Wrestler.list('-rank', 500);
const w1 = wrestlersAfter.find((w) => w.id === 'wrestler_1');
assert.equal(w1.country, 'Testland');

// 4) bulkCreate supported where enabled
const beforeRecords = await base44Fresh.entities.BashoRecord.list('-created_date', 9999);
const bulk = await base44Fresh.entities.BashoRecord.bulkCreate([
  { basho: '2099-01', rid: 'R001', shikona: 'Hakuho', created_date: new Date().toISOString() },
  { basho: '2099-01', rid: 'R002', shikona: 'Terunofuji', created_date: new Date().toISOString() },
]);
assert.ok(Array.isArray(bulk));
assert.equal(bulk.created, 2);

const afterRecords = await base44Fresh.entities.BashoRecord.list('-created_date', 9999);
assert.equal(afterRecords.length, beforeRecords.length + 2);

// 5) updateMe merges and persists into User table
const me2 = await base44Fresh.auth.updateMe({ full_name: 'Changed Name' });
assert.equal(me2.full_name, 'Changed Name');
const users = await base44Fresh.entities.User.list('-created_date', 500);
assert.ok(users.some((u) => u.id === 'user_1' && u.full_name === 'Changed Name'));

process.stdout.write('OK verify-stub-contract\n');
