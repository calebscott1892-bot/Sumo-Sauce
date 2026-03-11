import { Link } from 'react-router-dom';

const YEAR_RANGE = '2000–present';
const VERSION = '1.0.0';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <Link to="/" className="text-lg font-bold text-white hover:text-red-400 transition-colors">
              SumoWatch
            </Link>
            <p className="mt-2 text-xs text-zinc-500">
              Professional sumo statistics and analysis.
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              v{VERSION}
            </p>
          </div>

          {/* Data */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">Data</h3>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500">
              <li>Coverage: {YEAR_RANGE}</li>
              <li>
                Source:{' '}
                <a
                  href="https://sumodb.sumogames.de/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  SumoDB
                </a>
              </li>
              <li>Updated per basho</li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">Links</h3>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500">
              <li>
                <Link to="/" className="hover:text-zinc-300 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-zinc-300 transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-zinc-300 transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-800 pt-4 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} SumoWatch. All data sourced from{' '}
          <a
            href="https://sumodb.sumogames.de/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-zinc-400"
          >
            SumoDB
          </a>
          .
        </div>
      </div>
    </footer>
  );
}
