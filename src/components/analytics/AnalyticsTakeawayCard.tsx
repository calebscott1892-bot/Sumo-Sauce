import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MoveRight } from 'lucide-react';

type Variant = 'zinc' | 'amber' | 'blue' | 'green' | 'red';

type Props = {
  eyebrow: string;
  value?: string;
  title: string;
  detail: string;
  variant?: Variant;
  to?: string;
  cta?: string;
  icon?: ReactNode;
};

const VARIANT_MAP: Record<Variant, string> = {
  zinc: 'border-white/[0.06] bg-white/[0.02]',
  amber: 'border-amber-700/30 bg-amber-950/15',
  blue: 'border-blue-700/30 bg-blue-950/15',
  green: 'border-emerald-700/30 bg-emerald-950/15',
  red: 'border-red-700/30 bg-red-950/15',
};

export default function AnalyticsTakeawayCard({
  eyebrow,
  value,
  title,
  detail,
  variant = 'zinc',
  to,
  cta,
  icon,
}: Props) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {eyebrow}
        </div>
        {icon ? <div className="shrink-0 text-zinc-400">{icon}</div> : null}
      </div>
      {value ? (
        <div className="mt-3 font-display text-3xl font-bold tracking-tight text-white">
          {value}
        </div>
      ) : null}
      <div className={`${value ? 'mt-2' : 'mt-3'} text-sm font-semibold text-zinc-100`}>
        {title}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{detail}</p>
      {to && cta ? (
        <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
          {cta}
          <MoveRight className="h-3.5 w-3.5" />
        </div>
      ) : null}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`group block rounded-2xl border p-4 transition-colors hover:border-red-600/40 hover:bg-white/[0.04] ${VARIANT_MAP[variant]}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 ${VARIANT_MAP[variant]}`}>
      {content}
    </div>
  );
}
