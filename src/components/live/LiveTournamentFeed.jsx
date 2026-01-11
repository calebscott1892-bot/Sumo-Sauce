import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, TrendingUp, Clock, Swords, Trophy, MapPin, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function LiveTournamentFeed({ tournamentData, loading, onRefresh }) {
  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-zinc-400 text-sm font-bold uppercase tracking-wider">
            Checking for live matches...
          </span>
        </div>
      </div>
    );
  }

  if (!tournamentData?.is_active) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 mb-6">
        <div className="text-center text-zinc-500 text-sm font-bold uppercase tracking-wider">
          No Active Tournament • Next Basho Coming Soon
        </div>
      </div>
    );
  }

  const { 
    tournament_name,
    current_day, 
    location, 
    live_status, 
    standings 
  } = tournamentData;
  
  const todaysResults = live_status?.today_results || [];
  const upcomingBouts = live_status?.upcoming_bouts || [];

  return (
    <div className="space-y-4 mb-6">
      {/* Live Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-900 via-red-700 to-red-900 border-b-4 border-red-500 p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-300 text-xs font-black tracking-[0.2em] uppercase">
                LIVE TOURNAMENT
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-white">
            {onRefresh && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRefresh}
                className="text-white hover:text-red-300 hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-bold">{location}</span>
            </div>
            <div className="bg-white/20 px-3 py-1">
              <span className="text-xs font-black">DAY {current_day}/15</span>
            </div>
          </div>
        </div>
        <h2 className="text-2xl font-black text-white mt-2">{tournament_name}</h2>
      </motion.div>

      {/* Live Matches */}
      {live_status?.current_bout && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-900/20 border-2 border-red-600 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-red-500 animate-pulse" />
            <span className="text-red-400 text-sm font-black uppercase tracking-wider">
              IN THE RING NOW
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <div className="text-2xl font-black text-white">
                {live_status.current_bout.wrestler1}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Swords className="w-8 h-8 text-red-500" />
            </div>
            <div className="flex-1 text-center">
              <div className="text-2xl font-black text-white">
                {live_status.current_bout.wrestler2}
              </div>
            </div>
          </div>
          <div className="text-center mt-3 text-zinc-400 text-xs font-bold uppercase">
            {live_status.current_bout.division}
          </div>
        </motion.div>
      )}

      {/* Upcoming Matches */}
      {upcomingBouts.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-amber-400 text-xs font-black uppercase tracking-wider">
              Next Bouts
            </span>
          </div>
          <div className="space-y-2">
            {upcomingBouts.slice(0, 3).map((bout, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm border-l-2 border-zinc-700 pl-3 py-1">
                <span className="text-white font-bold">{bout.wrestler1}</span>
                <span className="text-zinc-600 font-bold">VS</span>
                <span className="text-white font-bold">{bout.wrestler2}</span>
                {bout.scheduled_time && (
                  <span className="text-zinc-500 text-xs">{bout.scheduled_time}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Results */}
      {todaysResults.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-green-400 text-xs font-black uppercase tracking-wider">
              Today's Results ({todaysResults.length})
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {todaysResults.map((result, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border-l-2 border-green-600 bg-zinc-800/50 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-white font-black text-sm">{result.winner}</div>
                    <div className="text-zinc-500 text-xs mt-0.5">
                      def. {result.loser}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 text-xs font-bold uppercase">
                      {result.technique}
                    </div>
                    {result.match_time && (
                      <div className="text-zinc-600 text-xs">{result.match_time}</div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Tournament Standings */}
      {standings?.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-amber-400 text-xs font-black uppercase tracking-wider">
              Current Standings (Top 10)
            </span>
          </div>
          <div className="space-y-1">
            {standings.slice(0, 10).map((wrestler, idx) => (
              <div key={idx} className={cn(
                "flex items-center justify-between p-2 border-l-2",
                idx === 0 ? "border-amber-500 bg-amber-900/10" : "border-zinc-700"
              )}>
                <div className="flex items-center gap-3">
                  <span className="text-white font-black text-lg w-6">{idx + 1}</span>
                  <div>
                    <div className="text-white font-bold text-sm">{wrestler.wrestler_name}</div>
                    <div className="text-zinc-500 text-xs uppercase">{wrestler.rank}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-green-900/30 border border-green-700 px-2 py-1">
                    <span className="text-green-400 font-black text-sm">{wrestler.wins}</span>
                  </div>
                  <span className="text-zinc-600 font-black">-</span>
                  <div className="bg-red-900/30 border border-red-700 px-2 py-1">
                    <span className="text-red-400 font-black text-sm">{wrestler.losses}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}