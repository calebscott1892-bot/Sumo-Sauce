import { logFn } from './_log';
import { nowIso } from './_ids';

export default async function fetchRealSumoData(...args) {
  logFn('fetchRealSumoData', 'default', args);

  const err = new Error(
    `fetchRealSumoData is not available in this build (generatedAt=${nowIso()}). ` +
      'Import data via the owned backend API instead.'
  );
  err.code = 'NOT_IMPLEMENTED';
  throw err;
}
