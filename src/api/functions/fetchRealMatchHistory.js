import { logFn } from './_log';
import { nowIso } from './_ids';

export default async function fetchRealMatchHistory(...args) {
  logFn('fetchRealMatchHistory', 'default', args);

  return {
    matches: [],
    meta: {
      source: 'stub',
      generatedAt: nowIso(),
      note: 'replace with real backend later',
    },
  };
}
