import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  /** data-testid attribute */
  testId?: string;
};

/**
 * Reusable section card with consistent border + background styling.
 * Replaces repeated `rounded-xl border border-zinc-800 bg-zinc-900 p-5` pattern.
 */
export default function SectionCard({ children, className = '', testId }: Props) {
  return (
    <section
      data-testid={testId}
      className={`rounded-xl border border-zinc-800 bg-zinc-900 p-5 ${className}`.trim()}
    >
      {children}
    </section>
  );
}
