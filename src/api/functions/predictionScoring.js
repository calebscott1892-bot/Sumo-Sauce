import { logFn } from './_log';
import { keyPrefix } from './_ids';

const PREFIX = keyPrefix();
const COUNTER_KEY = `${PREFIX}leagueCodeCounter`;

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function readCounter() {
  if (!hasLocalStorage()) return 0;
  const raw = window.localStorage.getItem(COUNTER_KEY);
  const n = parseInt(raw || '0', 10);
  return Number.isFinite(n) ? n : 0;
}

function writeCounter(n) {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(COUNTER_KEY, String(n));
  } catch {
    // ignore
  }
}

export function generateLeagueCode() {
  logFn('predictionScoring', 'generateLeagueCode', []);
  const next = readCounter() + 1;
  writeCounter(next);
  // Deterministic, "random-looking" 6-char code.
  return next.toString(36).toUpperCase().padStart(6, '0').slice(-6);
}

export async function scoreAllPredictionsForTournament(arg = {}) {
  logFn('predictionScoring', 'scoreAllPredictionsForTournament', [arg]);

  // Support UI calling with tournamentId string.
  const params = typeof arg === 'string' ? { tournamentId: arg } : (arg || {});

  const err = new Error(
    `scoreAllPredictionsForTournament is not implemented for tournamentId=${params.tournamentId || 'unknown'}.`
  );
  err.code = 'NOT_IMPLEMENTED';
  throw err;
}
