import { logFn } from './_log';
import { stableHash } from './_ids';

function keyForWrestler(w) {
  if (!w) return 'unknown';
  if (typeof w === 'string') return w;
  if (typeof w === 'object') {
    return w.id || w.rid || w.shikona || w.name || w.email || 'unknown';
  }
  return String(w);
}

function clamp01(n) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

export function calculateMatchProbability({ wrestlerA, wrestlerB, context } = {}) {
  logFn('matchPrediction', 'calculateMatchProbability', [{ wrestlerA, wrestlerB, context }]);

  const aKey = keyForWrestler(wrestlerA);
  const bKey = keyForWrestler(wrestlerB);
  const h = stableHash(`${aKey}|${bKey}`);

  // Deterministic pseudo-probability in [0.25, 0.75].
  const base = 0.25 + ((h % 1000) / 1000) * 0.5;
  const a = clamp01(base);
  const b = clamp01(1 - a);

  // Confidence in [0.55, 0.9].
  const confidence = 0.55 + (((h >>> 10) % 1000) / 1000) * 0.35;

  const explanation = `Stub prediction for ${aKey} vs ${bKey} (deterministic)`;

  return {
    a: round3(a),
    b: round3(b),
    confidence: round3(confidence),
    explanation,
  };
}

export async function fetchMatchOdds({ wrestlerA, wrestlerB } = {}) {
  logFn('matchPrediction', 'fetchMatchOdds', [{ wrestlerA, wrestlerB }]);
  const prob = calculateMatchProbability({ wrestlerA, wrestlerB });
  return {
    implied: { a: prob.a, b: prob.b },
    source: 'stub',
  };
}
