import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  /** data-testid attribute */
  testId?: string;
};

/**
 * Reusable section card with consistent border + background styling.
 * Premium glass-card aesthetic.
 */
export default function SectionCard({ children, className = '', testId }: Props) {
  return (
    <section
      data-testid={testId}
      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 ${className}`.trim()}
    >
      {children}
    </section>
  );
}
