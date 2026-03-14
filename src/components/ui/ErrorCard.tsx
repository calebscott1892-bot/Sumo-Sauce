import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

type Props = {
  code?: string;
  message: string;
  backTo?: string;
  backLabel?: string;
  onRetry?: () => void;
  retryLabel?: string;
  showRetry?: boolean;
};

/**
 * Structured error card with a consistent premium look across all pages.
 */
export default function ErrorCard({
  code,
  message,
  backTo = '/',
  backLabel = '← Home',
  onRetry,
  retryLabel = 'Retry',
  showRetry,
}: Props) {
  const canRetry = showRetry ?? code === 'FETCH_ERROR';

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-6xl p-6 text-zinc-200">
      <div className="rounded-xl border border-red-800/30 bg-red-950/15 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            {code && <div className="text-sm font-semibold text-red-300">{code}</div>}
            <div className="mt-1 text-sm text-zinc-400">{message}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {canRetry ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
                >
                  {retryLabel}
                </button>
              ) : null}
              <Link
                className="inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
                to={backTo}
              >
                {backLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
