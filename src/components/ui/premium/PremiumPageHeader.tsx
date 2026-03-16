import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import CopyLinkButton from '@/components/ui/CopyLinkButton';

export type Crumb = { label: string; to?: string };

type Props = {
  accentLabel: string;
  title: string;
  subtitle?: string;
  badge?: string;
  breadcrumbs?: Crumb[];
  favorite?: { active: boolean; onToggle: () => void; ariaLabel?: string };
  actions?: ReactNode;
  children?: ReactNode;
};

export default function PremiumPageHeader({
  accentLabel,
  title,
  subtitle,
  badge,
  breadcrumbs,
  favorite,
  actions,
  children,
}: Props) {
  const titleChars = Array.from(title);

  return (
    <>
      {(breadcrumbs || actions || favorite) && (
        <nav className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-testid="breadcrumbs">
          {breadcrumbs ? (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-zinc-400 sm:text-sm">
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <span key={crumb.label} className="flex items-center gap-1.5">
                    {i > 0 ? <span className="text-zinc-600">/</span> : null}
                    {isLast || !crumb.to ? (
                      <span className="text-zinc-200">{crumb.label}</span>
                    ) : (
                      <Link className="text-red-400 transition-colors hover:text-red-300" to={crumb.to}>
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <div />
          )}

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <CopyLinkButton />
            {actions}
            {favorite ? (
              <button
                type="button"
                onClick={favorite.onToggle}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] p-2.5 text-zinc-300 transition-all hover:border-red-600/50 hover:bg-white/[0.05] hover:text-white"
                aria-label={favorite.ariaLabel ?? (favorite.active ? 'Remove from watchlist' : 'Add to watchlist')}
              >
                <Heart className={`h-4 w-4 transition-colors ${favorite.active ? 'fill-red-500 text-red-500' : 'text-zinc-400'}`} />
              </button>
            ) : null}
          </div>
        </nav>
      )}

      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-7 lg:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.16),transparent_42%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_32%)]" />
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

        <div className="relative">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-red-400 sm:text-xs">
            {accentLabel}
          </span>

          <div className="mt-2 flex flex-wrap items-start gap-3">
            <h1
              className="max-w-4xl font-display text-3xl font-bold leading-[0.94] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]"
              aria-label={title}
            >
              {titleChars.map((char, index) => (
                <span
                  key={`${char}-${index}`}
                  aria-hidden="true"
                  className="premium-header-title-char"
                  style={{ animationDelay: `${index * 14}ms` }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </h1>
            {badge ? (
              <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300 sm:mt-1">
                {badge}
              </span>
            ) : null}
          </div>

          {subtitle ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
              {subtitle}
            </p>
          ) : null}

          {children ? <div className="mt-6">{children}</div> : null}
        </div>
      </section>
    </>
  );
}
