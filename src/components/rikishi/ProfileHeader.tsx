import type { CareerSummary } from '@/pages/rikishi/types';

type Props = {
  summary: CareerSummary;
};

export default function ProfileHeader({ summary }: Props) {
  return (
    <section data-testid="profile-header" className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h1 className="text-3xl font-black text-white">{summary.shikona}</h1>
      <div className="mt-1 text-sm text-zinc-400">{summary.heya || 'Unknown heya'}</div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-zinc-400">Debut basho</div>
          <div className="font-semibold text-zinc-100">{summary.debutBasho}</div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-zinc-400">Highest rank</div>
          <div className="font-semibold text-zinc-100">
            {summary.highestRank.division} {summary.highestRank.rank}
          </div>
          <div className="text-xs text-zinc-500">{summary.highestRank.bashoId}</div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-zinc-400">Career record</div>
          <div className="font-semibold text-zinc-100">
            {summary.careerRecord.totalWins}-{summary.careerRecord.totalLosses}-{summary.careerRecord.totalAbsences}
          </div>
          <div className="text-xs text-zinc-500">wins-losses-absences</div>
        </div>
      </div>
    </section>
  );
}
