import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div data-testid="not-found" className="mx-auto max-w-6xl p-6 text-zinc-200">
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
            <Link className="text-red-400 hover:text-red-300" to="/rikishi/rks_0001">
              Example rikishi profile
            </Link>
          </div>
          <div>
            <Link className="text-red-400 hover:text-red-300" to="/basho/202401/makuuchi">
              Example basho standings
            </Link>
          </div>
        </nav>
      </section>
    </div>
  );
}
