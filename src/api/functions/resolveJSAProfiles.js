import { logFn } from './_log';
import { nowIso } from './_ids';

export default async function resolveJSAProfiles(input = {}) {
  logFn('resolveJSAProfiles', 'default', [input]);

  const err = new Error(
    `resolveJSAProfiles is not available in this build (generatedAt=${nowIso()}). ` +
      'Resolve profiles via the owned backend API instead.'
  );
  err.code = 'NOT_IMPLEMENTED';
  throw err;
}
