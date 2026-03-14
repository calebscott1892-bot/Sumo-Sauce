type Props = {
  currentRank: string;
  previousRank: string | null;
};

/**
 * Parse numeric portion of a sumo rank for comparison.
 * Lower number = higher rank. Returns a large number for unparseable ranks.
 */
function rankNumeric(rank: string): number {
  const m = String(rank).match(/\d+/);
  return m ? Number(m[0]) : 999;
}

/**
 * Displays a rank movement indicator:
 *   ▲ green  — promoted (lower numeric rank = higher position)
 *   ▼ red    — demoted
 *   — grey   — unchanged or no previous data
 */
export default function RankMovementIndicator({ currentRank, previousRank }: Props) {
  if (!previousRank) {
    return <span className="text-zinc-600 text-xs" title="No previous data">—</span>;
  }

  const curr = rankNumeric(currentRank);
  const prev = rankNumeric(previousRank);

  if (curr < prev) {
    return (
      <span className="text-emerald-400 text-xs font-bold" title={`Previously ${previousRank}`}>
        ▲
      </span>
    );
  }

  if (curr > prev) {
    return (
      <span className="text-red-400 text-xs font-bold" title={`Previously ${previousRank}`}>
        ▼
      </span>
    );
  }

  return <span className="text-zinc-500 text-xs" title={`Previously ${previousRank}`}>—</span>;
}
