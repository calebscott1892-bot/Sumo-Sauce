type Props = {
  wins: number;
  losses: number;
};

/**
 * Heuristic promotion prediction based on basho record.
 *
 * Rules:
 *   10+ wins → strong promotion  (green ↑↑)
 *   8–9 wins → mild promotion    (emerald ↑)
 *   7 wins   → neutral           (grey —)
 *   ≤6 wins  → demotion risk     (red ↓)
 */
export default function PromotionPredictionBadge({ wins, losses }: Props) {
  const total = wins + losses;
  if (total === 0) {
    return null;
  }

  if (wins >= 10) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-full bg-emerald-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
        title={`${wins} wins — strong promotion candidate`}
      >
        ↑↑
      </span>
    );
  }

  if (wins >= 8) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-full bg-emerald-900/25 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400"
        title={`${wins} wins — mild promotion likely`}
      >
        ↑
      </span>
    );
  }

  if (wins === 7) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500"
        title="7 wins — neutral"
      >
        —
      </span>
    );
  }

  // 6 or fewer wins
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full bg-red-900/30 px-1.5 py-0.5 text-[10px] font-medium text-red-400"
      title={`${wins} wins — demotion risk`}
    >
      ↓
    </span>
  );
}
