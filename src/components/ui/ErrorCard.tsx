import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

type Props = {
  code?: string;
  message: string;
  backTo?: string;
  backLabel?: string;
};

/**
 * Structured error card with a consistent look across all pages.
 */
export default function ErrorCard({ code, message, backTo = '/', backLabel = '← Home' }: Props) {
  return (
    <div className="mx-auto max-w-6xl p-6 text-zinc-200">
      <div className="rounded-xl border border-red-800 bg-red-950/20 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            {code && <div className="text-sm font-semibold text-red-300">{code}</div>}
            <div className="mt-1 text-sm text-zinc-300">{message}</div>
            <Link className="mt-3 inline-block text-sm text-red-400 hover:text-red-300" to={backTo}>
              {backLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
