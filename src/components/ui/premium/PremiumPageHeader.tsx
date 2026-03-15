import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import CopyLinkButton from '@/components/ui/CopyLinkButton';

/* ─── breadcrumb ─── */
export type Crumb = { label: string; to?: string };

type Props = {
  /** Red accent label above the heading (e.g. "RIKISHI PROFILE") */
  accentLabel: string;
  /** Large display heading */
  title: string;
  /** Optional subtitle below the heading */
  subtitle?: string;
  /** Optional Japanese / secondary text next to title */
  badge?: string;
  /** Breadcrumb trail — last crumb is always plain text */
  breadcrumbs?: Crumb[];
  /** Save/watchlist toggle */
  favorite?: { active: boolean; onToggle: () => void; ariaLabel?: string };
  /** Additional action buttons rendered in the top-right bar */
  actions?: ReactNode;
  /** Extra content below the heading (stat bar, etc.) */
  children?: ReactNode;
};

/**
 * Premium page header — ESPN‑style hero section with accent label,
 * display heading, breadcrumbs, and action buttons.
 */
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
  return (
    <>
      {/* Breadcrumbs + actions bar */}
      {(breadcrumbs || actions || favorite) && (
        <nav className="mb-3 flex flex-col gap-3 sm:mb-2 sm:flex-row sm:items-center sm:justify-between" data-testid="breadcrumbs">
          {breadcrumbs ? (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-zinc-400 sm:text-sm">
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <span key={crumb.label} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-zinc-600">/</span>}
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
            {favorite && (
              <button
                type="button"
                onClick={favorite.onToggle}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2 transition-colors hover:border-red-600"
                aria-label={favorite.ariaLabel ?? (favorite.active ? 'Remove from watchlist' : 'Add to watchlist')}
              >
                <Heart className={`h-4 w-4 transition-colors ${favorite.active ? 'fill-red-500 text-red-500' : 'text-zinc-400'}`} />
              </button>
            )}
          </div>
        </nav>
      )}

      {/* Hero section */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6">
        {/* Decorative gradient stripe */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

        <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">
          {accentLabel}
        </span>

        <div className="mt-1 flex flex-wrap items-baseline gap-2.5 sm:gap-3">
          <h1 className="font-display text-3xl font-bold uppercase leading-none tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          {badge && (
            <span className="rounded-md bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-zinc-400 sm:text-sm">
              {badge}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">{subtitle}</p>
        )}

        {children && <div className="mt-5">{children}</div>}
      </section>
    </>
  );
}
