import { logFn } from './_log';
import { nowIso } from './_ids';

export default async function resolveJSAProfiles(input = {}) {
  logFn('resolveJSAProfiles', 'default', [input]);

  return {
    profilesById: {},
    meta: {
      source: 'stub',
      generatedAt: nowIso(),
      note: 'replace with real backend later',
    },
  };
}
