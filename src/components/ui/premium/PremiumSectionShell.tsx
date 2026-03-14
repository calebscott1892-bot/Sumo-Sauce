import type { ReactNode } from 'react';

type Props = {
  /** Section heading */
  title: string;
  /** Optional subtext below heading */
  subtitle?: string;
  /** Optional right-side element (link, badge, etc.) */
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
};

/**
 * Premium section shell — consistent wrapper for content blocks.
 * Glass-card border, properly-spaced heading, and body area.
 */
export default function PremiumSectionShell({
  title,
  subtitle,
  trailing,
  children,
  className = '',
  testId,
}: Props) {
  return (
    <section
      data-testid={testId}
      className={`rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.015] p-5 sm:p-6 ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-white">{title}</h2>
          {subtitle && (
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-500">{subtitle}</p>
          )}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
