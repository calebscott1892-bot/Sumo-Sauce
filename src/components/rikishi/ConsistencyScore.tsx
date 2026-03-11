import { memo, useMemo } from 'react';
import type { TimelineItem, RankProgressionItem } from '@/pages/rikishi/types';

type Props = {
  timeline: TimelineItem[];
  rankProgression: RankProgressionItem[];
};

/**
 * Consistency Score (0–100)
 *
 * Measures how stable/consistent a rikishi's performance has been.
 *
 * Factors:
 * 1. Win-rate variance — lower variance across basho = more consistent
 * 2. Kachi-koshi streak — higher ratio of winning records = consistent performer
 * 3. Division stability — fewer division changes = more stable
 * 4. Average win rate — baseline quality factor
 */
function computeConsistency(
  timeline: TimelineItem[],
  rankProgression: RankProgressionItem[],
): { score: number; label: string; details: { variance: number; kachiRatio: number; avgWinRate: number; divChanges: number } } {
  if (timeline.length < 2) {
    return { score: 0, label: 'Insufficient data', details: { variance: 0, kachiRatio: 0, avgWinRate: 0, divChanges: 0 } };
  }

  // Deduplicate by bashoId — take highest division per basho
  const byBasho = new Map<string, TimelineItem>();
  for (const item of timeline) {
    const existing = byBasho.get(item.bashoId);
    if (!existing || item.division < existing.division) {
      byBasho.set(item.bashoId, item);
    }
  }
  const entries = Array.from(byBasho.values()).sort((a, b) => a.bashoId.localeCompare(b.bashoId));

  // Win rates per basho
  const winRates = entries
    .filter((e) => e.wins + e.losses > 0)
    .map((e) => e.wins / (e.wins + e.losses));

  if (winRates.length < 2) {
    return { score: 0, label: 'Insufficient data', details: { variance: 0, kachiRatio: 0, avgWinRate: 0, divChanges: 0 } };
  }

  // Factor 1: Win-rate variance
  const mean = winRates.reduce((s, v) => s + v, 0) / winRates.length;
  const variance = winRates.reduce((s, v) => s + (v - mean) ** 2, 0) / winRates.length;
  const stdDev = Math.sqrt(variance);
  // Lower std dev = more consistent. Max possible stdDev is ~0.5
  const varianceScore = Math.max(0, 1 - stdDev * 3) * 35;

  // Factor 2: Kachi-koshi ratio
  const kachiCount = rankProgression.filter((r) => r.kachiKoshi).length;
  const totalProgression = rankProgression.length;
  const kachiRatio = totalProgression > 0 ? kachiCount / totalProgression : 0;
  const kachiScore = kachiRatio * 30;

  // Factor 3: Division stability
  let divChanges = 0;
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].division !== entries[i - 1].division) divChanges++;
  }
  const changeRate = entries.length > 1 ? divChanges / (entries.length - 1) : 0;
  const stabilityScore = Math.max(0, 1 - changeRate) * 20;

  // Factor 4: Avg win rate quality factor
  const avgWinRate = mean;
  const qualityScore = avgWinRate * 15;

  const raw = Math.round(varianceScore + kachiScore + stabilityScore + qualityScore);
  const score = Math.min(100, Math.max(0, raw));

  let label: string;
  if (score >= 80) label = 'Elite';
  else if (score >= 65) label = 'Very Consistent';
  else if (score >= 50) label = 'Consistent';
  else if (score >= 35) label = 'Variable';
  else label = 'Inconsistent';

  return {
    score,
    label,
    details: {
      variance: Math.round(stdDev * 1000) / 1000,
      kachiRatio: Math.round(kachiRatio * 100),
      avgWinRate: Math.round(mean * 1000) / 10,
      divChanges,
    },
  };
}

function ringColor(score: number): string {
  if (score >= 80) return '#dc2626'; // red-600
  if (score >= 65) return '#f97316'; // orange-500
  if (score >= 50) return '#eab308'; // yellow-500
  if (score >= 35) return '#3b82f6'; // blue-500
  return '#71717a'; // zinc-500
}

function ConsistencyScore({ timeline, rankProgression }: Props) {
  const result = useMemo(
    () => computeConsistency(timeline, rankProgression),
    [timeline, rankProgression],
  );

  if (result.label === 'Insufficient data') return null;

  const color = ringColor(result.score);
  const circumference = 2 * Math.PI * 36; // radius 36
  const strokeDashoffset = circumference - (result.score / 100) * circumference;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-xl font-bold text-white">Consistency Score</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        Measures performance stability across career basho.
      </p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* Ring gauge */}
        <div className="relative flex-shrink-0">
          <svg width={88} height={88} viewBox="0 0 88 88" role="img" aria-label={`Consistency score: ${result.score}`}>
            <circle
              cx={44}
              cy={44}
              r={36}
              stroke="#27272a"
              strokeWidth={6}
              fill="none"
            />
            <circle
              cx={44}
              cy={44}
              r={36}
              stroke={color}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 44 44)"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-white">{result.score}</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 space-y-2">
          <div className="text-sm font-semibold" style={{ color }}>
            {result.label}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
              <div className="text-zinc-500">Win Rate StdDev</div>
              <div className="font-semibold text-zinc-200">{result.details.variance}</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
              <div className="text-zinc-500">Kachi-koshi %</div>
              <div className="font-semibold text-zinc-200">{result.details.kachiRatio}%</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
              <div className="text-zinc-500">Avg Win Rate</div>
              <div className="font-semibold text-zinc-200">{result.details.avgWinRate}%</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
              <div className="text-zinc-500">Division Changes</div>
              <div className="font-semibold text-zinc-200">{result.details.divChanges}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(ConsistencyScore);
