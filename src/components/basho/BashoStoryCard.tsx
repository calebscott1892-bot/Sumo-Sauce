import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PremiumBadge } from '@/components/ui/premium';

type Action = {
  label: string;
  to: string;
};

type Badge = {
  label: string;
  variant: 'red' | 'blue' | 'amber' | 'green' | 'zinc';
};

type Props = {
  eyebrow: string;
  title: string;
  summary: string;
  nextStep: string;
  icon: ComponentType<{ className?: string }>;
  tone?: 'red' | 'blue' | 'amber' | 'green' | 'zinc';
  actions?: Action[];
  badges?: Array<Badge | null | false>;
};

const TONE_CLASSES: Record<NonNullable<Props['tone']>, string> = {
  red: 'border-red-700/25 bg-red-950/12',
  blue: 'border-blue-700/25 bg-blue-950/12',
  amber: 'border-amber-700/25 bg-amber-950/12',
  green: 'border-emerald-700/25 bg-emerald-950/12',
  zinc: 'border-white/[0.06] bg-white/[0.02]',
};

export default function BashoStoryCard({
  eyebrow,
  title,
  summary,
  nextStep,
  icon: Icon,
  tone = 'zinc',
  actions = [],
  badges = [],
}: Props) {
  const visibleBadges = badges.filter(Boolean) as Badge[];

  return (
    <article className={`rounded-[24px] border p-5 shadow-[0_14px_36px_rgba(0,0,0,0.14)] ${TONE_CLASSES[tone]}`.trim()}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/20">
          <Icon className="h-4.5 w-4.5 text-zinc-100" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <PremiumBadge variant={tone}>{eyebrow}</PremiumBadge>
            {visibleBadges.map((badge) => (
              <PremiumBadge key={`${badge.label}-${badge.variant}`} variant={badge.variant}>
                {badge.label}
              </PremiumBadge>
            ))}
          </div>
          <h3 className="mt-3 font-display text-[1.35rem] font-bold tracking-tight text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{summary}</p>
          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/20 px-3.5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Next move</div>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{nextStep}</p>
          </div>
        </div>
      </div>

      {actions.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={`${action.to}-${action.label}`}
              to={action.to}
              className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}
