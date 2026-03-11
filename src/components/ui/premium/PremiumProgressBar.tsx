type Props = {
  /** 0–100 */
  value: number;
  /** Visual colour — derives from score tier if not provided */
  color?: string;
  /** Height in px (default 10) */
  height?: number;
  /** Show label text (default true) */
  showLabel?: boolean;
  label?: string;
};

function autoColor(v: number): string {
  if (v >= 80) return 'from-red-600 to-red-500';
  if (v >= 60) return 'from-amber-600 to-amber-500';
  if (v >= 40) return 'from-blue-600 to-blue-500';
  return 'from-zinc-600 to-zinc-500';
}

/**
 * Animated progress / score bar with gradient fill.
 */
export default function PremiumProgressBar({
  value,
  color,
  height = 10,
  showLabel = true,
  label,
}: Props) {
  const pct = Math.min(100, Math.max(0, value));
  const gradientClass = color ?? autoColor(pct);

  return (
    <div>
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
          <span>{label ?? ''}</span>
          <span>{pct}/100</span>
        </div>
      )}
      <div
        className="w-full overflow-hidden rounded-full bg-white/[0.06]"
        style={{ height }}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
