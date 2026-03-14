import { logFn } from './_log';
import { nowIso } from './_ids';

export default async function fetchRealMatchHistory(...args) {
  logFn('fetchRealMatchHistory', 'default', args);

  const err = new Error(
    `fetchRealMatchHistory is not available in this build (generatedAt=${nowIso()}). ` +
      'Import match history via the owned backend API instead.'
  );
  err.code = 'NOT_IMPLEMENTED';
  throw err;
}
