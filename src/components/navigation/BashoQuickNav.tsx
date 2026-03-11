import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import {
  recentBashoIds,
  bashoTournamentName,
  bashoLabel,
  divisionLabel,
  parseBashoId,
} from '@/utils/basho';

const DIVISIONS = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'] as const;
const BASHO_RE = /^\d{6}$/;

/**
 * Quick-nav card for the home page.
 * Shows recent basho links and a direct-jump form.
 */
export default function BashoQuickNav() {
  const navigate = useNavigate();

  const [jumpBasho, setJumpBasho] = useState('');
  const [jumpDivision, setJumpDivision] = useState<string>('makuuchi');
  const [jumpError, setJumpError] = useState('');

  const recentIds = useMemo(() => recentBashoIds(8), []);

  const handleJump = () => {
    const id = jumpBasho.trim();
    if (!BASHO_RE.test(id) || !parseBashoId(id)) {
      setJumpError('Enter a valid YYYYMM basho (e.g. 202401).');
      return;
    }
    setJumpError('');
    navigate(`/basho/${encodeURIComponent(id)}/${encodeURIComponent(jumpDivision)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJump();
  };

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 md:col-span-2 xl:col-span-3">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-white">Browse basho</h2>
      </div>

      {/* Recent basho grid */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Recent tournaments
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {recentIds.map((id) => {
            const tournament = bashoTournamentName(id);
            const parsed = parseBashoId(id);
            return (
              <Link
                key={id}
                to={`/basho/${id}`}
                className="group flex flex-col rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 transition-colors hover:border-red-600 hover:bg-red-950/20"
                data-testid={`quick-basho-${id}`}
              >
                <span className="text-sm font-semibold text-zinc-200 group-hover:text-white">
                  {tournament} {parsed?.year}
                </span>
                <span className="text-xs text-zinc-500 group-hover:text-zinc-400">{id}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Direct jump form */}
      <div className="border-t border-zinc-800 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Jump to any basho
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="quick-basho-input" className="mb-1 block text-xs text-zinc-400">
              Basho (YYYYMM)
            </label>
            <input
              id="quick-basho-input"
              data-testid="quick-basho-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={jumpBasho}
              onChange={(e) => {
                setJumpBasho(e.target.value);
                setJumpError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="200301"
              className="w-28 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="quick-basho-division" className="mb-1 block text-xs text-zinc-400">
              Division
            </label>
            <select
              id="quick-basho-division"
              data-testid="quick-basho-division"
              value={jumpDivision}
              onChange={(e) => setJumpDivision(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
            >
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {divisionLabel(d)}
                </option>
              ))}
            </select>
          </div>
          <button
            data-testid="quick-basho-go"
            type="button"
            onClick={handleJump}
            className="flex items-center gap-1 rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-500 focus:outline-none"
          >
            Go <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {jumpError && (
          <p className="mt-2 text-xs text-red-400" role="alert">
            {jumpError}
          </p>
        )}
      </div>
    </article>
  );
}
