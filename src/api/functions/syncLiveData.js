import { logFn } from './_log';

export default async function syncLiveData(...args) {
  logFn('syncLiveData', 'default', args);

  const err = new Error('syncLiveData is not implemented. Live updates require an owned backend endpoint.');
  err.code = 'NOT_IMPLEMENTED';
  throw err;
}
