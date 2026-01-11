import React, { useState } from 'react';
import { format } from 'date-fns';
import { Swords, Trophy, Clock, Video, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function MatchHistoryTable({ matches, onSelectMatch }) {
  const [filterDivision, setFilterDivision] = useState('all');
  const [filterDay, setFilterDay] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
        <Swords className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <p className="text-zinc-500">No match history available</p>
      </div>
    );
  }

  // Filter matches
  const filteredMatches = matches.filter(match => {
    if (filterDivision !== 'all' && match.division !== filterDivision) return false;
    if (filterDay !== 'all' && match.day !== parseInt(filterDay)) return false;
    return true;
  });

  // Sort matches
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    switch (sortBy) {
      case 'date_desc':
        return new Date(b.match_date) - new Date(a.match_date);
      case 'date_asc':
        return new Date(a.match_date) - new Date(b.match_date);
      case 'day':
        return a.day - b.day;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all" className="text-white">All Divisions</SelectItem>
            <SelectItem value="Makuuchi" className="text-white">Makuuchi</SelectItem>
            <SelectItem value="Juryo" className="text-white">Juryo</SelectItem>
            <SelectItem value="Makushita" className="text-white">Makushita</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterDay} onValueChange={setFilterDay}>
          <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all" className="text-white">All Days</SelectItem>
            {[...Array(15)].map((_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)} className="text-white">
                Day {i + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="date_desc" className="text-white">Newest First</SelectItem>
            <SelectItem value="date_asc" className="text-white">Oldest First</SelectItem>
            <SelectItem value="day" className="text-white">By Day</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto text-sm text-zinc-500">
          {sortedMatches.length} matches
        </div>
      </div>

      {/* Match Cards */}
      <div className="space-y-3">
        {sortedMatches.map((match, idx) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={cn(
              "bg-zinc-900 border rounded-lg p-4 hover:bg-zinc-800 transition-colors cursor-pointer",
              match.is_upset ? "border-red-700" : "border-zinc-800"
            )}
            onClick={() => onSelectMatch && onSelectMatch(match)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-900/30 border border-blue-700 rounded px-2 py-1">
                  <span className="text-xs font-black text-blue-400">DAY {match.day}</span>
                </div>
                <div className="text-sm text-zinc-500">
                  {match.match_date && format(new Date(match.match_date), 'MMM d, yyyy')}
                  {match.match_time && <span className="ml-2">{match.match_time}</span>}
                </div>
                <div className="text-xs text-zinc-600">{match.division}</div>
                {match.is_upset && (
                  <div className="flex items-center gap-1 text-red-400 text-xs font-bold">
                    <AlertCircle className="w-3 h-3" />
                    UPSET
                  </div>
                )}
              </div>
              {match.video_url && (
                <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
                  <Video className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Match Details */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              {/* Wrestler 1 */}
              <div className={cn(
                "text-right",
                match.winner_id === match.wrestler1_id && "font-bold text-green-400"
              )}>
                <div className="text-lg">{match.wrestler1_name}</div>
                <div className="text-xs text-zinc-500">{match.wrestler1_rank}</div>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center">
                <Swords className="w-5 h-5 text-zinc-600" />
                {match.winner_id && (
                  <Trophy className="w-4 h-4 text-amber-400 mt-1" />
                )}
              </div>

              {/* Wrestler 2 */}
              <div className={cn(
                "text-left",
                match.winner_id === match.wrestler2_id && "font-bold text-green-400"
              )}>
                <div className="text-lg">{match.wrestler2_name}</div>
                <div className="text-xs text-zinc-500">{match.wrestler2_rank}</div>
              </div>
            </div>

            {/* Result Details */}
            {match.winner_name && (
              <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-sm">
                <div className="text-zinc-400">
                  <span className="text-white font-bold">{match.winner_name}</span> wins
                  {match.kimarite && <span className="ml-2">by {match.kimarite}</span>}
                </div>
                {match.match_duration_seconds && (
                  <div className="flex items-center gap-1 text-zinc-500">
                    <Clock className="w-3 h-3" />
                    <span>{match.match_duration_seconds}s</span>
                  </div>
                )}
              </div>
            )}

            {match.notes && (
              <div className="mt-2 text-xs text-zinc-600 italic">
                {match.notes}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}