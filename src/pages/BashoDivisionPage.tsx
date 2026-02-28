import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, getDivisionStandings } from '@/pages/basho/api';
import type { Division } from '@/pages/basho/types';

const VALID_DIVISIONS: Division[] = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];

function isDivision(value: string): value is Division {
  return VALID_DIVISIONS.includes(value as Division);
}

export default function BashoDivisionPage() {
  const params = useParams();
  const bashoId = String(params.bashoId || '').trim();
  const divisionValue = String(params.division || '').trim().toLowerCase();
  const division = isDivision(divisionValue) ? divisionValue : null;

  const standingsQuery = useQuery({
    queryKey: ['basho-division-standings', bashoId, division],
    queryFn: () => getDivisionStandings(bashoId, division as Division),
    enabled: Boolean(bashoId && division),
  });

  if (!bashoId || !division) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">Invalid basho or division.</div>
      </div>
    );
  }

  if (standingsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">Loading division standings…</div>
      </div>
    );
  }

  if (standingsQuery.error instanceof ApiError && standingsQuery.error.status === 404) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
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
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-red-800 bg-red-950/20 p-4">Failed to load division standings.</div>
      </div>
    );
  }

  const rows = standingsQuery.data;
  const maxWins = rows.reduce((max, row) => (row.wins > max ? row.wins : max), 0);

  return (
    <div data-testid="division-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
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
