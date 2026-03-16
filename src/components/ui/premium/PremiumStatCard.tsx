type Props = {
  label: string;
  value: string;
  sub?: string;
  /** Highlight variant: 'gold' | 'green' | 'red' | 'default' */
  variant?: 'gold' | 'green' | 'red' | 'default';
  /** Optional icon element */
  icon?: React.ReactNode;
};

const VARIANT_CLASSES: Record<string, string> = {
  gold: 'border-amber-700/50 bg-amber-950/15 hover:border-amber-600/60',
  green: 'border-emerald-700/50 bg-emerald-950/15 hover:border-emerald-600/60',
  red: 'border-red-700/50 bg-red-950/15 hover:border-red-600/60',
  default: 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]',
};

const VALUE_CLASSES: Record<string, string> = {
  gold: 'text-amber-300',
  green: 'text-emerald-300',
  red: 'text-red-300',
  default: 'text-white',
};

/**
 * Premium stat card — shows a labelled metric with consistent glass-card styling.
 * Supports highlight variants for special emphasis (yusho, records, etc.).
 */
export default function PremiumStatCard({ label, value, sub, variant = 'default', icon }: Props) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 ${VARIANT_CLASSES[variant]}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-3 font-display text-2xl font-bold tracking-tight ${VALUE_CLASSES[variant]}`}>
        {value}
      </div>
      {sub ? <div className="mt-1.5 text-sm leading-relaxed text-zinc-500">{sub}</div> : null}
    </div>
  );
}
