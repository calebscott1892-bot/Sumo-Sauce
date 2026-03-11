/**
 * Premium badge — small status / category chip with color variants.
 */

type Variant = 'red' | 'gold' | 'green' | 'blue' | 'zinc' | 'amber';

const VARIANT_MAP: Record<Variant, string> = {
  red: 'border-red-700/40 bg-red-950/30 text-red-300',
  gold: 'border-amber-700/40 bg-amber-950/30 text-amber-300',
  green: 'border-emerald-700/40 bg-emerald-950/30 text-emerald-300',
  blue: 'border-blue-700/40 bg-blue-950/30 text-blue-300',
  amber: 'border-amber-700/40 bg-amber-950/30 text-amber-300',
  zinc: 'border-white/[0.08] bg-white/[0.04] text-zinc-300',
};

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
};

export default function PremiumBadge({ children, variant = 'zinc', className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${VARIANT_MAP[variant]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
