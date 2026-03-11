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
      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-white">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
          )}
        </div>
        {trailing}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
