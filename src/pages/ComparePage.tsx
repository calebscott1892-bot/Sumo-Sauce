import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, getRikishiComparison } from '@/pages/compare/api';

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function heyaLabel(heya: string | null): string {
  return heya && heya.trim() ? heya : 'Unknown heya';
}

export default function ComparePage() {
  const params = useParams();
  const a = String(params.a || '').trim();
  const b = String(params.b || '').trim();

  const comparisonQuery = useQuery({
    queryKey: ['rikishi-compare', a, b],
    queryFn: () => getRikishiComparison(a, b),
    enabled: Boolean(a && b),
  });

  if (!a || !b) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">Invalid comparison ids.</div>
      </div>
    );
  }

  if (comparisonQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">Loading comparison…</div>
      </div>
    );
  }

  if (comparisonQuery.error instanceof ApiError && comparisonQuery.error.status === 404) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          Rikishi not found.
          <div className="mt-2">
            <Link className="text-red-400 hover:text-red-300" to="/leaderboard">
              Back to leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (comparisonQuery.error || !comparisonQuery.data) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <div className="rounded-xl border border-red-800 bg-red-950/20 p-4">Failed to load comparison data.</div>
      </div>
    );
  }

  const model = comparisonQuery.data;
  const topWinA = model.kimarite.a.winKimarite.slice(0, 5);
  const topWinB = model.kimarite.b.winKimarite.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h1 className="text-2xl font-bold text-white">{model.rikishiA.shikona} vs {model.rikishiB.shikona}</h1>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 text-sm text-zinc-300">
          <div>
            <div className="font-semibold text-zinc-100">{model.rikishiA.shikona}</div>
            <div>{model.rikishiA.rikishiId}</div>
            <div>{heyaLabel(model.rikishiA.heya)}</div>
          </div>
          <div>
            <div className="font-semibold text-zinc-100">{model.rikishiB.shikona}</div>
            <div>{model.rikishiB.rikishiId}</div>
            <div>{heyaLabel(model.rikishiB.heya)}</div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-bold text-white">Head-to-Head</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-zinc-400">Total</div>
            <div className="font-semibold text-zinc-100">{model.headToHead.totalMatches}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-zinc-400">{model.rikishiA.shikona} wins</div>
            <div className="font-semibold text-zinc-100">{model.headToHead.rikishiAWins}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-zinc-400">{model.rikishiB.shikona} wins</div>
            <div className="font-semibold text-zinc-100">{model.headToHead.rikishiBWins}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-zinc-400">Common basho</div>
            <div className="font-semibold text-zinc-100">{model.commonBashoCount}</div>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
          <div className="text-zinc-400">Last match</div>
          {model.lastMatch ? (
            <div className="text-zinc-200">
              <Link
                className="text-red-300 hover:text-red-200"
                to={`/basho/${encodeURIComponent(model.lastMatch.bashoId)}/${encodeURIComponent(model.lastMatch.division)}`}
              >
                {model.lastMatch.bashoId}
              </Link>
              {' / '}
              {model.lastMatch.division}
              {' / day '}
              {model.lastMatch.day}
              {' / winner '}
              {model.lastMatch.winnerRikishiId || 'none'}
            </div>
          ) : (
            <div className="text-zinc-400">No matches yet.</div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-bold text-white">Recent Form (Last 6)</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">{model.rikishiA.shikona}</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="px-2 py-1 text-left">Basho</th>
                  <th className="px-2 py-1 text-left">Div</th>
                  <th className="px-2 py-1 text-left">Rank</th>
                  <th className="px-2 py-1 text-left">W-L</th>
                </tr>
              </thead>
              <tbody>
                {model.recentForm.a.map((row) => (
                  <tr key={`${row.bashoId}-${row.division}-${row.rank}-${row.wins}-${row.losses}`} className="border-b border-zinc-900">
                    <td className="px-2 py-1">{row.bashoId}</td>
                    <td className="px-2 py-1">{row.division}</td>
                    <td className="px-2 py-1">{row.rank}</td>
                    <td className="px-2 py-1">{row.wins}-{row.losses}</td>
                  </tr>
                ))}
                {!model.recentForm.a.length && (
                  <tr>
                    <td colSpan={4} className="px-2 py-2 text-zinc-500">No timeline rows.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">{model.rikishiB.shikona}</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="px-2 py-1 text-left">Basho</th>
                  <th className="px-2 py-1 text-left">Div</th>
                  <th className="px-2 py-1 text-left">Rank</th>
                  <th className="px-2 py-1 text-left">W-L</th>
                </tr>
              </thead>
              <tbody>
                {model.recentForm.b.map((row) => (
                  <tr key={`${row.bashoId}-${row.division}-${row.rank}-${row.wins}-${row.losses}`} className="border-b border-zinc-900">
                    <td className="px-2 py-1">{row.bashoId}</td>
                    <td className="px-2 py-1">{row.division}</td>
                    <td className="px-2 py-1">{row.rank}</td>
                    <td className="px-2 py-1">{row.wins}-{row.losses}</td>
                  </tr>
                ))}
                {!model.recentForm.b.length && (
                  <tr>
                    <td colSpan={4} className="px-2 py-2 text-zinc-500">No timeline rows.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-bold text-white">Top Win Kimarite (Top 5)</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">{model.rikishiA.shikona}</h3>
            <ul className="space-y-1 text-sm">
              {topWinA.map((item) => (
                <li key={`${item.kimariteId}-${item.count}`} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 flex items-center justify-between">
                  <span>{item.kimariteId}</span>
                  <span className="text-zinc-400">{formatPct(item.percentage)}</span>
                </li>
              ))}
              {!topWinA.length && <li className="text-zinc-500">No kimarite data.</li>}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">{model.rikishiB.shikona}</h3>
            <ul className="space-y-1 text-sm">
              {topWinB.map((item) => (
                <li key={`${item.kimariteId}-${item.count}`} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 flex items-center justify-between">
                  <span>{item.kimariteId}</span>
                  <span className="text-zinc-400">{formatPct(item.percentage)}</span>
                </li>
              ))}
              {!topWinB.length && <li className="text-zinc-500">No kimarite data.</li>}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
