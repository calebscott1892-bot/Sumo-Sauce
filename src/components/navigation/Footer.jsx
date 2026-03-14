import { Link } from 'react-router-dom';

const YEAR_RANGE = '2000–present';
const VERSION = '1.0.0';

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a0a0a]">
      {/* Red accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-red-600/60 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <Link to="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
              <img src="/logo-64.png" alt="SumoWatch" className="h-10 w-10 drop-shadow-lg" />
              <span className="font-display text-xl font-bold uppercase tracking-tight text-white">
                SumoWatch
              </span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              Professional sumo browsing and analytics backed by a structured wrestler trust layer.
            </p>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-zinc-700">
              v{VERSION}
            </p>
          </div>

          {/* Data */}
          <div>
            <h3 className="font-display text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">Data Coverage</h3>
            <ul className="mt-3 space-y-2 text-xs text-zinc-500">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-red-500" />
                Coverage derived from the current verified profile dataset
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-red-500" />
                Source model: JSA profiles, SumoDB, and corroborating references
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-red-500" />
                Official images shown only when image verification is complete
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-red-500" />
                Verification depth varies by profile
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-display text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">Explore</h3>
            <ul className="mt-3 space-y-2 text-xs text-zinc-500">
              <li>
                <Link to="/" className="transition-colors hover:text-zinc-300">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="transition-colors hover:text-zinc-300">
                  Banzuke Rankings
                </Link>
              </li>
              <li>
                <Link to="/basho" className="transition-colors hover:text-zinc-300">
                  Tournaments
                </Link>
              </li>
              <li>
                <Link to="/rikishi" className="transition-colors hover:text-zinc-300">
                  Rikishi Directory
                </Link>
              </li>
              <li>
                <Link to="/stables" className="transition-colors hover:text-zinc-300">
                  Stables
                </Link>
              </li>
              <li>
                <Link to="/search" className="transition-colors hover:text-zinc-300">
                  Search
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-5 text-center text-[11px] text-zinc-600">
          © {new Date().getFullYear()} SumoWatch. Source attribution may include{' '}
          <a
            href="https://sumodb.sumogames.de/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 transition-colors hover:text-zinc-400"
          >
            SumoDB
          </a>
          , JSA profile data, and other corroborating references where published.
        </div>
      </div>
    </footer>
  );
}
