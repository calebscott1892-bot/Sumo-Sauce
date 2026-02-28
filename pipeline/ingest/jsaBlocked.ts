import type { SnapshotMeta } from '../snapshots/snapshotTypes.ts';

export type JsaBlockedDetection = {
  blocked: boolean;
  reason?: string;
};

const BLOCK_TOKENS = [
  'access denied',
  'forbidden',
  'captcha',
  'attention required',
  'request blocked',
  'bot',
  'cloudflare',
  'temporarily unavailable',
  'service unavailable',
];

const EXPECTED_MARKERS = [
  'banzuke',
  'enhonbashobanzuke',
  'sumo.or.jp',
  'rikishi',
];

export function detectJsaBlockedOrInterstitial(snapshot: {
  meta: SnapshotMeta;
  bodyBytes: Buffer;
}): JsaBlockedDetection {
  const bytes = snapshot.bodyBytes.byteLength;
  if (bytes < 2000) {
    return { blocked: true, reason: 'small-body' };
  }

  const text = snapshot.bodyBytes.toString('utf8').toLowerCase();
  const hasExpectedMarker = EXPECTED_MARKERS.some((m) => text.includes(m));
  const hasBlockToken = BLOCK_TOKENS.some((m) => text.includes(m));

  if (!hasExpectedMarker && hasBlockToken) {
    return { blocked: true, reason: 'block-token-no-marker' };
  }

  return { blocked: false };
}
