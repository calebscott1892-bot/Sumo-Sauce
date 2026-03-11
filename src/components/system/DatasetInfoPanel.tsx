import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Calendar, Users, Clock } from 'lucide-react';
import { getRikishiDirectory } from '@/pages/rikishi/api';
import { recentBashoIds } from '@/utils/basho';

/**
 * Shows dataset coverage information on the homepage.
 * Purely derived from cached client-side data — no extra API calls.
 */
export default function DatasetInfoPanel() {
  const { data: directory = [], isLoading } = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000,
  });

  const recentIds = useMemo(() => recentBashoIds(1), []);
  const latestBasho = recentIds[0] ?? '—';

  const buildTimestamp = useMemo(() => {
    // Use build time or current date as last-known build
    return new Date().toISOString().slice(0, 10);
  }, []);

  if (isLoading) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="h-20 animate-pulse rounded-lg bg-zinc-800" />
      </section>
    );
  }

  const items = [
    { icon: Calendar, label: 'Coverage', value: '2000 – present', sub: '25+ years of sumo data' },
    { icon: Users, label: 'Rikishi', value: directory.length.toLocaleString(), sub: 'total in dataset' },
    { icon: Database, label: 'Pipeline', value: 'v1 (locked)', sub: 'stable ingestion' },
    { icon: Clock, label: 'Last build', value: buildTimestamp, sub: `latest basho: ${latestBasho}` },
  ];

  return (
    <section data-testid="dataset-info-panel" className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
        Dataset Info
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <item.icon className="h-3.5 w-3.5" />
              <span className="text-xs">{item.label}</span>
            </div>
            <div className="mt-1 font-semibold text-zinc-100">{item.value}</div>
            <div className="text-xs text-zinc-500">{item.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
