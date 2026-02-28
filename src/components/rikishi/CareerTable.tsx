import { Link } from 'react-router-dom';
import type { TimelineItem } from '@/pages/rikishi/types';

type Props = {
  rows: TimelineItem[];
};

export default function CareerTable({ rows }: Props) {
  return (
    <section data-testid="career-table" className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-xl font-bold text-white">Career Timeline</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-400">
              <th className="px-2 py-2">Basho</th>
              <th className="px-2 py-2">Division</th>
              <th className="px-2 py-2">Rank</th>
              <th className="px-2 py-2">Wins</th>
              <th className="px-2 py-2">Losses</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.bashoId}-${row.division}-${row.rank}`} className="border-b border-zinc-800/70 text-zinc-200">
                <td className="px-2 py-2">
                  <Link
                    className="text-red-300 hover:text-red-200"
                    to={`/basho/${encodeURIComponent(row.bashoId)}/${encodeURIComponent(row.division)}`}
                  >
                    {row.bashoId}
                  </Link>
                </td>
                <td className="px-2 py-2">{row.division}</td>
                <td className="px-2 py-2">{row.rank}</td>
                <td className="px-2 py-2">{row.wins}</td>
                <td className="px-2 py-2">{row.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
