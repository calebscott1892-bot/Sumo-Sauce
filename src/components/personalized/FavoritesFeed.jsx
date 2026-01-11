import React from 'react';
import { motion } from 'framer-motion';
import { Star, TrendingUp, Trophy, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FavoritesFeed({ wrestlers = [], tournamentData, onSelectWrestler }) {
  if (!wrestlers || wrestlers.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 p-8 text-center">
        <Star className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
        <h3 className="text-zinc-400 font-bold uppercase text-sm tracking-wider mb-2">
          No Favorites Yet
        </h3>
        <p className="text-zinc-600 text-xs">
          Click the star icon on any wrestler to follow their matches and updates
        </p>
      </div>
    );
  }

  // Find matches involving favorites
  const favoriteMatches = [];
  if (tournamentData?.is_active && tournamentData.live_status) {
    // Today's results
    (tournamentData.live_status.today_results || []).forEach(result => {
      const favoriteInvolved = wrestlers.find(w => 
        w.shikona === result.winner || w.shikona === result.loser
      );
      if (favoriteInvolved) {
        favoriteMatches.push({
          type: 'result',
          wrestler: favoriteInvolved,
          won: favoriteInvolved.shikona === result.winner,
          opponent: favoriteInvolved.shikona === result.winner ? result.loser : result.winner,
          technique: result.technique,
          time: result.match_time
        });
      }
    });

    // Live/upcoming matches
    if (tournamentData.live_status?.current_bout) {
      const bout = tournamentData.live_status.current_bout;
      const favoriteInvolved = wrestlers.find(w => 
        w.shikona === bout.wrestler1 || w.shikona === bout.wrestler2
      );
      if (favoriteInvolved) {
        favoriteMatches.push({
          type: 'live',
          wrestler: favoriteInvolved,
          opponent: favoriteInvolved.shikona === bout.wrestler1 ? bout.wrestler2 : bout.wrestler1
        });
      }
    }

    (tournamentData.live_status.upcoming_bouts || []).forEach(bout => {
      const favoriteInvolved = wrestlers.find(w => 
        w.shikona === bout.wrestler1 || w.shikona === bout.wrestler2
      );
      if (favoriteInvolved) {
        favoriteMatches.push({
          type: 'upcoming',
          wrestler: favoriteInvolved,
          opponent: favoriteInvolved.shikona === bout.wrestler1 ? bout.wrestler2 : bout.wrestler1,
          time: bout.scheduled_time
        });
      }
    });
  }

  return (
    <div className="bg-zinc-900 border border-amber-600 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
        <h2 className="text-amber-400 font-black text-sm uppercase tracking-wider">
          Your Favorites ({wrestlers.length})
        </h2>
      </div>

      {favoriteMatches.length > 0 ? (
        <div className="space-y-3 mb-4">
          {favoriteMatches.map((match, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "border-l-4 p-3 cursor-pointer hover:bg-zinc-800 transition-all",
                match.type === 'live' ? "border-red-500 bg-red-900/20" :
                match.type === 'result' && match.won ? "border-green-500 bg-green-900/10" :
                match.type === 'result' ? "border-red-500 bg-red-900/10" :
                "border-amber-500 bg-amber-900/10"
              )}
              onClick={() => onSelectWrestler(match.wrestler)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {match.type === 'live' && (
                      <Bell className="w-3 h-3 text-red-500 animate-pulse" />
                    )}
                    <span className="text-white font-black text-sm">
                      {match.wrestler.shikona}
                    </span>
                    {match.type === 'live' && (
                      <span className="text-red-400 text-xs font-black uppercase">LIVE NOW</span>
                    )}
                  </div>
                  <div className="text-zinc-400 text-xs">
                    {match.type === 'result' && (
                      <>
                        {match.won ? '✓ Defeated' : '✗ Lost to'} {match.opponent}
                        {match.technique && ` • ${match.technique}`}
                      </>
                    )}
                    {match.type === 'live' && `vs ${match.opponent}`}
                    {match.type === 'upcoming' && `Next: vs ${match.opponent}`}
                  </div>
                </div>
                {match.time && (
                  <div className="text-zinc-500 text-xs">{match.time}</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : null}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {wrestlers.slice(0, 4).map((wrestler) => (
          <motion.div
            key={wrestler.id}
            whileHover={{ scale: 1.05 }}
            onClick={() => onSelectWrestler(wrestler)}
            className="bg-zinc-800 border border-zinc-700 p-3 cursor-pointer hover:border-amber-600 transition-all"
          >
            <div className="text-center">
              <div className="text-white font-black text-sm truncate mb-1">
                {wrestler.shikona}
              </div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-green-400 font-bold text-lg">{wrestler.wins || 0}</span>
                <span className="text-zinc-600 text-xs">-</span>
                <span className="text-red-400 font-bold text-lg">{wrestler.losses || 0}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}