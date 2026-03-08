import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, getDivisionStandings } from '@/pages/basho/api';
import type { Division } from '@/pages/basho/types';

const VALID_DIVISIONS: Division[] = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];
const BASHO_RE = /^\d{6}$/;

function isDivision(value: string): value is Division {
  return VALID_DIVISIONS.includes(value as Division);
}

export default function BashoDivisionPage() {
  const params = useParams();
  const navigate = useNavigate();

  const bashoId = String(params.bashoId || '').trim();
  const divisionValue = String(params.division || '').trim().toLowerCase();
  const division = isDivision(divisionValue) ? divisionValue : null;

  // --- draft state for the picker, initialised from route params ---
  const [draftBasho, setDraftBasho] = useState(bashoId);
  const [draftDivision, setDraftDivision] = useState<Division>(division ?? 'makuuchi');
  const [bashoError, setBashoError] = useState('');

  // Sync drafts when route params change (e.g. external navigation)
  useEffect(() => {
    setDraftBasho(bashoId);
    setBashoError('');
  }, [bashoId]);

  useEffect(() => {
    if (division) setDraftDivision(division);
  }, [division]);

  const navigateToStandings = useCallback(
    (b: string, d: Division) => {
      if (!BASHO_RE.test(b)) {
        setBashoError('Basho must be a 6-digit YYYYMM value.');
        return;
      }
      setBashoError('');
      navigate(`/basho/${encodeURIComponent(b)}/${encodeURIComponent(d)}`);
    },
    [navigate],
  );

  const handleGo = () => navigateToStandings(draftBasho, draftDivision);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') navigateToStandings(draftBasho, draftDivision);
  };

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Division;
    setDraftDivision(next);
    // Navigate immediately when basho is valid
    if (BASHO_RE.test(draftBasho)) {
      navigateToStandings(draftBasho, next);
    }
  };

  const standingsQuery = useQuery({
    queryKey: ['basho-division-standings', bashoId, division],
    queryFn: () => getDivisionStandings(bashoId, division as Division),
    enabled: Boolean(bashoId && division),
  });

  // --- Picker controls (always rendered) ---
  const picker = (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="basho-input" className="mb-1 block text-xs text-zinc-400">
            Basho (YYYYMM)
          </label>
          <input
            id="basho-input"
            data-testid="basho-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={draftBasho}
            onChange={(e) => {
              setDraftBasho(e.target.value);
              setBashoError('');
            }}
            onKeyDown={handleKeyDown}
            className="w-28 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            placeholder="202401"
          />
        </div>

        <div>
          <label htmlFor="division-select" className="mb-1 block text-xs text-zinc-400">
            Division
          </label>
          <select
            id="division-select"
            data-testid="division-select"
            value={draftDivision}
            onChange={handleDivisionChange}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
          >
            {VALID_DIVISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <button
          data-testid="basho-go"
          type="button"
          onClick={handleGo}
          className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-500 focus:outline-none"
        >
          Go
        </button>
      </div>

      {bashoError && (
        <p className="mt-2 text-xs text-red-400" role="alert">
          {bashoError}
        </p>
      )}
    </section>
  );

  // --- Early returns for missing/loading/error states ---
  if (!bashoId || !division) {
    return (
      <div data-testid="division-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
        {picker}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          Select a basho and division above.
        </div>
      </div>
    );
  }

  if (standingsQuery.isLoading) {
    return (
      <div data-testid="division-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
        {picker}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">Loading division standings…</div>
      </div>
    );
  }

  if (standingsQuery.error instanceof ApiError && standingsQuery.error.status === 404) {
    return (
      <div data-testid="division-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
        {picker}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          Basho or division not found.
          <div className="mt-2">
            <Link className="text-red-400 hover:text-red-300" to="/leaderboard">
              Back to leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (standingsQuery.error || !standingsQuery.data) {
    const err = standingsQuery.error;
    const errCode = err instanceof ApiError ? err.code : 'UNKNOWN';
    const errMsg = err instanceof ApiError ? err.message : 'An unexpected error occurred.';
    return (
      <div data-testid="division-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
        {picker}
        <div className="rounded-xl border border-red-800 bg-red-950/20 p-4">
          <div className="font-semibold text-red-300">{errCode}</div>
          <div className="mt-1 text-sm text-zinc-300">{errMsg}</div>
          <div className="mt-3">
            <Link className="text-red-400 hover:text-red-300" to="/">
              ← Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const rows = standingsQuery.data;
  const maxWins = rows.reduce((max, row) => (row.wins > max ? row.wins : max), 0);

  useEffect(() => {
    if (bashoId && division) {
      document.title = `SumoWatch \u2014 ${bashoId} ${division}`;
    }
    return () => { document.title = 'SumoWatch'; };
  }, [bashoId, division]);

  return (
    <div data-testid="division-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <nav data-testid="breadcrumbs" className="mb-2 flex items-center gap-1 text-sm text-zinc-400">
        <Link className="text-red-400 hover:text-red-300" to="/">Home</Link>
        <span>/</span>
        <span>Basho</span>
        <span>/</span>
        <span>{bashoId}</span>
        <span>/</span>
        <span className="text-zinc-200">{division}</span>
      </nav>

      {picker}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h1 className="text-2xl font-bold text-white">{bashoId} {division} standings</h1>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <table data-testid="standings-table" className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-400">
              <th className="px-2 py-2">Rank</th>
              <th className="px-2 py-2">Shikona</th>
              <th className="px-2 py-2">Wins</th>
              <th className="px-2 py-2">Losses</th>
              <th className="px-2 py-2">Yusho</th>
              <th className="px-2 py-2">Kachi-koshi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isYusho = row.wins === maxWins;
              const isKachiKoshi = row.wins > row.losses;
              return (
                <tr key={row.rikishiId} className="border-b border-zinc-800/70 text-zinc-200">
                  <td className="px-2 py-2">{row.rank}</td>
                  <td className="px-2 py-2">
                    <Link className="text-red-300 hover:text-red-200" to={`/rikishi/${encodeURIComponent(row.rikishiId)}`}>
                      {row.shikona}
                    </Link>
                  </td>
                  <td className="px-2 py-2">{row.wins}</td>
                  <td className="px-2 py-2">{row.losses}</td>
                  <td className="px-2 py-2">{isYusho ? 'Y' : '-'}</td>
                  <td className="px-2 py-2">{isKachiKoshi ? 'KK' : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
