import { Link } from 'react-router-dom';
import PageMeta from '@/components/ui/PageMeta';

export default function NotFoundPage() {
  return (
    <div data-testid="not-found" className="mx-auto max-w-6xl p-6 text-zinc-200">
      <PageMeta
        title="SumoWatch — Page Not Found"
        description="The page you requested does not exist."
      />
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-2xl font-bold text-white">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-400">
          The page you requested does not exist.
        </p>

        <nav className="mt-6 space-y-2 text-sm">
          <div>
            <Link className="text-red-400 hover:text-red-300" to="/">
              ← Home
            </Link>
          </div>
          <div>
            <Link className="text-red-400 hover:text-red-300" to="/rikishi">
              Browse rikishi directory
            </Link>
          </div>
          <div>
            <Link className="text-red-400 hover:text-red-300" to="/basho">
              Browse basho history
            </Link>
          </div>
          <div>
            <Link className="text-red-400 hover:text-red-300" to="/analytics">
              View analytics
            </Link>
          </div>
        </nav>
      </section>
    </div>
  );
}
