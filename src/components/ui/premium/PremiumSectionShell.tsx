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
      className={`rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-5 shadow-[0_18px_56px_rgba(0,0,0,0.18)] sm:p-6 lg:p-7 ${className}`.trim()}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[1.35rem] font-bold tracking-tight text-white sm:text-[1.5rem]">{title}</h2>
          {subtitle && (
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-500">{subtitle}</p>
          )}
        </div>
        {trailing ? <div className="shrink-0 self-start">{trailing}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
