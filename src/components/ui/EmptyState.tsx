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
    <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-12 text-center">
      <SearchX className="mb-3 h-10 w-10 text-zinc-600" />
      <p className="text-sm font-medium text-zinc-300">{message}</p>
      {description && (
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-md bg-zinc-800 px-4 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            Reset filters
          </button>
        )}
        {suggestions?.map(([label, path]) => (
          <Link
            key={path}
            to={path}
            className="text-sm text-red-400 transition-colors hover:text-red-300"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
