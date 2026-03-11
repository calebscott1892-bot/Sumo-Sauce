import { useMemo } from 'react';
import type { DivisionStandingRow } from '../../../shared/api/v1';

type Props = {
  rows: DivisionStandingRow[];
  bashoId: string;
};

/**
 * Basho Difficulty Index — a composite score (0–100) measuring how competitive a basho was.
 *
 * Factors:
 * 1. Average win percentage (closer to 50% = more competitive)
 * 2. Top-heaviness (how many wins the top wrestler had vs average)
 * 3. Sanyaku density (rough estimate based on rank strings)
 * 4. Record spread (smaller spread = more competitive)
 */
function computeDifficulty(rows: DivisionStandingRow[]): {
  score: number;
  avgWins: number;
  topWins: number;
  competitiveness: string;
  spread: number;
} {
  if (!rows.length) return { score: 0, avgWins: 0, topWins: 0, competitiveness: 'N/A', spread: 0 };

  const totalWins = rows.reduce((s, r) => s + r.wins, 0);
  const totalLosses = rows.reduce((s, r) => s + r.losses, 0);
  const avgWins = totalWins / rows.length;
  const totalBouts = totalWins + totalLosses;
  const avgWinPct = totalBouts > 0 ? totalWins / totalBouts : 0.5;

  // Sorted by wins descending
  const sorted = [...rows].sort((a, b) => b.wins - a.wins);
  const topWins = sorted[0]?.wins ?? 0;
  const bottomWins = sorted[sorted.length - 1]?.wins ?? 0;
  const spread = topWins - bottomWins;

  // Factor 1: Competitiveness — how close to 50% win rate
  const pctDeviation = Math.abs(avgWinPct - 0.5);
  const competitivenessScore = Math.max(0, 1 - pctDeviation * 4); // 0-1

  // Factor 2: Dominance — if top winner has way more than average, less competitive
  const dominanceFactor = avgWins > 0 ? Math.min(1, avgWins / Math.max(topWins, 1)) : 0.5;

  // Factor 3: Record spread — smaller spread = more competitive
  const maxPossibleSpread = 15; // max possible in a 15-bout basho
  const spreadFactor = Math.max(0, 1 - spread / maxPossibleSpread);

  // Factor 4: Participant count bonus (more wrestlers = harder)
  const sizeFactor = Math.min(1, rows.length / 42); // makuuchi has ~42

  // Composite
  const raw = (competitivenessScore * 30 + dominanceFactor * 25 + spreadFactor * 25 + sizeFactor * 20);
  const score = Math.round(Math.min(100, Math.max(0, raw)));

  let competitiveness: string;
  if (score >= 75) competitiveness = 'Highly Competitive';
  else if (score >= 55) competitiveness = 'Competitive';
  else if (score >= 35) competitiveness = 'Moderate';
  else competitiveness = 'Low Competition';

  return {
    score,
    avgWins: Math.round(avgWins * 10) / 10,
    topWins,
    competitiveness,
    spread,
  };
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-red-400';
  if (score >= 55) return 'text-amber-400';
  if (score >= 35) return 'text-blue-400';
  return 'text-zinc-400';
}

function scoreBg(score: number): string {
  if (score >= 75) return 'border-red-700 bg-red-950/20';
  if (score >= 55) return 'border-amber-700 bg-amber-950/20';
  if (score >= 35) return 'border-blue-700 bg-blue-950/20';
  return 'border-white/[0.06] bg-white/[0.02]';
}

export default function BashoDifficultyCard({ rows, bashoId }: Props) {
  const difficulty = useMemo(() => computeDifficulty(rows), [rows]);

  if (!rows.length) return null;

  return (
    <section className={`rounded-xl border p-5 ${scoreBg(difficulty.score)}`}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-white">Difficulty Index</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            How competitive this basho was based on win distribution and record spread.
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-black ${scoreColor(difficulty.score)}`}>
            {difficulty.score}
          </div>
          <div className="text-xs text-zinc-500">/ 100</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="text-xs text-zinc-400">Rating</div>
          <div className={`mt-0.5 font-semibold ${scoreColor(difficulty.score)}`}>
            {difficulty.competitiveness}
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="text-xs text-zinc-400">Avg Wins</div>
          <div className="mt-0.5 font-semibold text-zinc-100">{difficulty.avgWins}</div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="text-xs text-zinc-400">Top Score</div>
          <div className="mt-0.5 font-semibold text-zinc-100">{difficulty.topWins}W</div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="text-xs text-zinc-400">Win Spread</div>
          <div className="mt-0.5 font-semibold text-zinc-100">{difficulty.spread}</div>
        </div>
      </div>

      {/* Visual bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Low</span>
          <span>High</span>
        </div>
        <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${difficulty.score}%`,
              background: difficulty.score >= 75
                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                : difficulty.score >= 55
                  ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                  : difficulty.score >= 35
                    ? 'linear-gradient(90deg, #3b82f6, #2563eb)'
                    : 'linear-gradient(90deg, #71717a, #52525b)',
            }}
          />
        </div>
      </div>
    </section>
  );
}
