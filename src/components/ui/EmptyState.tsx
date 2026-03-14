import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

type Props = {
  /** Primary message describing the empty state */
  message: string;
  /** Optional sub-message with guidance */
  description?: string;
  /** If provided, renders a "Reset filters" button */
  onReset?: () => void;
  /** Optional navigation suggestions: [label, path] tuples */
  suggestions?: Array<[string, string]>;
};

/**
 * Consistent empty-state component for searchable/filterable views.
 * Shows a message, optional reset button, and navigation suggestions.
 */
export default function EmptyState({ message, description, onReset, suggestions }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.015] px-6 py-12 text-center">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-500">
        <SearchX className="h-5 w-5" />
      </div>
      <p className="font-display text-lg font-bold tracking-tight text-white">{message}</p>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{description}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-red-600/30 hover:bg-white/[0.08] hover:text-white"
          >
            Reset filters
          </button>
        )}
        {suggestions?.map(([label, path]) => (
          <Link
            key={path}
            to={path}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-red-600/30 hover:text-white"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
