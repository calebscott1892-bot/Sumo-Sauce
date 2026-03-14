import { Link } from 'react-router-dom';
import PageMeta from '@/components/ui/PageMeta';
import { bashoDisplayName, latestBashoId } from '@/utils/basho';

export default function NotFoundPage() {
  const latestId = latestBashoId();

  return (
    <div data-testid="not-found" className="flex min-h-[60vh] items-center justify-center bg-[#0a0a0a] p-6">
      <PageMeta
        title="SumoWatch — Page Not Found"
        description="The page you requested does not exist."
      />
      <section className="w-full max-w-md rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
        <div className="font-display text-6xl font-bold text-red-500">404</div>
        <h1 className="mt-3 font-display text-2xl font-bold uppercase tracking-tight text-white">Page Not Found</h1>
        <p className="mt-2 text-sm text-zinc-500">
          The page you requested does not exist.
        </p>

        <nav className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          <Link className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:text-white" to="/">
            ← Home
          </Link>
          <Link className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:text-white" to="/rikishi">
            Rikishi
          </Link>
          <Link className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:text-white" to="/basho">
            Tournaments
          </Link>
          <Link className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:text-white" to="/search">
            Search
          </Link>
          {latestId ? (
            <Link
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:text-white"
              to={`/basho/${encodeURIComponent(latestId)}`}
            >
              {bashoDisplayName(latestId)}
            </Link>
          ) : null}
        </nav>
      </section>
    </div>
  );
}
