import { logFn } from './_log';
import { nowIso } from './_ids';

export default async function fetchRealSumoData(...args) {
  logFn('fetchRealSumoData', 'default', args);

  return {
    wrestlers: [],
    tournaments: [],
    records: [],
    meta: {
      source: 'stub',
      generatedAt: nowIso(),
      note: 'replace with real backend later',
    },
  };
}
