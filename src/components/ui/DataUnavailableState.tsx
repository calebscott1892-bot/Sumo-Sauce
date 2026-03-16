import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

type Action = {
  label: string;
  to: string;
};

type Props = {
  title: string;
  description: string;
  detail?: string;
  actions?: Action[];
};

export default function DataUnavailableState({
  title,
  description,
  detail,
  actions = [],
}: Props) {
  return (
    <div className="rounded-2xl border border-amber-700/30 bg-amber-950/14 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.16)]">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-700/30 bg-amber-950/24 text-amber-300">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
            Live data unavailable
          </div>
          <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-amber-50/90">{description}</p>
          {detail ? <p className="mt-2 text-sm leading-relaxed text-amber-100/70">{detail}</p> : null}
          {actions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map((action) => (
                <Link
                  key={`${action.label}-${action.to}`}
                  to={action.to}
                  className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:border-red-600/40 hover:text-white"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
