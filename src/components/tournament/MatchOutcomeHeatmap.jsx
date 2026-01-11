import React from 'react';
import { Calendar } from 'lucide-react';

export default function MatchOutcomeHeatmap({ rankChanges }) {
  if (!rankChanges || rankChanges.length === 0) return null;

  // Calculate wins per day across all wrestlers
  const dailyWins = Array(15).fill(0);
  const dailyMatches = Array(15).fill(0);

  rankChanges.forEach(wrestler => {
    wrestler.daily_records?.forEach((record, idx) => {
      if (idx > 0) {
        const prevRecord = wrestler.daily_records[idx - 1];
        if (record.wins > prevRecord.wins) {
          dailyWins[record.day - 1]++;
        }
        dailyMatches[record.day - 1]++;
      }
    });
  });

  // Calculate win percentage per day
  const dailyStats = dailyWins.map((wins, idx) => ({
    day: idx + 1,
    wins,
    matches: dailyMatches[idx],
    percentage: dailyMatches[idx] > 0 ? (wins / dailyMatches[idx]) * 100 : 0
  }));

  const getColor = (percentage) => {
    if (percentage >= 60) return 'bg-green-600';
    if (percentage >= 50) return 'bg-green-700';
    if (percentage >= 40) return 'bg-yellow-700';
    if (percentage >= 30) return 'bg-orange-700';
    return 'bg-red-700';
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6">
      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-purple-400" />
        Match Outcome Heatmap
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {dailyStats.map((stat) => (
          <div
            key={stat.day}
            className={`${getColor(stat.percentage)} p-4 rounded text-center transition-all hover:scale-105`}
          >
            <div className="text-white font-black text-2xl">Day {stat.day}</div>
            <div className="text-white/80 text-sm mt-1">{stat.wins} wins</div>
            <div className="text-white/60 text-xs">{stat.percentage.toFixed(0)}% win rate</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded" />
          <span>High wins</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-700 rounded" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-700 rounded" />
          <span>Low wins</span>
        </div>
      </div>
    </div>
  );
}