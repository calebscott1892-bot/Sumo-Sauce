import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { getDivisionStandings } from '@/pages/basho/api';
import StatBar from '@/components/compare/StatBar';
import PageMeta from '@/components/ui/PageMeta';
import ErrorCard from '@/components/ui/ErrorCard';
import EmptyState from '@/components/ui/EmptyState';
import {
  bashoDisplayName,
  bashoTournamentName,
  parseBashoId,
  divisionLabel,
} from '@/utils/basho';
import { isValidBashoId } from '@/utils/security';
import type { Division, DivisionStandingRow } from '../../shared/api/v1';

const DIVISIONS: Division[] = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-xs text-zinc-200 shadow-lg">
      <div className="font-semibold">{payload[0]?.payload?.name}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

export default function BashoComparePage() {
  const params = useParams();
  const bashoA = String(params.a || '').trim();
  const bashoB = String(params.b || '').trim();

  const validA = isValidBashoId(bashoA);
  const validB = isValidBashoId(bashoB);

  // Fetch makuuchi standings for both basho
  const queryA = useQuery({
    queryKey: ['basho-division-standings', bashoA, 'makuuchi'],
    queryFn: () => getDivisionStandings(bashoA, 'makuuchi'),
    enabled: validA,
  });

  const queryB = useQuery({
    queryKey: ['basho-division-standings', bashoB, 'makuuchi'],
    queryFn: () => getDivisionStandings(bashoB, 'makuuchi'),
    enabled: validB,
  });

  // Also fetch all divisions for wrestler counts
  const allDivQueryA = useQuery({
    queryKey: ['basho-compare-all-divs', bashoA],
    queryFn: () => Promise.all(DIVISIONS.map((d) => getDivisionStandings(bashoA, d).catch(() => []))),
    enabled: validA,
  });

  const allDivQueryB = useQuery({
    queryKey: ['basho-compare-all-divs', bashoB],
    queryFn: () => Promise.all(DIVISIONS.map((d) => getDivisionStandings(bashoB, d).catch(() => []))),
    enabled: validB,
  });

  const isLoading = queryA.isLoading || queryB.isLoading || allDivQueryA.isLoading || allDivQueryB.isLoading;

  const analysis = useMemo(() => {
    const rowsA = queryA.data ?? [];
    const rowsB = queryB.data ?? [];
    const allA = allDivQueryA.data ?? [];
    const allB = allDivQueryB.data ?? [];

    // Total wrestlers per division
    const divParticipation = DIVISIONS.map((div, i) => ({
      name: divisionLabel(div),
      [bashoA]: (allA[i] as DivisionStandingRow[] | undefined)?.length ?? 0,
      [bashoB]: (allB[i] as DivisionStandingRow[] | undefined)?.length ?? 0,
    }));

    const totalWrestlersA = allA.reduce((s, d) => s + (d?.length ?? 0), 0);
    const totalWrestlersB = allB.reduce((s, d) => s + (d?.length ?? 0), 0);

    // Total bouts (win+loss / 2)
    const boutsA = Math.round(rowsA.reduce((s, r) => s + r.wins + r.losses, 0) / 2);
    const boutsB = Math.round(rowsB.reduce((s, r) => s + r.wins + r.losses, 0) / 2);

    // Top performers (by wins, makuuchi)
    const topA = [...rowsA].sort((a, b) => b.wins - a.wins).slice(0, 5);
    const topB = [...rowsB].sort((a, b) => b.wins - a.wins).slice(0, 5);

    // Kimarite distribution
    function kimariteAgg(rows: DivisionStandingRow[]) {
      const counts = new Map<string, number>();
      for (const row of rows) {
        for (const kb of row.kimariteBreakdown) {
          counts.set(kb.kimariteId, (counts.get(kb.kimariteId) ?? 0) + kb.count);
        }
      }
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    }
    const kimA = kimariteAgg(rowsA);
    const kimB = kimariteAgg(rowsB);

    // Merged kimarite for chart
    const allKim = new Set([...kimA.map(([k]) => k), ...kimB.map(([k]) => k)]);
    const kimMapA = new Map(kimA);
    const kimMapB = new Map(kimB);
    const kimariteChart = [...allKim].slice(0, 12).map((name) => ({
      name,
      [bashoA]: kimMapA.get(name) ?? 0,
      [bashoB]: kimMapB.get(name) ?? 0,
    }));

    return {
      divParticipation,
      totalWrestlersA,
      totalWrestlersB,
      boutsA,
      boutsB,
      topA,
      topB,
      kimariteChart,
    };
  }, [queryA.data, queryB.data, allDivQueryA.data, allDivQueryB.data, bashoA, bashoB]);

  if (!validA || !validB) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-zinc-200">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-2xl font-bold text-white">Invalid basho comparison</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Both basho IDs must be valid YYYYMM format (e.g. 202401).
          </p>
          <Link className="mt-4 inline-block text-red-400 hover:text-red-300" to="/basho">
            ← Browse basho
          </Link>
        </section>
      </div>
    );
  }

  if (queryA.error || queryB.error || allDivQueryA.error || allDivQueryB.error) {
    return <ErrorCard code="FETCH_ERROR" message="Failed to load data. Please try again." backTo="/" backLabel="← Home" />;
  }

  const nameA = bashoDisplayName(bashoA);
  const nameB = bashoDisplayName(bashoB);
  const shortA = bashoTournamentName(bashoA) + ' ' + (parseBashoId(bashoA)?.year ?? '');
  const shortB = bashoTournamentName(bashoB) + ' ' + (parseBashoId(bashoB)?.year ?? '');

  return (
    <div data-testid="basho-compare-page" className="mx-auto max-w-6xl space-y-6 p-6 text-zinc-200">
      <PageMeta
        title={`SumoWatch — ${shortA} vs ${shortB}`}
        description={`Compare ${nameA} and ${nameB} — wrestler counts, bouts, top performers, and kimarite distribution.`}
      />

      {/* Breadcrumbs */}
      <nav className="mb-2 flex items-center gap-1 text-sm text-zinc-400">
        <Link className="text-red-400 hover:text-red-300" to="/">Home</Link>
        <span>/</span>
        <Link className="text-red-400 hover:text-red-300" to="/basho">Basho</Link>
        <span>/</span>
        <span className="text-zinc-200">Compare</span>
      </nav>

      {/* Hero */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-3xl font-black text-white">
          {shortA} <span className="text-zinc-500">vs</span> {shortB}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">Tournament comparison across all divisions</p>
      </section>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
          ))}
        </div>
      ) : (
        <>
          {/* Overview stats */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-4 text-xl font-bold text-white">Overview</h2>
            <div className="space-y-4">
              <div>
                <div className="mb-1 text-xs text-zinc-400">Total Wrestlers</div>
                <StatBar
                  labelA={shortA}
                  valueA={analysis.totalWrestlersA}
                  labelB={shortB}
                  valueB={analysis.totalWrestlersB}
                  colorA="bg-red-500"
                  colorB="bg-blue-500"
                />
              </div>
              <div>
                <div className="mb-1 text-xs text-zinc-400">Makuuchi Bouts (est.)</div>
                <StatBar
                  labelA={shortA}
                  valueA={analysis.boutsA}
                  labelB={shortB}
                  valueB={analysis.boutsB}
                  colorA="bg-red-500"
                  colorB="bg-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Division participation chart */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-4 text-xl font-bold text-white">Division Participation</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.divParticipation} margin={{ top: 8, right: 20, left: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="name" stroke="#71717a" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis stroke="#71717a" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-xs text-zinc-300">{value}</span>
                    )}
                  />
                  <Bar dataKey={bashoA} name={shortA} fill="#ef4444" radius={[4, 4, 0, 0]} animationDuration={600} />
                  <Bar dataKey={bashoB} name={shortB} fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Top performers */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-4 text-xl font-bold text-white">Top Performers (Makuuchi)</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-red-400">{shortA}</h3>
                <div className="space-y-1">
                  {analysis.topA.map((row, idx) => (
                    <Link
                      key={row.rikishiId}
                      to={`/rikishi/${encodeURIComponent(row.rikishiId)}`}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 transition-colors hover:border-red-700"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">#{idx + 1}</span>
                        <span className="font-medium text-zinc-100">{row.shikona}</span>
                        <span className="text-xs text-zinc-500">{row.rank}</span>
                      </div>
                      <span className="text-sm text-zinc-300">{row.wins}-{row.losses}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-blue-400">{shortB}</h3>
                <div className="space-y-1">
                  {analysis.topB.map((row, idx) => (
                    <Link
                      key={row.rikishiId}
                      to={`/rikishi/${encodeURIComponent(row.rikishiId)}`}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 transition-colors hover:border-blue-700"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">#{idx + 1}</span>
                        <span className="font-medium text-zinc-100">{row.shikona}</span>
                        <span className="text-xs text-zinc-500">{row.rank}</span>
                      </div>
                      <span className="text-sm text-zinc-300">{row.wins}-{row.losses}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Kimarite distribution chart */}
          {analysis.kimariteChart.length > 0 && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="mb-4 text-xl font-bold text-white">Kimarite Distribution</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.kimariteChart} margin={{ top: 8, right: 20, left: 10, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      dataKey="name"
                      stroke="#71717a"
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke="#71717a" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Legend
                      formatter={(value: string) => (
                        <span className="text-xs text-zinc-300">{value}</span>
                      )}
                    />
                    <Bar dataKey={bashoA} name={shortA} fill="#ef4444" radius={[4, 4, 0, 0]} animationDuration={600} />
                    <Bar dataKey={bashoB} name={shortB} fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={600} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Links to individual basho */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex flex-wrap gap-4">
              <Link
                to={`/basho/${bashoA}`}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-red-400 transition-colors hover:border-red-700 hover:text-red-300"
              >
                View {shortA} →
              </Link>
              <Link
                to={`/basho/${bashoB}`}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-blue-400 transition-colors hover:border-blue-700 hover:text-blue-300"
              >
                View {shortB} →
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
