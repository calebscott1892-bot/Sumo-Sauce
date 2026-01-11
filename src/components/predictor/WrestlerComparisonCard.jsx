import React from 'react';
import { Trophy, TrendingUp, Award, Weight, Ruler, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WrestlerComparisonCard({ wrestler, side, isWinner, probability }) {
  if (!wrestler) return null;

  const winRate = wrestler.career_wins && wrestler.career_losses
    ? ((wrestler.career_wins / (wrestler.career_wins + wrestler.career_losses)) * 100).toFixed(1)
    : 'N/A';

  return (
    <div className={cn(
      "flex-1 p-6 rounded-lg border-2 transition-all",
      isWinner 
        ? "bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-500"
        : "bg-zinc-900 border-zinc-700"
    )}>
      {/* Profile */}
      <div className="text-center mb-6">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
          {wrestler.image_url ? (
            <img src={wrestler.image_url} alt={wrestler.shikona} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-black text-zinc-600">{wrestler.shikona?.charAt(0)}</span>
          )}
        </div>
        <h3 className="text-2xl font-black text-white mb-1">{wrestler.shikona}</h3>
        <div className={cn(
          "text-sm font-bold uppercase tracking-wider",
          isWinner ? "text-green-400" : "text-zinc-400"
        )}>
          {wrestler.rank} {wrestler.rank_number ? `#${wrestler.rank_number}` : ''}
        </div>
        {probability && (
          <div className={cn(
            "text-4xl font-black mt-4",
            isWinner ? "text-green-400" : "text-zinc-500"
          )}>
            {probability.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-zinc-400">
            <TrendingUp className="w-4 h-4" />
            <span>Win Rate</span>
          </div>
          <span className="font-bold text-white">{winRate}%</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-zinc-400">
            <Trophy className="w-4 h-4" />
            <span>Titles</span>
          </div>
          <span className="font-bold text-white">{wrestler.tournament_titles || 0}</span>
        </div>

        {(wrestler.wins !== undefined || wrestler.losses !== undefined) && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <Award className="w-4 h-4" />
              <span>Current Form</span>
            </div>
            <span className="font-bold text-white">
              {wrestler.wins || 0}-{wrestler.losses || 0}
            </span>
          </div>
        )}

        {wrestler.weight_kg && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <Weight className="w-4 h-4" />
              <span>Weight</span>
            </div>
            <span className="font-bold text-white">{wrestler.weight_kg} kg</span>
          </div>
        )}

        {wrestler.height_cm && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <Ruler className="w-4 h-4" />
              <span>Height</span>
            </div>
            <span className="font-bold text-white">{wrestler.height_cm} cm</span>
          </div>
        )}
      </div>
    </div>
  );
}