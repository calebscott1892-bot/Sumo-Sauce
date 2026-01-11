import { logFn } from './_log';

export default async function syncLiveData(...args) {
  logFn('syncLiveData', 'default', args);
  return {
    ok: true,
    updated: { Wrestler: 0, BashoRecord: 0 },
    message: 'stub sync complete',
  };
}
