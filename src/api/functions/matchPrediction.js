import { logFn } from './_log';

function readWinRate(w) {
  const rec = w?.currentForm && typeof w.currentForm === 'object' ? w.currentForm : null;
  const wins = Number(rec?.wins ?? w?.wins ?? 0);
  const losses = Number(rec?.losses ?? w?.losses ?? 0);
  const total = wins + losses;
  if (!Number.isFinite(total) || total <= 0) return null;
  return wins / total;
}

function clamp01(n) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

export function calculateMatchProbability(wrestler1, wrestler2, context = {}) {
  logFn('matchPrediction', 'calculateMatchProbability', [{ wrestler1, wrestler2, context }]);

  const w1 = readWinRate(wrestler1);
  const w2 = readWinRate(wrestler2);

  // If we don't have record data, be explicit and let UI handle it.
  if (w1 == null || w2 == null) {
    const err = new Error('Insufficient record data to calculate match probability');
    err.code = 'INSUFFICIENT_DATA';
    throw err;
  }

  const denom = w1 + w2;
  const p1 = denom > 0 ? clamp01(w1 / denom) : 0.5;
  const p2 = clamp01(1 - p1);

  const predictedWinner = p1 >= p2 ? 'wrestler1' : 'wrestler2';
  const confidence = clamp01(Math.abs(p1 - 0.5) * 2);

  return {
    wrestler1Probability: round3(p1),
    wrestler2Probability: round3(p2),
    predictedWinner,
    confidence: round3(confidence),
    explanation: 'Based on recent win rates from available records.',
  };
}

export async function fetchMatchOdds({ wrestlerA, wrestlerB } = {}) {
  logFn('matchPrediction', 'fetchMatchOdds', [{ wrestlerA, wrestlerB }]);
  const prob = calculateMatchProbability(wrestlerA, wrestlerB);
  return { implied: { wrestler1: prob.wrestler1Probability, wrestler2: prob.wrestler2Probability } };
}
